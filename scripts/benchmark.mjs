// Drives the real gateway (all 13 models, LinUCB, breaker, failover) in
// simulated mode and records every routing decision, for the README charts.
//
// It starts its own `next dev` on port 3100 with the OpenRouter and Upstash
// variables blanked, so model answers come from the built-in simulator and no
// shared state is touched. Prompt order is seeded; the simulator's own noise
// (latency, quality jitter) is not, so runs differ slightly - hence 3 runs.
//
// Usage:  node scripts/benchmark.mjs [requests=500] [runs=3]
// Output: docs/data/benchmark.json

import { spawn, execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const N = Number(process.argv[2] ?? 500);
const RUNS = Number(process.argv[3] ?? 3);
const OFFLINE_AT = Math.round(N * 0.6); // take the busiest model offline here
const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const SEEDS = Array.from({ length: RUNS }, (_, i) => 42 + i);

const PROMPTS = [
  "What's the capital of Australia?",
  "Translate 'good morning' into Spanish.",
  "List the primary colors.",
  "What is 47 * 89?",
  "Convert 30 degrees Celsius to Fahrenheit.",
  "What year did the Berlin Wall fall?",
  "Give me three names for a coffee shop.",
  "Suggest a subject line for a product launch email.",
  "Rewrite this sentence to be more concise: we are going to be having a meeting tomorrow.",
  "Draft a two-line out-of-office reply.",
  "Summarize the plot of Romeo and Juliet in two lines.",
  "Write a haiku about autumn leaves.",
  "What is the difference between TCP and UDP?",
  "Explain recursion to a beginner.",
  "Explain eventual consistency with a shopping-cart example.",
  "Explain the CAP theorem simply.",
  "Why is 0.1 + 0.2 not exactly 0.3 in floating point?",
  "Compare optimistic and pessimistic locking with an example.",
  "Outline a caching strategy for a read-heavy news site.",
  "Write a Python function to check if a string is a palindrome.",
  "Write a Python function to merge two sorted linked lists.",
  "Write a SQL query for the top 3 customers by revenue per region.",
  "Write a regular expression that matches a valid IPv4 address.",
  "Fix this loop: for (let i = 0; i <= arr.length; i++) { sum += arr[i]; }",
  "Refactor a callback-based Node function into async/await.",
  "Design the database schema for a URL shortener.",
  "Design a rate limiter for a distributed API and discuss the trade-offs.",
  "Architect a multi-region failover strategy for a Postgres cluster.",
  "Derive the time complexity of merge sort and explain the recurrence.",
  "Prove that the square root of 2 is irrational, step by step.",
  "Prove that there are infinitely many primes.",
  "Analyze the trade-offs between microservices and a modular monolith for a 10-person team.",
];

// mulberry32: tiny seeded PRNG for the prompt order.
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startServer() {
  const blank = {
    OPENROUTER_API_KEY: "",
    OPENROUTER_API_KEY_2: "",
    OPENROUTER_API_KEY_3: "",
    OPENROUTER_API_KEY_4: "",
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    UPSTASH_VECTOR_REST_URL: "",
    UPSTASH_VECTOR_REST_TOKEN: "",
  };
  const child = spawn(`npx next dev -p ${PORT}`, {
    env: { ...process.env, ...blank },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  // Keep the last lines of server output to explain a failed start.
  child.log = [];
  const keep = (d) => child.log.push(...String(d).split(/\r?\n/).filter(Boolean).slice(-20));
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  return child;
}

function stopServer(child) {
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    else child.kill("SIGTERM");
  } catch {
    /* already gone */
  }
}

async function waitReady(child) {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${BASE}/api/state`);
      if (r.ok) return (await r.json()).simulated;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  throw new Error(`server did not start:\n${child.log.slice(-20).join("\n")}`);
}

async function route(prompt, weights) {
  const res = await fetch(`${BASE}/api/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Bypass the cache so every request exercises the routing decision.
    body: JSON.stringify({ prompt, weights, skipCache: true }),
  });
  const text = await res.text();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    if (msg.type === "done") return msg.record;
  }
  throw new Error("no record");
}

