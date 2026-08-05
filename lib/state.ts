import { MODELS } from "./models";
import { store, armStats } from "./store";
import { warmTrain, IS_SIMULATED } from "./engine";
import { circuitState, breakerFails } from "./circuit";
import { COLD_START_ROUTED } from "./session";
import type { FleetStat, GatewayState, Metrics } from "./types";

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

export function computeMetrics(): Metrics {
  const t = store().totals;
  const avgLatency = t.latencies.length
    ? t.latencies.reduce((a, b) => a + b, 0) / t.latencies.length
    : 0;
  return {
    total: t.total,
    routed: t.routed,
    cacheHits: t.cacheHits,
    failures: t.failures,
    spendUsd: t.spendUsd,
    baselineUsd: t.baselineUsd,
    savedUsd: Math.max(0, t.baselineUsd - t.spendUsd),
    avgLatencyMs: avgLatency,
    p95LatencyMs: percentile(t.latencies, 95),
    avgQuality: t.qualN ? t.qualSum / t.qualN : 0,
    cacheHitRate: t.total ? t.cacheHits / t.total : 0,
  };
}

export function computeFleet(): FleetStat[] {
  const s = store();
  const routed = s.totals.routed || 1;
  const now = Date.now();
  return MODELS.map((m) => {
    const a = armStats(m.id);
    const recent = s.history.filter((h) => !h.cached && h.modelId === m.id).slice(0, 12);
    const drift =
      recent.length >= 3
        ? recent.reduce((acc, h) => acc + h.quality, 0) / recent.length - m.qualityPrior
        : 0;
    return {
      modelId: m.id,
      picks: a.picks,
      share: a.picks / routed,
      avgCostUsd: a.picks ? a.costSum / a.picks : 0,
      avgLatencyMs: a.picks ? a.latSum / a.picks : 0,
      avgQuality: a.picks ? a.qualSum / a.picks : m.qualityPrior,
      meanReward: a.rewardN ? a.rewardSum / a.rewardN : 0,
      healthy: a.healthy && !s.offline.has(m.id),
      circuit: circuitState(m.id, now),
      breakerFails: breakerFails(m.id),
      drift,
    };
  });
}

function computeExploration(): number {
  const routed = store()
    .history.filter((r) => !r.cached && r.candidates.length)
    .slice(0, 30);
  if (!routed.length) return 0;
  let explored = 0;
  for (const r of routed) {
    const greedy = r.candidates.reduce((a, b) => (b.mean > a.mean ? b : a));
    const chosen = r.candidates.find((c) => c.chosen);
    if (chosen && chosen.modelId !== greedy.modelId) explored += 1;
  }
  return explored / routed.length;
}

export function computeState(): GatewayState {
  const fleet = computeFleet();
  const best = fleet
    .filter((f) => f.picks > 0)
    .reduce<(typeof fleet)[number] | null>(
      (a, b) => (!a || b.share > a.share ? b : a),
      null,
    );
  const s = store();
  return {
    metrics: computeMetrics(),
    fleet,
    history: s.history.slice(0, 50),
    weights: s.weights,
    simulated: IS_SIMULATED,
    exploration: computeExploration(),
    bestModelId: best?.modelId ?? null,
    offline: [...s.offline],
    coldStart: s.totals.routed < COLD_START_ROUTED,
    routedCount: s.totals.routed,
    abtest: s.abtest,
  };
}

// Varied prompts spanning easy chat → hard reasoning/code, so routing spreads
// across the roster and the bandit has something to learn.
const SEED_PROMPTS = [
  "What's the capital of Australia?",
  "Rewrite this sentence to be more concise.",
  "Translate 'good morning, how are you?' into French.",
  "Summarize the plot of Romeo and Juliet in two lines.",
  "Design a rate limiter for a distributed API. Discuss the trade-offs.",
  "Prove that the square root of 2 is irrational, step by step.",
  "Write a SQL query to find the top 3 customers by revenue per region.",
  "Explain how a contextual multi-armed bandit balances exploration and exploitation.",
  "Fix this loop: for (let i = 0; i <= arr.length; i++) { sum += arr[i]; }",
  "Give me three names for a specialty coffee shop.",
  "What is 47 * 89?",
  "Draft a polite follow-up email about an overdue invoice.",
  "Derive the time complexity of merge sort and explain the recurrence.",
  "Refactor a callback-based function into async/await.",
  "List the primary colors.",
  "Architect a multi-region failover strategy for a Postgres cluster.",
  "What's a good subject line for a product launch announcement?",
  "Explain the CAP theorem to a junior engineer.",
  "Convert 30 degrees Celsius to Fahrenheit.",
  "Write a regular expression that matches a valid IPv4 address.",
  "Compare optimistic and pessimistic locking with an example.",
  "Turn this bullet list into a short paragraph.",
  "What year did the Berlin Wall fall?",
  "Design the database schema for a URL shortener.",
  "Explain why floating point 0.1 + 0.2 is not exactly 0.3.",
  "Suggest a git commit message for a bug fix in auth middleware.",
  "Outline a caching strategy for a read-heavy news website.",
  "Translate 'thank you very much' into Japanese.",
  "Prove that there are infinitely many prime numbers.",
  "What's the difference between TCP and UDP?",
  "Write a Python function to check if a string is a palindrome.",
  "Summarize the theory of relativity in one sentence.",
  "Recommend an index for a query filtering on user_id and created_at.",
  "What's 15% of 240?",
  "Explain eventual consistency with a shopping-cart example.",
  "Draft a two-line out-of-office auto-reply.",
];

// A spread of objectives so the bandit learns how the objective steers routing,
// not just one operating point. Dragging the sliders then visibly moves traffic.
const SEED_OBJECTIVES: { quality: number; cost: number; latency: number }[] = [
  { quality: 0.5, cost: 0.3, latency: 0.2 },
  { quality: 0.85, cost: 0.1, latency: 0.05 },
  { quality: 0.15, cost: 0.7, latency: 0.15 },
  { quality: 0.2, cost: 0.2, latency: 0.6 },
  { quality: 0.6, cost: 0.3, latency: 0.1 },
];

export async function ensureSeeded(): Promise<void> {
  const s = store();
  if (s.seeded) return;
  s.seeded = true;
  const len = SEED_PROMPTS.length;

  // Phase A - warm-start the bandit in BOTH modes: teach every arm the
  // (prompt × objective) landscape from simulated priors so routing is sensible
  // from the first real request. This primes the bandit only - no fake metrics.
  const grid = [
    ...SEED_OBJECTIVES,
    { quality: 0.95, cost: 0.03, latency: 0.02 },
    { quality: 0.05, cost: 0.9, latency: 0.05 },
    { quality: 0.05, cost: 0.05, latency: 0.9 },
  ];
  for (const objective of grid) {
    for (let k = 0; k < len; k++) warmTrain(SEED_PROMPTS[k], objective);
  }

  // No fabricated backlog - the dashboard is session-scoped on the client and
  // fills from the visitor's own requests (see lib/session.ts). This only primes
  // the bandit so the first real request routes sensibly.
  s.weights = { quality: 0.5, cost: 0.3, latency: 0.2 };
}
