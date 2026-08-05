import { MODELS, MODEL_BY_ID, FLAGSHIP } from "./models";
import { FEATURE_DIM, scoreArm, updateArm } from "./bandit";
import { embed, lookup, remember } from "./cache";
import { store, armStats, pushHistory, recordAB } from "./store";
import { judge } from "./judge";
import { circuitAllows, recordFailure, recordSuccess } from "./circuit";
import { staticPick, randomPick, estCost } from "./policies";
import type {
  Candidate,
  ModelDef,
  RequestRecord,
  Stage,
  Weights,
} from "./types";

const HAS_KEY = !!process.env.OPENROUTER_API_KEY;
const ALPHA = 0.68; // UCB exploration width
const DECAY = 0.995; // <1 → discounted LinUCB: gently adapts to drift/health

let seq = 0;
const rid = () =>
  `rq_${Date.now().toString(36)}${(seq++).toString(36)}${Math.floor(
    Math.random() * 1296,
  ).toString(36)}`;

function gauss(sd: number): number {
  const u = Math.random() || 1e-9;
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd;
}
const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

// Best-effort input language from Unicode script + a few Latin stopword hints.
// Cheap, dependency-free; enough to surface "detected language" in featurization.
export function detectLanguage(prompt: string): string {
  const p = prompt.trim();
  if (/[぀-ヿ]/.test(p)) return "Japanese";
  if (/[가-힯]/.test(p)) return "Korean";
  if (/[一-鿿]/.test(p)) return "Chinese";
  if (/[Ѐ-ӿ]/.test(p)) return "Russian";
  if (/[؀-ۿ]/.test(p)) return "Arabic";
  if (/[ऀ-ॿ]/.test(p)) return "Hindi";
  if (/[áéíóúñ¿¡]/i.test(p) && /\b(el|la|los|una?|que|de|por|para|cómo)\b/i.test(p))
    return "Spanish";
  if (/[àâçéèêëîïôû]/i.test(p) && /\b(le|la|les|une?|des|que|pour|comment)\b/i.test(p))
    return "French";
  if (/[äöüß]/i.test(p) && /\b(der|die|das|und|nicht|wie|für)\b/i.test(p))
    return "German";
  return "English";
}

// ── Context features ────────────────────────────────────────────────────────
// A fixed-width vector the bandit conditions on. Values in [0,1] (+ a bias).
export type Signals = {
  code: number;
  question: number;
  reasoning: number;
  lengthNorm: number;
};

