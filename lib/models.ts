import type { ModelDef } from "./types";

/**
 * Roster of FREE OpenRouter text models - real `:free` ids, each verified to
 * complete at $0 on this account (checked 2026-08-02 against the live
 * /api/v1/models list + a probe call). Prices are the standard list rate of the
 * tier, kept only as a reference so cost routing and "money saved" stay
 * meaningful (actual spend is $0 on the free tier). Top up and add paid ids
 * (e.g. `openai/gpt-5`) here and they join routing.
 *
 * NOTE: OpenRouter's free roster rotates - a model can flip to paid-only and
 * start 404-ing ("unavailable for free"). When that happens the router just
 * fails over to a healthy one; swap the id for a current free one from
 * https://openrouter.ai/models?q=free (or the /api/v1/models list). This account
 * exposes 14 free text models; the content-safety classifier is excluded, so 13
 * general models route here.
 *
 * Prices are USD / 1M tokens, approximate reference values. Colors are distinct
 * so the roster stays legible in the distribution and bandit charts.
 */
export const MODELS: ModelDef[] = [
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nemotron 3 Ultra",
    provider: "NVIDIA",
    priceIn: 3,
    priceOut: 12,
    baseLatencyMs: 1600,
    qualityPrior: 0.94,
    color: "#FF7A6B",
    tier: "flagship",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "Nemotron 3 Super",
    provider: "NVIDIA",
    priceIn: 0.8,
    priceOut: 2.5,
    baseLatencyMs: 1850,
    qualityPrior: 0.88,
    color: "#5CC8FF",
    tier: "mid",
  },
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    label: "Nemotron 3 Nano Reasoning",
    provider: "NVIDIA",
    priceIn: 0.3,
    priceOut: 0.9,
    baseLatencyMs: 2050,
    qualityPrior: 0.85,
    color: "#C08BFA",
    tier: "mid",
  },
  {
    id: "google/gemma-4-31b-it:free",
    label: "Gemma 4 31B",
    provider: "Google",
    priceIn: 0.15,
    priceOut: 0.5,
    baseLatencyMs: 1050,
    qualityPrior: 0.83,
    color: "#FF9F5C",
    tier: "mid",
  },
  {
    id: "openai/gpt-oss-20b:free",
    label: "GPT-OSS 20B",
    provider: "OpenAI",
    priceIn: 0.2,
    priceOut: 0.6,
    baseLatencyMs: 1650,
    qualityPrior: 0.82,
    color: "#3FE0A0",
    tier: "mid",
  },
  {
    id: "poolside/laguna-s-2.1:free",
    label: "Laguna S 2.1",
    provider: "Poolside",
    priceIn: 0.18,
    priceOut: 0.55,
    baseLatencyMs: 1200,
    qualityPrior: 0.81,
    color: "#8BFFB0",
    tier: "mid",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    label: "Nemotron 3 Nano 30B",
    provider: "NVIDIA",
    priceIn: 0.2,
    priceOut: 0.6,
    baseLatencyMs: 1000,
    qualityPrior: 0.8,
    color: "#7C9CFF",
    tier: "efficient",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    label: "Gemma 4 26B",
    provider: "Google",
    priceIn: 0.12,
    priceOut: 0.4,
    baseLatencyMs: 950,
    qualityPrior: 0.79,
    color: "#FFC24B",
    tier: "efficient",
  },
  {
    id: "cohere/north-mini-code:free",
    label: "North Mini Code",
    provider: "Cohere",
    priceIn: 0.1,
    priceOut: 0.3,
    baseLatencyMs: 900,
    qualityPrior: 0.78,
    color: "#FFD86B",
    tier: "efficient",
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    label: "Nemotron Nano 12B",
    provider: "NVIDIA",
    priceIn: 0.1,
    priceOut: 0.35,
    baseLatencyMs: 820,
    qualityPrior: 0.76,
    color: "#6FE3C9",
    tier: "efficient",
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    label: "Nemotron Nano 9B",
    provider: "NVIDIA",
    priceIn: 0.08,
    priceOut: 0.28,
    baseLatencyMs: 720,
    qualityPrior: 0.75,
    color: "#B0FF6B",
    tier: "efficient",
  },
  {
    id: "inclusionai/ling-3.0-flash:free",
    label: "Ling 3.0 Flash",
    provider: "inclusionAI",
    priceIn: 0.06,
    priceOut: 0.2,
    baseLatencyMs: 700,
    qualityPrior: 0.74,
    color: "#FF6E9C",
    tier: "efficient",
  },
  {
    id: "poolside/laguna-xs-2.1:free",
    label: "Laguna XS 2.1",
    provider: "Poolside",
    priceIn: 0.05,
    priceOut: 0.15,
    baseLatencyMs: 600,
    qualityPrior: 0.72,
    color: "#5CE0FF",
    tier: "efficient",
  },
];

export const MODEL_BY_ID = new Map(MODELS.map((m) => [m.id, m]));

/** The most capable model - the "route everything to the best" cost baseline. */
export const FLAGSHIP = MODELS.reduce((a, b) =>
  b.qualityPrior > a.qualityPrior ? b : a,
);

/** Cost tier badge ($, $$, $$$) from output price, for the alternatives list. */
export function costTier(priceOut: number): "$" | "$$" | "$$$" {
  if (priceOut >= 1) return "$$$";
  if (priceOut >= 0.2) return "$$";
  return "$";
}
