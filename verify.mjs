// Feature verification against the spec. Drives the real running server.
const BASE = "http://localhost:3000";
const post = (path, body) =>
  fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
const get = (path) => fetch(BASE + path).then((r) => r.json());
// /api/route now streams NDJSON (token frames + a final done frame). Drain it
// and return the done frame's payload so the checks below read the same shape.
const route = async (body) => {
  const res = await fetch(BASE + "/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const msg = JSON.parse(t);
    if (msg.type === "done") return { record: msg.record, state: msg.state };
  }
  return { record: null };
};
const short = (id) => id.split("/")[1].replace(":free", "");

const PROMPTS = [
  "Write a haiku about autumn leaves.",
  "What is the time complexity of quicksort?",
  "Translate 'thank you' into German.",
  "Design a REST endpoint for creating an order.",
  "Give me a fun fact about jellyfish.",
  "Summarize the water cycle in two lines.",
  "Write a regex for a valid email.",
  "Explain recursion to a beginner.",
  "What is 15% of 240?",
  "Draft a one-line out-of-office reply.",
];

console.log("═══ generating traffic ═══");
for (const p of PROMPTS) {
  const { record: r } = await route({ prompt: p });
  console.log(` ${r.failed ? "✗" : "✓"} ${short(r.modelId).padEnd(26)} ${r.latencyMs}ms`);
}

// ── CACHE: send the same prompt twice ──
console.log("\n═══ CACHE (repeat prompt) ═══");
const dup = "What is Docker used for? One sentence.";
await route({ prompt: dup });
const { record: cacheRec } = await route({ prompt: dup });
console.log("2nd send → cached:", cacheRec.cached, "| similarity:", (cacheRec.similarity * 100).toFixed(1) + "%", "| responseTime:", cacheRec.latencyMs + "ms", "| cost:", cacheRec.costUsd);

// ── FAILURE: offline the flagship, route a quality prompt ──
console.log("\n═══ FAILOVER (provider offline) ═══");
const flagship = "nvidia/nemotron-3-ultra-550b-a55b:free";
await post("/api/provider", { modelId: flagship, offline: true });
const { record: foRec } = await route({
  prompt: "Prove the Pythagorean theorem with a rigorous geometric argument.",
  weights: { quality: 0.9, cost: 0.05, latency: 0.05 },
});
const foStage = foRec.stages.find((s) => s.key === "failover");
console.log("flagship offline → routed to:", short(foRec.modelId), "| failover stage:", foStage ? foStage.detail : "(chose an online model directly)");
await post("/api/provider", { modelId: flagship, offline: false });

// ── inspect the latest routed (non-cache) record for the decision cards ──
console.log("\n═══ ROUTING DECISION (a routed request) ═══");
const st = await get("/api/state");
const routed = st.history.find((r) => !r.cached && r.candidates.length);
console.log("selected:", short(routed.modelId));
console.log("confidence:", (routed.confidence * 100).toFixed(0) + "%");
console.log("reasons:", routed.reasons.join(" · "));
console.log("alternatives:");
routed.candidates.filter((c) => !c.chosen).slice(0, 3).forEach((c) =>
  console.log("   " + short(c.modelId).padEnd(26) + " score " + c.score.toFixed(3)),
);

console.log("\n═══ COST ANALYSIS ═══");
console.log("chosen $:", routed.costUsd.toFixed(6), "| flagship-baseline $:", routed.baselineUsd.toFixed(6), "| saved:", Math.round((1 - routed.costUsd / routed.baselineUsd) * 100) + "%");

console.log("\n═══ LATENCY ═══");
console.log("feature:", routed.latency.featureMs + "ms", "| bandit:", routed.latency.banditMs + "ms", "| provider:", routed.latency.providerMs + "ms", "| total:", routed.latency.totalMs + "ms");

console.log("\n═══ PROVIDER TIMELINE (picks per model) ═══");
st.fleet.forEach((f) => console.log("   " + short(f.modelId).padEnd(26) + " " + "█".repeat(f.picks) + " " + f.picks));

console.log("\n═══ LIVE METRICS ═══");
console.log("requests:", st.metrics.total, "| avgLatency:", Math.round(st.metrics.avgLatencyMs) + "ms", "| moneySaved:", Math.round((st.metrics.savedUsd / st.metrics.baselineUsd) * 100) + "%", "| cacheHit:", Math.round(st.metrics.cacheHitRate * 100) + "%", "| bestModel:", st.bestModelId ? short(st.bestModelId) : "-");

console.log("\n═══ BANDIT ═══");
console.log("exploration:", Math.round(st.exploration * 100) + "% | exploitation:", Math.round((1 - st.exploration) * 100) + "%");
st.fleet.forEach((f) => console.log("   " + short(f.modelId).padEnd(26) + " " + Math.round(f.share * 100) + "%"));

console.log("\n═══ HISTORY (recent, clickable) ═══");
st.history.slice(0, 6).forEach((r) => {
  const saved = r.baselineUsd ? Math.round((1 - r.costUsd / r.baselineUsd) * 100) : 0;
  console.log("   " + r.prompt.slice(0, 34).padEnd(36) + short(r.modelId).padEnd(24) + (r.cached ? "cached" : "-" + saved + "%") + "  " + r.latencyMs + "ms");
});
console.log("\ndone");