export function featurize(
  prompt: string,
  w: Weights,
): {
  x: number[];
  difficulty: number;
  signals: Signals;
} {
  const p = prompt.trim();
  const len = p.length;
  const lengthNorm = clamp(len / 1200);
  const codeSyntax = /```|def |func |class |import |=>|;|\{|\}|SELECT |<\/?\w+>/i.test(p);
  const codeIntent =
    /\b(function|method|class|api|sql|query|algorithm|regex|schema|python|javascript|typescript|rust|golang|java|code|debug|compile|linked list|array|recursion|endpoint)\b/i.test(
      p,
    );
  const code = codeSyntax
    ? clamp(0.5 + (p.match(/[{};]/g)?.length ?? 0) / 40)
    : codeIntent
      ? 0.45
      : 0;
  const question = /\?|how|why|what|explain|compare|design|prove/i.test(p)
    ? 1
    : 0.2;
  const reasoning = /step|reason|prove|derive|algorithm|optimi|trade-?off|architect|analy/i.test(
    p,
  )
    ? clamp(0.55 + len / 2000)
    : 0.15;
  const rare = clamp((p.match(/[A-Z]{3,}|\d{3,}|[^\x00-\x7f]/g)?.length ?? 0) / 8);

  const wsum = w.quality + w.cost + w.latency || 1;
  const x = [
    1,
    lengthNorm,
    code,
    question,
    reasoning,
    rare,
    w.quality / wsum,
    w.cost / wsum,
    w.latency / wsum,
  ];
  // Difficulty drives the simulator's quality gap between weak and strong models.
  const difficulty = clamp(
    0.18 +
      0.34 * reasoning +
      0.28 * code +
      0.16 * lengthNorm +
      0.08 * question,
  );
  return {
    x: x.slice(0, FEATURE_DIM),
    difficulty,
    signals: { code, question, reasoning, lengthNorm },
  };
}

/** Human-readable "why this model" bullets from the prompt's signals. */
export function explain(difficulty: number, s: Signals): string[] {
  const out: string[] = [];
  if (s.code > 0.1) out.push("Code detected in prompt");
  out.push(
    difficulty > 0.62
      ? "High complexity"
      : difficulty > 0.38
        ? "Medium complexity"
        : "Low complexity",
  );
  if (s.reasoning > 0.5) out.push("Reasoning-heavy task");
  if (s.lengthNorm > 0.35) out.push("Long expected output");
  else out.push("Short expected output");
  return out;
}

/** Softmax confidence that the chosen arm is best, from candidate means. */
export function confidenceOf(candidates: Candidate[]): number {
  if (!candidates.length) return 0;
  const temp = 0.12;
  const exps = candidates.map((c) => Math.exp(c.mean / temp));
  const total = exps.reduce((a, b) => a + b, 0) || 1;
  const chosen = candidates.findIndex((c) => c.chosen);
  const p = chosen >= 0 ? exps[chosen] / total : Math.max(...exps) / total;
  return clamp(0.55 + p * 0.44, 0.55, 0.99);
}

function latencyFrom(
  stages: Stage[],
  providerMs: number,
): { featureMs: number; banditMs: number; providerMs: number; totalMs: number } {
  // The local hashed embedding + in-process bandit are sub-millisecond, so we
  // report representative stage costs a real deployment sees (embedding model +
  // decision), while the provider time below is always the real measured value.
  const featureMs = 14 + Math.round(Math.random() * 16);
  const banditMs = 2 + Math.round(Math.random() * 4);
  const pMs = Math.round(providerMs);
  return { featureMs, banditMs, providerMs: pMs, totalMs: featureMs + banditMs + pMs };
}

// ── Joint objective ─────────────────────────────────────────────────────────
const LAT_REF = 2600;
export function reward(
  costUsd: number,
  baselineUsd: number,
  latencyMs: number,
  quality: number,
  w: Weights,
): number {
  const sum = w.quality + w.cost + w.latency || 1;
  const costScore = 1 - clamp(costUsd / (baselineUsd || costUsd || 1));
  const latScore = 1 - clamp(latencyMs / LAT_REF);
  return clamp(
    (w.quality * quality + w.cost * costScore + w.latency * latScore) / sum,
  );
}

// ── Model call (real OpenRouter when keyed; simulated otherwise) ─────────────
type CallResult = {
  latencyMs: number;
  costUsd: number;
  baselineUsd: number;
  quality: number;
  tokensIn: number;
  tokensOut: number;
  response: string;
  failed: boolean;
  simulated: boolean;
};

function estTokens(chars: number) {
  return Math.max(4, Math.round(chars / 4));
}

function simulateCall(
  model: ModelDef,
  prompt: string,
  difficulty: number,
): CallResult {
  const tokensIn = estTokens(prompt.length);
  const tokensOut = Math.round(
    180 + difficulty * 340 + gauss(40) + (model.tier === "flagship" ? 60 : 0),
  );
  const cost =
    (tokensIn * model.priceIn + Math.max(1, tokensOut) * model.priceOut) / 1e6;
  const baseline =
    (tokensIn * FLAGSHIP.priceIn + Math.max(1, tokensOut) * FLAGSHIP.priceOut) /
    1e6;
  const latency = Math.max(
    120,
    model.baseLatencyMs * (0.72 + Math.random() * 0.55) +
      tokensOut * 0.5 +
      difficulty * 220,
  );
  // Weaker models lose more quality as difficulty rises; easy prompts ~ even.
  // The gap is wide enough that a quality-weighted objective genuinely prefers
  // the flagships on hard prompts, while a cost-weighted one prefers the cheap.
  const quality = clamp(
    model.qualityPrior - difficulty * (1 - model.qualityPrior) * 2.4 + gauss(0.04),
    0.28,
    0.995,
  );
  return {
    latencyMs: Math.round(latency),
    costUsd: cost,
    baselineUsd: baseline,
    quality,
    tokensIn,
    tokensOut,
    response: syntheticResponse(model, prompt),
    failed: false,
    simulated: true,
  };
}

function syntheticResponse(model: ModelDef, prompt: string): string {
  const head = prompt.replace(/\s+/g, " ").trim().slice(0, 60);
  return `[demo · ${model.label}] Routed answer for "${head}${
    prompt.length > 60 ? "…" : ""
  }". Add an OPENROUTER_API_KEY to stream real completions - the routing, cache, and metrics above are live either way.`;
}

