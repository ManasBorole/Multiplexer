import { FLAGSHIP, MODELS, MODEL_BY_ID } from "./models";
import { estCost } from "./policies";
import type {
  FleetStat,
  GatewayState,
  Metrics,
  PolicyStat,
  RequestRecord,
} from "./types";

// Below this many routed requests the bandit's estimates aren't trustworthy yet.
export const COLD_START_ROUTED = 8;

// Session-scoped dashboard: metrics / distribution / bandit / history are derived
// from THIS browser session's own requests (persisted in sessionStorage - survives
// reload, cleared when the tab closes). The server still owns routing + the learned
// bandit; the dashboard just reflects what you did this session, so it starts empty
// and varies session to session instead of showing a shared pre-seeded backlog.

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

function metricsOf(records: RequestRecord[]): Metrics {
  const total = records.length;
  const routed = records.filter((r) => !r.cached).length;
  const cacheHits = records.filter((r) => r.cached).length;
  const failures = records.filter((r) => r.failed).length;
  const spendUsd = records.reduce((a, r) => a + r.costUsd, 0);
  const baselineUsd = records.reduce((a, r) => a + (r.baselineUsd ?? 0), 0);
  const latencies = records.map((r) => r.latencyMs);
  const qual = records.filter((r) => !r.cached && !r.failed);
  return {
    total,
    routed,
    cacheHits,
    failures,
    spendUsd,
    baselineUsd,
    savedUsd: Math.max(0, baselineUsd - spendUsd),
    avgLatencyMs: latencies.length
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0,
    p95LatencyMs: percentile(latencies, 95),
    avgQuality: qual.length
      ? qual.reduce((a, r) => a + r.quality, 0) / qual.length
      : 0,
    cacheHitRate: total ? cacheHits / total : 0,
  };
}

function fleetOf(records: RequestRecord[], offline: Set<string>): FleetStat[] {
  const routed = records.filter((r) => !r.cached);
  const denom = routed.length || 1;
  return MODELS.map((m) => {
    const picks = routed.filter((r) => r.modelId === m.id);
    const n = picks.length || 1;
    // Drift: recent observed quality vs the model's prior. Negative ⇒ degrading.
    const recent = picks.slice(0, 10);
    const drift =
      recent.length >= 3
        ? recent.reduce((a, r) => a + r.quality, 0) / recent.length - m.qualityPrior
        : 0;
    const recentFailed = picks.slice(0, 4).some((r) => r.failed);
    return {
      modelId: m.id,
      picks: picks.length,
      share: picks.length / denom,
      avgCostUsd: picks.reduce((a, r) => a + r.costUsd, 0) / n,
      avgLatencyMs: picks.reduce((a, r) => a + r.latencyMs, 0) / n,
      avgQuality: picks.length
        ? picks.reduce((a, r) => a + r.quality, 0) / n
        : m.qualityPrior,
      meanReward: picks.length ? picks.reduce((a, r) => a + r.reward, 0) / n : 0,
      healthy: !offline.has(m.id) && !recentFailed,
      drift,
    };
  });
}

/** A/B tallies derived from the session's own records + their shadow picks. */
function abtestOf(records: RequestRecord[]): GatewayState["abtest"] {
  const zero = (): PolicyStat => ({ count: 0, spendUsd: 0, qualitySum: 0 });
  const ab = { bandit: zero(), static: zero(), random: zero() };
  for (const r of records) {
    if (r.cached || r.failed) continue;
    ab.bandit.count += 1;
    ab.bandit.spendUsd += r.costUsd;
    ab.bandit.qualitySum += r.quality;
    ab.static.count += 1;
    ab.static.spendUsd += r.baselineUsd ?? 0;
    ab.static.qualitySum += FLAGSHIP.qualityPrior;
    const rm = r.shadow ? MODEL_BY_ID.get(r.shadow.random) : undefined;
    if (rm) {
      ab.random.count += 1;
      ab.random.spendUsd += estCost(rm, r.tokensIn || 40, r.tokensOut || 260);
      ab.random.qualitySum += rm.qualityPrior;
    }
  }
  return ab;
}

function explorationOf(records: RequestRecord[]): number {
  const routed = records
    .filter((r) => !r.cached && r.candidates.length)
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

export function deriveState(
  records: RequestRecord[],
  offline: string[],
): GatewayState {
  const off = new Set(offline);
  const fleet = fleetOf(records, off);
  const best = fleet
    .filter((f) => f.picks > 0)
    .reduce<FleetStat | null>((a, b) => (!a || b.share > a.share ? b : a), null);
  const routedCount = records.filter((r) => !r.cached).length;
  return {
    metrics: metricsOf(records),
    fleet,
    history: records.slice(0, 50),
    weights: { quality: 0.5, cost: 0.3, latency: 0.2 },
    simulated: true,
    exploration: explorationOf(records),
    bestModelId: best?.modelId ?? null,
    offline,
    coldStart: routedCount < COLD_START_ROUTED,
    routedCount,
    abtest: abtestOf(records),
  };
}
