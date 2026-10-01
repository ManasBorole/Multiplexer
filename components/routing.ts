import { MODELS, MODEL_BY_ID, FLAGSHIP } from "@/lib/models";
import type { Candidate, ModelDef, RequestRecord, Weights } from "@/lib/types";

export const DEFAULT_WEIGHTS: Weights = { quality: 0.5, cost: 0.3, latency: 0.2 };

export const PRESETS: { name: string; w: Weights }[] = [
  { name: "Balanced", w: { quality: 0.5, cost: 0.3, latency: 0.2 } },
  { name: "Best quality", w: { quality: 0.85, cost: 0.1, latency: 0.05 } },
  { name: "Cheapest", w: { quality: 0.15, cost: 0.75, latency: 0.1 } },
  { name: "Fastest", w: { quality: 0.2, cost: 0.2, latency: 0.6 } },
];

export const SUGGESTIONS = [
  "Write a Python function to merge two sorted linked lists.",
  "How do I optimize slow SQL queries?",
  "Explain the CAP theorem simply.",
  "Write a haiku about the ocean.",
  "Prove √2 is irrational.",
  "Give me three names for a coffee shop.",
];

/** The eight lifecycle steps, in plain words first and the technical name second. */
export const STEPS: { name: string; tech: string; desc: string }[] = [
  { name: "Your prompt comes in", tech: "Request", desc: "You type a prompt and say what matters most: quality, cost or speed." },
  { name: "It reads the prompt", tech: "Featurization", desc: "The prompt becomes 9 simple signals, like its length and whether it is about code." },
  { name: "It checks for a saved answer", tech: "Semantic cache", desc: "If a prompt with the same meaning was answered before, that answer comes back instantly and nothing else runs." },
  { name: "It scores every model", tech: "LinUCB contextual bandit", desc: "Each model gets a score: how well it has done on prompts like this, plus a bonus for models it has not tried much yet." },
  { name: "It skips broken providers", tech: "Circuit breaker", desc: "Providers that keep failing, or that you switch off, are skipped automatically, so your request never waits on them." },
  { name: "It calls the best model", tech: "Provider call", desc: "The top healthy model answers through OpenRouter, and the answer streams back." },
  { name: "It grades the answer", tech: "LLM judge", desc: "A judge model scores the quality. Cost and speed are measured on the real call." },
  { name: "It learns from the result", tech: "Reward update", desc: "The result updates the chosen model's score, so the next prompt like this is routed with more confidence." },
];

/** Threshold a record's cache lookup used (lib/cache.ts); older records default to lexical. */
export const cacheThresholdOf = (r: { cacheThreshold?: number }) => r.cacheThreshold ?? 0.86;

export const model = (id: string): ModelDef => MODEL_BY_ID.get(id) ?? MODELS[0];
export const tierShape = (m: ModelDef) => `shape shape-${m.tier}`;
export const tierPrice = (m: ModelDef) => (m.priceOut >= 1 ? "$$$" : m.priceOut >= 0.2 ? "$$" : "$");

export const normWeights = (w: Weights) => {
  const s = w.quality + w.cost + w.latency || 1;
  return { quality: w.quality / s, cost: w.cost / s, latency: w.latency / s };
};

/**
 * Display-only mirror of featurize() in lib/engine.ts. RequestRecord does not
 * carry the context vector, so the UI recomputes it from the prompt + weights to
 * show the signals. Routing never uses this copy. Keep in sync with the engine.
 */