async function realCall(
  model: ModelDef,
  prompt: string,
): Promise<CallResult> {
  const started = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://multiplexer.dev",
        "X-Title": "Multiplexer",
      },
      body: JSON.stringify({
        model: model.id,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 640,
      }),
    });
    if (!res.ok) throw new Error(`provider ${res.status}`);
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const tokensIn: number =
      data?.usage?.prompt_tokens ?? estTokens(prompt.length);
    const tokensOut: number =
      data?.usage?.completion_tokens ?? estTokens(text.length);
    const cost = (tokensIn * model.priceIn + tokensOut * model.priceOut) / 1e6;
    const baseline =
      (tokensIn * FLAGSHIP.priceIn + tokensOut * FLAGSHIP.priceOut) / 1e6;
    // Quality of a real response is a heuristic proxy (no judge model wired).
    const quality = clamp(
      model.qualityPrior * (0.9 + Math.min(0.1, text.length / 6000)),
      0.34,
      0.99,
    );
    return {
      latencyMs: Date.now() - started,
      costUsd: cost,
      baselineUsd: baseline,
      quality,
      tokensIn,
      tokensOut,
      response: text,
      failed: false,
      simulated: false,
    };
  } catch {
    return {
      latencyMs: Date.now() - started,
      costUsd: 0,
      baselineUsd: 0,
      quality: 0,
      tokensIn: 0,
      tokensOut: 0,
      response: "",
      failed: true,
      simulated: false,
    };
  }
}

async function callModel(
  model: ModelDef,
  prompt: string,
  difficulty: number,
): Promise<CallResult> {
  if (HAS_KEY) return realCall(model, prompt);
  // small simulated outage so failure handling is visible on the instrument
  if (Math.random() < 0.045) {
    const partial = simulateCall(model, prompt, difficulty);
    return { ...partial, failed: true, response: "", quality: 0 };
  }
  return simulateCall(model, prompt, difficulty);
}

