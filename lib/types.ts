// Shared types for the routing gateway.

export type ModelDef = {
  id: string; // OpenRouter model id (or local:*)
  label: string; // short display name
  provider: string; // e.g. "DeepSeek", "Meta", "Google"
  /** Approximate price, USD per 1M tokens. Sample values - verify before billing. */
  priceIn: number;
  priceOut: number;
  /** Prior expectations (seed the simulator + initial gauges; the bandit learns the truth). */
  baseLatencyMs: number;
  qualityPrior: number; // 0..1
  color: string; // trace color token value
  tier: "flagship" | "mid" | "efficient";
};

export type Weights = { quality: number; cost: number; latency: number };

/** One stage in a request's lifecycle, as shown in the Request Inspector. */
export type Stage = {
  key: string;
  label: string;
  detail: string;
  ms: number; // duration of this stage
  status: "ok" | "warn" | "skip" | "hit" | "fail";
};

/** Per-candidate score the bandit computed while choosing. */
export type Candidate = {
  modelId: string;
  score: number; // UCB score used to pick
  mean: number; // predicted reward (exploitation term)
  bonus: number; // exploration bonus
  chosen: boolean;
};

export type RequestRecord = {
  id: string;
  ts: number;
  prompt: string;
  modelId: string;
  cached: boolean;
  similarity: number; // nearest semantic-cache match (0..1)
  failed: boolean;
  costUsd: number;
  baselineUsd: number; // what a flagship-only policy would have spent on this request
  latencyMs: number;
  quality: number; // 0..1
  reward: number; // 0..1 joint objective
  tokensIn: number;
  tokensOut: number;
  difficulty: number; // 0..1 estimated
  confidence: number; // 0..1 - how sure the router is about the chosen model
  reasons: string[]; // human-readable "why this model" bullets
  latency: LatencyBreakdown;
  candidates: Candidate[];
  stages: Stage[];
  response: string;
  simulated: boolean;
  /** Detected input language (best-effort, script/keyword heuristic). */
  language?: string;
  /** LLM-as-Judge verdict - the quality signal that feeds the reward. */
  judge?: Judgement;
  /** Shadow mode: what each policy WOULD have picked (no user impact). */
  shadow?: { bandit: string; static: string; random: string };
};

/** LLM-as-Judge output for one answer. */
export type Judgement = { score: number; reasoning: string };

export type CircuitState = "closed" | "open" | "half-open";

/** One routing policy's running tally, for A/B comparison. */
export type PolicyStat = {
  count: number;
  spendUsd: number;
  qualitySum: number;
};

/** Named latency buckets for the breakdown card. */
export type LatencyBreakdown = {
  featureMs: number; // feature extraction + embedding
  banditMs: number; // bandit decision
  providerMs: number; // the model call
  totalMs: number;
};

export type FleetStat = {
  modelId: string;
  picks: number;
  share: number; // 0..1 of routed (non-cache) traffic
  avgCostUsd: number;
  avgLatencyMs: number;
  avgQuality: number;
  meanReward: number; // bandit's current estimate for this arm (avg observed)
  healthy: boolean;
  /** Circuit-breaker state (closed = serving, open = tripped, half-open = trial). */
  circuit?: CircuitState;
  /** Consecutive failures currently counted against the breaker. */
  breakerFails?: number;
  /** Quality drift: recent avg quality − prior (negative = degrading). */
  drift?: number;
};

export type Metrics = {
  total: number;
  routed: number; // non-cache calls
  cacheHits: number;
  failures: number;
  spendUsd: number;
  baselineUsd: number; // cost if everything went to the flagship
  savedUsd: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  avgQuality: number;
  cacheHitRate: number;
};

export type GatewayState = {
  metrics: Metrics;
  fleet: FleetStat[];
  history: RequestRecord[];
  weights: Weights;
  simulated: boolean;
  /** Aggregate exploration ratio (0..1) across recent routed picks. */
  exploration: number;
  /** Model id the router currently favors most (by share). */
  bestModelId: string | null;
  /** Model ids currently forced offline (failure demo). */
  offline: string[];
  /** True until the bandit has seen enough routed traffic to trust its estimates. */
  coldStart: boolean;
  /** Routed (non-cache) requests observed so far. */
  routedCount: number;
  /** A/B tallies: bandit (live) vs static (always flagship) vs random. */
  abtest: { bandit: PolicyStat; static: PolicyStat; random: PolicyStat };
};