export function featureVector(prompt: string, w: Weights) {
  const p = prompt.trim();
  const len = p.length;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const lengthNorm = clamp(len / 1200);
  const codeSyntax = /```|def |func |class |import |=>|;|\{|\}|SELECT |<\/?\w+>/i.test(p);
  const codeIntent =
    /\b(function|method|class|api|sql|query|algorithm|regex|schema|python|javascript|typescript|rust|golang|java|code|debug|compile|linked list|array|recursion|endpoint)\b/i.test(p);
  const code = codeSyntax ? clamp(0.5 + (p.match(/[{};]/g)?.length ?? 0) / 40) : codeIntent ? 0.45 : 0;
  const question = /\?|how|why|what|explain|compare|design|prove/i.test(p) ? 1 : 0.2;
  const reasoning = /step|reason|prove|derive|algorithm|optimi|trade-?off|architect|analy/i.test(p)
    ? clamp(0.55 + len / 2000)
    : 0.15;
  const rare = clamp((p.match(/[A-Z]{3,}|\d{3,}|[^\x00-\x7f]/g)?.length ?? 0) / 8);
  const n = normWeights(w);
  return [
    { k: "Length", v: lengthNorm, weight: false },
    { k: "Code", v: code, weight: false },
    { k: "Question", v: question, weight: false },
    { k: "Reasoning", v: reasoning, weight: false },
    { k: "Rare words", v: rare, weight: false },
    { k: "Quality wt", v: n.quality, weight: true },
    { k: "Cost wt", v: n.cost, weight: true },
    { k: "Speed wt", v: n.latency, weight: true },
  ];
}

/** The whole failover chain in one line, e.g. "X switched off, Y errored; answered by Z". */
export function failoverOf(r: RequestRecord): { detail: string } | null {
  const parts: string[] = [];
  for (const s of r.stages) {
    if (s.key === "failover") parts.push(`${s.detail.split(" offline")[0]} switched off`);
    if (s.key === "call" && s.status === "fail") parts.push(`${s.label.replace(/^Call /, "")} errored`);
  }
  return parts.length ? { detail: `${parts.join(", ")}; answered by ${model(r.modelId).label}` } : null;
}

/** When the bandit picked something other than the top score, it was exploring. */
export function explorationNote(r: RequestRecord): string | null {
  const top = r.candidates[0];
  const pick = chosenOf(r);
  if (r.cached || !top || !pick || pick.modelId === top.modelId) return null;
  return `Exploring: tried ${model(pick.modelId).label} to learn how it does (top score was ${model(top.modelId).label})`;
}

export const chosenOf = (r: RequestRecord): Candidate | undefined =>
  r.candidates.find((c) => c.chosen);

// ─── Sample trace ────────────────────────────────────────────────────────────
// Shown in the story before the visitor sends a prompt, and always labelled
// "Sample request". Real roster; the numbers are illustrative, not from a run.
const id = (label: string) => MODELS.find((m) => m.label === label)!.id;
const SAMPLE_SCORES: [string, number, number][] = [
  ["Gemma 4 31B", 0.64, 0.07],
  ["Nemotron 3 Super", 0.6, 0.08],
  ["North Mini Code", 0.59, 0.08],
  ["Nemotron 3 Nano Reasoning", 0.52, 0.15],
  ["GPT-OSS 20B", 0.57, 0.1],
  ["Laguna S 2.1", 0.5, 0.16],
  ["Nemotron 3 Ultra", 0.58, 0.05],
  ["Nemotron 3 Nano 30B", 0.55, 0.09],
  ["Gemma 4 26B", 0.53, 0.11],
  ["Ling 3.0 Flash", 0.47, 0.17],
  ["Nemotron Nano 12B", 0.44, 0.18],
  ["Nemotron Nano 9B", 0.42, 0.19],
];

export const SAMPLE_OPEN_CIRCUIT = id("Laguna XS 2.1");

export const SAMPLE: RequestRecord = {
  id: "sample",
  ts: 0,
  prompt: SUGGESTIONS[0],
  modelId: id("Gemma 4 31B"),
  cached: false,
  similarity: 0.71,
  cacheThreshold: 0.92,
  cacheMode: "semantic",
  failed: false,
  costUsd: 0.00031,
  baselineUsd: 0.0021,
  latencyMs: 1120,
  quality: 0.82,
  reward: 0.74,
  tokensIn: 26,
  tokensOut: 318,
  difficulty: 0.38,
  confidence: 0.71,
  reasons: ["Code detected in prompt", "Low complexity", "Short expected output"],
  latency: { featureMs: 6, banditMs: 2, providerMs: 1112, totalMs: 1120 },
  candidates: SAMPLE_SCORES.map(([label, mean, bonus]) => ({
    modelId: id(label),
    mean,
    bonus,
    score: mean + bonus,
    chosen: label === "Gemma 4 31B",
  })).sort((a, b) => b.score - a.score),
  stages: [
    { key: "ingest", label: "Ingest", detail: "57 chars, difficulty 38%", ms: 1, status: "ok" },
    { key: "embed", label: "Cache lookup", detail: "text-embedding-3-small via Upstash Vector", ms: 140, status: "ok" },
    { key: "cache", label: "Semantic cache", detail: "miss, nearest 71.0%", ms: 2, status: "skip" },
    { key: "select", label: "Bandit select", detail: "12 models scored, Gemma 4 31B (UCB 0.710)", ms: 2, status: "ok" },
    { key: "respond", label: "Response", detail: "318 tok, 1112 ms, $0.00031", ms: 1112, status: "ok" },
    { key: "judge", label: "LLM-as-Judge", detail: "quality 82%", ms: 140, status: "ok" },
    { key: "learn", label: "Score + learn", detail: "reward 0.740, arm updated", ms: 1, status: "ok" },
  ],
  response:
    "def merge(a, b):\n    head = tail = Node(0)\n    while a and b:\n        if a.val <= b.val:\n            tail.next, a = a, a.next\n        else:\n            tail.next, b = b, b.next\n        tail = tail.next\n    tail.next = a or b\n    return head.next",
  simulated: true,
  language: "English",
  judge: { score: 0.82, reasoning: "Correct, handles empty lists and keeps the merge stable." },
  shadow: { bandit: id("Gemma 4 31B"), static: FLAGSHIP.id, random: id("Gemma 4 26B") },
};