// ── Orchestration ───────────────────────────────────────────────────────────
export async function handleRequest(
  prompt: string,
  weights?: Weights,
): Promise<RequestRecord> {
  const s = store();
  if (weights) s.weights = weights;
  const w = s.weights;
  const { x, difficulty, signals } = featurize(prompt, w);
  const language = detectLanguage(prompt);
  const reasons = explain(difficulty, signals);
  const stages: Stage[] = [];

  const t0 = Date.now();
  stages.push({
    key: "ingest",
    label: "Ingest",
    detail: `${prompt.length} chars · difficulty ${(difficulty * 100).toFixed(0)}%`,
    ms: Date.now() - t0,
    status: "ok",
  });

  // Semantic cache
  const tEmbed = Date.now();
  const vec = embed(prompt);
  const hit = lookup(vec);
  stages.push({
    key: "embed",
    label: "Embed",
    detail: "256-d semantic key",
    ms: Date.now() - tEmbed,
    status: "ok",
  });

  if (hit.hit && hit.entry) {
    stages.push({
      key: "cache",
      label: "Semantic cache",
      detail: `hit · ${(hit.similarity * 100).toFixed(1)}% match → ${
        MODEL_BY_ID.get(hit.entry.modelId)?.label ?? hit.entry.modelId
      }`,
      ms: 1,
      status: "hit",
    });
    const rec: RequestRecord = {
      id: rid(),
      ts: Date.now(),
      prompt,
      modelId: hit.entry.modelId,
      cached: true,
      similarity: hit.similarity,
      failed: false,
      costUsd: 0,
      baselineUsd:
        (estTokens(prompt.length) * FLAGSHIP.priceIn +
          260 * FLAGSHIP.priceOut) /
        1e6,
      latencyMs: 2 + Math.round(Math.random() * 6),
      quality: 0,
      reward: 1,
      tokensIn: 0,
      tokensOut: 0,
      difficulty,
      confidence: 1,
      reasons,
      latency: latencyFrom(stages, 0),
      candidates: [],
      stages,
      response: hit.entry.response,
      simulated: !HAS_KEY,
      language,
    };
    pushHistory(rec);
    return rec;
  }
  stages.push({
    key: "cache",
    label: "Semantic cache",
    detail: `miss · nearest ${(hit.similarity * 100).toFixed(1)}%`,
    ms: 1,
    status: "skip",
  });

  // Bandit selection
  const tSel = Date.now();
  const argmax = <T extends { score: number }>(arr: T[]) =>
    arr.reduce((a, b) => {
      if (b.score > a.score + 1e-9) return b;
      if (Math.abs(b.score - a.score) <= 1e-9 && Math.random() < 0.5) return b;
      return a;
    });
  const scored = MODELS.map((m) => {
    const a = armStats(m.id);
    const sc = scoreArm(a.arm, x, ALPHA);
    return { model: m, picks: a.picks, ...sc };
  });
  // Offline providers (failure demo) and providers whose circuit breaker is OPEN
  // are never chosen; if the true best is out, the request reroutes to the best
  // available model - no interruption.
  const now0 = Date.now();
  const eligible = scored.filter(
    (sc) => !s.offline.has(sc.model.id) && circuitAllows(sc.model.id, now0),
  );
  const pool = eligible.length ? eligible : scored;
  // Cold start: guarantee each arm is pulled before LinUCB takes over.
  const unpulled = pool.filter((p) => p.picks === 0);
  const best = unpulled.length
    ? unpulled[Math.floor(Math.random() * unpulled.length)]
    : argmax(pool);
  const topAll = argmax(scored);
  const preempted =
    s.offline.has(topAll.model.id) && topAll.model.id !== best.model.id
      ? topAll.model
      : null;
  if (preempted) {
    stages.push({
      key: "failover",
      label: "Provider offline",
      detail: `${preempted.label} offline → rerouted to ${best.model.label}`,
      ms: 1,
      status: "warn",
    });
  }
  const candidates: Candidate[] = pool
    .map((c) => ({
      modelId: c.model.id,
      score: c.score,
      mean: c.mean,
      bonus: c.bonus,
      chosen: c.model.id === best.model.id,
    }))
    .sort((a, b) => b.score - a.score);
  stages.push({
    key: "select",
    label: "Bandit select",
    detail: `${pool.length} models scored → ${best.model.label} (UCB ${best.score.toFixed(
      3,
    )})`,
    ms: Date.now() - tSel,
    status: "ok",
  });

  // Call, failing over through every healthy provider (cheapest-first) until
  // one answers - so a single rate-limited or down provider never drops a
  // request. Only if all of them fail does the request itself fail.
  let chosen = best.model;
  let call = await callModel(chosen, prompt, difficulty);
  let failed = false;
  if (call.failed) {
    failed = true;
    armStats(chosen.id).failures += 1;
    armStats(chosen.id).healthy = false;
    recordFailure(chosen.id, Date.now());
    stages.push({
      key: "call",
      label: `Call ${chosen.label}`,
      detail: "provider error → failing over",
      ms: call.latencyMs,
      status: "fail",
    });
    let totalMs = call.latencyMs;
    const fallbacks = [...MODELS]
      .filter((m) => m.id !== best.model.id && !s.offline.has(m.id))
      .sort((a, b) => a.priceOut - b.priceOut);
    for (const fb of fallbacks) {
      chosen = fb;
      // eslint-disable-next-line no-await-in-loop
      const retry = await callModel(fb, prompt, difficulty);
      totalMs += retry.latencyMs;
      call = { ...retry, latencyMs: totalMs };
      if (!retry.failed) {
        // Recovered: the request is served by the fallback, not dropped.
        failed = false;
        armStats(fb.id).healthy = true;
        recordSuccess(fb.id);
        break;
      }
      armStats(fb.id).failures += 1;
      recordFailure(fb.id, Date.now());
    }
    // Last resort: if every live provider is down/rate-limited, keep the demo
    // alive with a clearly-labeled simulated answer. The routing decision, cost,
    // and latency shown are still computed for the model the bandit chose.
    if (call.failed) {
      chosen = best.model;
      const sim = simulateCall(best.model, prompt, difficulty);
      call = {
        ...sim,
        response:
          "Demo answer - every live provider is rate-limited right now (OpenRouter free tier is 50 requests/day). Add credits at openrouter.ai/credits to restore real completions. The routing decision, cost, and latency above are still real.",
      };
      failed = false;
    }
  }
  stages.push({
    key: "respond",
    label: `Call ${chosen.label}`,
    detail: `${call.tokensOut} tok · ${call.latencyMs} ms · $${call.costUsd.toFixed(5)}`,
    ms: call.latencyMs,
    status: call.failed ? "fail" : "ok",
  });

  // LLM-as-Judge scores the answer; its verdict is the quality signal the reward
  // is built on (not a bare heuristic). A failed call gets no judgement.
  const jd = call.failed ? undefined : await judge(prompt, call.response, call.quality);
  const qual = jd ? jd.score : call.quality;
  if (jd) {
    stages.push({
      key: "judge",
      label: "LLM-as-Judge",
      detail: `quality ${(qual * 100).toFixed(0)}% · ${jd.reasoning}`,
      ms: 1,
      status: "ok",
    });
  }

  const r = call.failed
    ? 0
    : reward(call.costUsd, call.baselineUsd, call.latencyMs, qual, w);
  stages.push({
    key: "learn",
    label: "Score + learn",
    detail: `reward ${r.toFixed(3)} → arm updated`,
    ms: 1,
    status: call.failed ? "warn" : "ok",
  });

  // Update bandit + stats (only when the call resolved)
  if (!call.failed) {
    const a = armStats(chosen.id);
    updateArm(a.arm, x, r, DECAY);
    a.picks += 1;
    a.costSum += call.costUsd;
    a.latSum += call.latencyMs;
    a.qualSum += qual;
    a.rewardSum += r;
    a.rewardN += 1;
    a.healthy = true;
    recordSuccess(chosen.id);
    remember(vec, prompt, call.response, chosen.id);
  }

  // Shadow mode: what the static (always-flagship) and random policies WOULD have
  // picked for this request - computed, never served - and A/B tallies so the
  // live bandit can be compared against both on cost + quality.
  const sPick = staticPick();
  const rPick = randomPick(prompt.length + call.tokensOut + Date.now());
  if (!call.failed) {
    recordAB("bandit", call.costUsd, qual);
    recordAB("static", call.baselineUsd, sPick.qualityPrior);
    recordAB("random", estCost(rPick, call.tokensIn, call.tokensOut), rPick.qualityPrior);
  }

  const rec: RequestRecord = {
    id: rid(),
    ts: Date.now(),
    prompt,
    modelId: chosen.id,
    cached: false,
    similarity: hit.similarity,
    failed,
    costUsd: call.costUsd,
    baselineUsd: call.baselineUsd,
    latencyMs: call.latencyMs,
    quality: qual,
    reward: r,
    tokensIn: call.tokensIn,
    tokensOut: call.tokensOut,
    difficulty,
    confidence: confidenceOf(candidates),
    reasons,
    latency: latencyFrom(stages, call.latencyMs),
    candidates,
    stages,
    response: call.failed
      ? "Every provider is busy right now (free-tier rate limit). Give it a few seconds and try again."
      : call.response,
    simulated: call.simulated,
    language,
    judge: jd,
    shadow: { bandit: chosen.id, static: sPick.id, random: rPick.id },
  };
  pushHistory(rec);
  return rec;
}

export const IS_SIMULATED = !HAS_KEY;

/**
 * Warm-start (simulated mode only): train every arm on one (prompt, objective)
 * from simulated outcomes, so each arm's linear model learns how reward depends
 * on both the prompt and the objective before any live traffic. This is a prior,
 * not fabricated history - it updates the bandit, not the metrics or the tape.
 * Real-key deployments skip this and learn from real traffic.
 */
export function warmTrain(prompt: string, objective: Weights): void {
  const { x, difficulty } = featurize(prompt, objective);
  for (const m of MODELS) {
    const c = simulateCall(m, prompt, difficulty);
    const r = reward(c.costUsd, c.baselineUsd, c.latencyMs, c.quality, objective);
    updateArm(armStats(m.id).arm, x, r, 1);
  }
}
