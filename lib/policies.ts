import { FLAGSHIP, MODELS } from "./models";
import type { ModelDef } from "./types";

// Baseline routing policies the live bandit is measured against (A/B + shadow).
//   static - always the flagship ("route everything to the best/most expensive").
//   random - uniformly random model (a naive load-spreader).
// The bandit should beat both on the joint objective as traffic accumulates.

export function staticPick(): ModelDef {
  return FLAGSHIP;
}

/** Deterministic-ish random pick seeded by the request, so shadow is reproducible. */
export function randomPick(seed: number): ModelDef {
  const i = Math.abs(Math.floor(seed)) % MODELS.length;
  return MODELS[i];
}

/** Estimate a model's cost for a request from its token counts (no extra call). */
export function estCost(m: ModelDef, tokensIn: number, tokensOut: number): number {
  return (tokensIn * m.priceIn + tokensOut * m.priceOut) / 1e6;
}