async function runOnce(seed) {
  const child = startServer();
  try {
    const simulated = await waitReady(child);
    if (!simulated) throw new Error("server is not in simulated mode; refusing to spend real quota");
    const rand = rng(seed);
    const rows = [];
    let offlineModel = null;
    for (let i = 0; i < N; i++) {
      if (i === OFFLINE_AT) {
        const counts = {};
        for (const r of rows) counts[r.model] = (counts[r.model] ?? 0) + 1;
        offlineModel = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        await fetch(`${BASE}/api/provider`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId: offlineModel, offline: true }),
        });
      }
      const prompt = PROMPTS[Math.floor(rand() * PROMPTS.length)];
      const r = await route(prompt);
      rows.push({
        i,
        model: r.modelId,
        cost: r.costUsd,
        flagshipCost: r.baselineUsd,
        latencyMs: r.latencyMs,
        quality: r.quality,
        reward: r.reward,
        failed: r.failed,
      });
      if ((i + 1) % 100 === 0) process.stdout.write(`  run seed ${seed}: ${i + 1}/${N}\n`);
    }
    return { seed, offlineAt: OFFLINE_AT, offlineModel, rows };
  } finally {
    stopServer(child);
    await sleep(1500);
  }
}

// Objective presets (components/routing.ts) and the flagship-only baseline.
const PRESETS = [
  { name: "Balanced", w: { quality: 0.5, cost: 0.3, latency: 0.2 } },
  { name: "Best quality", w: { quality: 0.85, cost: 0.1, latency: 0.05 } },
  { name: "Cheapest", w: { quality: 0.15, cost: 0.75, latency: 0.1 } },
  { name: "Fastest", w: { quality: 0.2, cost: 0.2, latency: 0.6 } },
];
const PRESET_N = 300;

/** One fresh server per objective; returns averages over PRESET_N requests. */
async function runPreset(p, onlyFlagship = false) {
  const child = startServer();
  try {
    if (!(await waitReady(child))) throw new Error("not simulated");
    if (onlyFlagship) {
      const state = await (await fetch(`${BASE}/api/state`)).json();
      const best = state.fleet.reduce((a, b) => (b.avgQuality > a.avgQuality ? b : a));
      for (const f of state.fleet) {
        if (f.modelId === best.modelId) continue;
        await fetch(`${BASE}/api/provider`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId: f.modelId, offline: true }),
        });
      }
    }
    const rand = rng(42);
    let cost = 0, flagship = 0, quality = 0, latency = 0;
    for (let i = 0; i < PRESET_N; i++) {
      const r = await route(PROMPTS[Math.floor(rand() * PROMPTS.length)], p.w);
      cost += r.costUsd;
      flagship += r.baselineUsd;
      quality += r.quality;
      latency += r.latencyMs;
    }
    return {
      name: onlyFlagship ? "Always flagship" : p.name,
      weights: p.w,
      costVsFlagship: cost / flagship,
      avgQuality: quality / PRESET_N,
      avgLatencyMs: latency / PRESET_N,
    };
  } finally {
    stopServer(child);
    await sleep(1500);
  }
}

const runs = [];
for (const seed of SEEDS) {
  console.log(`run with prompt-order seed ${seed}`);
  runs.push(await runOnce(seed));
}

const presets = [];
for (const p of PRESETS) {
  console.log(`preset ${p.name}`);
  presets.push(await runPreset(p));
}
console.log("baseline: always flagship");
presets.push(await runPreset(PRESETS[0], true));

mkdirSync("docs/data", { recursive: true });
writeFileSync(
  "docs/data/benchmark.json",
  JSON.stringify(
    {
      generated: new Date().toISOString().slice(0, 10),
      mode: "simulated model responses, real routing code",
      requests: N,
      runs: RUNS,
      promptPool: PROMPTS.length,
      seeds: SEEDS,
      cacheBypassed: true,
      runsData: runs,
      presetRequests: PRESET_N,
      presetSeed: 42,
      presets,
    },
    null,
    1,
  ),
);
console.log("wrote docs/data/benchmark.json");
