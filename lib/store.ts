import { MODELS } from "./models";
import { newArm, type ArmState } from "./bandit";
import type { PolicyStat, RequestRecord, Weights } from "./types";

// Gateway state: bandit arms, totals, A/B tallies, offline set. Requests work on
// this in-process copy; lib/persist.ts loads it from Upstash Redis at the start
// of a request and saves it afterwards, so learning survives cold starts and is
// shared across serverless instances. Without Redis it is per-instance memory.

const HISTORY_CAP = 240;

type ArmStats = {
  arm: ArmState;
  picks: number;
  costSum: number;
  latSum: number;
  qualSum: number;
  rewardSum: number;
  rewardN: number;
  failures: number;
  healthy: boolean;
};

type Store = {
  arms: Map<string, ArmStats>;
  history: RequestRecord[];
  weights: Weights;
  offline: Set<string>; // model ids forced offline (failure demo)
  abtest: { bandit: PolicyStat; static: PolicyStat; random: PolicyStat };
  /** Shadow A/B from real calls on a 1-in-10 sample (all three policies measured). */
  measured: { bandit: PolicyStat; static: PolicyStat; random: PolicyStat };
  totals: {
    total: number;
    routed: number;
    cacheHits: number;
    failures: number;
    spendUsd: number;
    baselineUsd: number;
    latencies: number[]; // recent, for p95
    qualSum: number;
    qualN: number;
  };
  seeded: boolean;
};

const g = globalThis as unknown as { __mux?: Store };

function freshArm(): ArmStats {
  return {
    arm: newArm(),
    picks: 0,
    costSum: 0,
    latSum: 0,
    qualSum: 0,
    rewardSum: 0,
    rewardN: 0,
    failures: 0,
    healthy: true,
  };
}

export function store(): Store {
  if (!g.__mux) {
    g.__mux = {
      arms: new Map(MODELS.map((m) => [m.id, freshArm()])),
      history: [],
      weights: { quality: 0.5, cost: 0.3, latency: 0.2 },
      offline: new Set<string>(),
      abtest: {
        bandit: { count: 0, spendUsd: 0, qualitySum: 0 },
        static: { count: 0, spendUsd: 0, qualitySum: 0 },
        random: { count: 0, spendUsd: 0, qualitySum: 0 },
      },
      measured: {
        bandit: { count: 0, spendUsd: 0, qualitySum: 0 },
        static: { count: 0, spendUsd: 0, qualitySum: 0 },
        random: { count: 0, spendUsd: 0, qualitySum: 0 },
      },
      totals: {
        total: 0,
        routed: 0,
        cacheHits: 0,
        failures: 0,
        spendUsd: 0,
        baselineUsd: 0,
        latencies: [],
        qualSum: 0,
        qualN: 0,
      },
      seeded: false,
    };
  }
  // Backfill fields added after a long-lived global was created (HMR / warm
  // serverless instance from an older build), so reads never hit undefined.
  const s = g.__mux;
  if (!s.abtest)
    s.abtest = {
      bandit: { count: 0, spendUsd: 0, qualitySum: 0 },
      static: { count: 0, spendUsd: 0, qualitySum: 0 },
      random: { count: 0, spendUsd: 0, qualitySum: 0 },
    };
  if (!s.measured)
    s.measured = {
      bandit: { count: 0, spendUsd: 0, qualitySum: 0 },
      static: { count: 0, spendUsd: 0, qualitySum: 0 },
      random: { count: 0, spendUsd: 0, qualitySum: 0 },
    };
  return s;
}

export function armStats(modelId: string): ArmStats {
  const s = store();
  let a = s.arms.get(modelId);
  if (!a) {
    a = freshArm();
    s.arms.set(modelId, a);
  }
  return a;
}

export function pushHistory(rec: RequestRecord): void {
  const s = store();
  s.history.unshift(rec);
  if (s.history.length > HISTORY_CAP) s.history.length = HISTORY_CAP;
  const t = s.totals;
  t.total += 1;
  if (rec.cached) t.cacheHits += 1;
  else t.routed += 1;
  if (rec.failed) t.failures += 1;
  t.spendUsd += rec.costUsd;
  t.baselineUsd += rec.baselineUsd ?? 0;
  // Quality is only meaningful for fresh routed calls; a cache hit reused a
  // prior answer and has no new quality score of its own.
  if (!rec.cached && !rec.failed) {
    t.qualSum += rec.quality;
    t.qualN += 1;
  }
  t.latencies.push(rec.latencyMs);
  if (t.latencies.length > 400) t.latencies.shift();
}

export function setOffline(modelId: string, offline: boolean): void {
  const s = store();
  if (offline) s.offline.add(modelId);
  else s.offline.delete(modelId);
}

/** Accumulate one request's cost/quality under each policy, for A/B comparison. */
export function recordAB(
  policy: "bandit" | "static" | "random",
  spendUsd: number,
  quality: number,
): void {
  const p = store().abtest[policy];
  p.count += 1;
  p.spendUsd += spendUsd;
  p.qualitySum += quality;
}

/** Add one measured shadow sample (all three policies ran the same prompt). */
export function recordMeasured(sample: Record<"bandit" | "static" | "random", { spendUsd: number; quality: number }>): void {
  const m = store().measured;
  for (const k of ["bandit", "static", "random"] as const) {
    m[k].count += 1;
    m[k].spendUsd += sample[k].spendUsd;
    m[k].qualitySum += sample[k].quality;
  }
}

// History kept in the persisted snapshot: enough for drift and exploration
// stats, without the (large) response text.
const SNAPSHOT_HISTORY = 60;

export type StoreSnapshot = {
  arms: Record<string, ArmStats>;
  history: RequestRecord[];
  weights: Weights;
  offline: string[];
  abtest: Store["abtest"];
  measured: Store["measured"];
  totals: Store["totals"];
  seeded: boolean;
};

export function snapshotStore(): StoreSnapshot {
  const s = store();
  return {
    arms: Object.fromEntries(s.arms),
    history: s.history.slice(0, SNAPSHOT_HISTORY).map((r) => ({ ...r, response: "", stages: [] })),
    weights: s.weights,
    offline: [...s.offline],
    abtest: s.abtest,
    measured: s.measured,
    totals: { ...s.totals, latencies: s.totals.latencies.slice(-200) },
    seeded: s.seeded,
  };
}

export function restoreStore(snap: StoreSnapshot): void {
  const s = store();
  s.arms = new Map(MODELS.map((m) => [m.id, snap.arms?.[m.id] ?? freshArm()]));
  s.history = snap.history ?? [];
  s.weights = snap.weights ?? s.weights;
  s.offline = new Set(snap.offline ?? []);
  if (snap.abtest) s.abtest = snap.abtest;
  if (snap.measured) s.measured = snap.measured;
  if (snap.totals) s.totals = snap.totals;
  s.seeded = !!snap.seeded;
}
