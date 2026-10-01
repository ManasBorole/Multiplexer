"use client";

import type { CircuitState, RequestRecord, Weights } from "@/lib/types";
import { usd, ms, pct } from "@/lib/format";
import {
  cacheThresholdOf,
  PRESETS,
  STEPS,
  chosenOf,
  failoverOf,
  featureVector,
  model,
  normWeights,
  tierShape,
} from "./routing";

export type StepActions = {
  busy: boolean;
  offline: string[];
  circuits: Record<string, CircuitState | undefined>;
  /** Re-send as-is (may come back from the cache). */
  onReroute: (prompt: string) => void;
  /** Re-route with these weights, skipping the cache. */
  onRerouteWith: (prompt: string, w: Weights) => void;
  onToggle: (modelId: string, off: boolean) => void;
};

export function Bar({ v, tone = "ink" }: { v: number; tone?: "ink" | "dim" | "acc" | "good" }) {
  return (
    <span className="track">
      <i className={`bar-${tone}`} style={{ transform: `scaleX(${Math.max(0, Math.min(1, v))})` }} />
    </span>
  );
}

export function ScoreBar({ mean, bonus, lead }: { mean: number; bonus: number; lead: boolean }) {
  return (
    <span className="track">
      <i className={lead ? "bar-acc" : "bar-dim"} style={{ transform: `scaleX(${mean})` }} />
      <i
        className={lead ? "bar-bonus" : "bar-bonus-dim"}
        style={{ transform: `translateX(${mean * 100}%) scaleX(${bonus})` }}
      />
    </span>
  );
}

const title = (i: number) => STEPS[i].name.replace(/^It /, "").replace(/^./, (c) => c.toUpperCase());

/**
 * One lifecycle step as a card. `interactive` is false on the tilted hero plane
 * (where the whole card is a jump link) and true in the story.
 */
export default function StepCard({
  i,
  record,
  weights,
  share,
  interactive,
  actions,
  focus,
}: {
  i: number;
  record: RequestRecord;
  weights: Weights;
  share: number | null;
  interactive: boolean;
  actions: StepActions;
  focus?: boolean;
}) {
  const r = record;
  const m = model(r.modelId);
  const sample = r.id === "sample";
  const tab = interactive ? 0 : -1;
  const skipped = r.cached && i >= 3 && i <= 6;

  let body: React.ReactNode;
  if (skipped) {
    body = (
      <>
        <span className="pill pill-acc">Skipped</span>
        <p className="lead">
          Answered from the cache at {r.similarity.toFixed(2)} similarity, so no model was called
          and it cost $0.
        </p>
        {i === 3 && (
          <button
            type="button"
            className="link"
            tabIndex={tab}
            disabled={actions.busy}
            onClick={() => actions.onRerouteWith(r.prompt, weights)}
          >
            Re-route without the cache
          </button>
        )}
      </>
    );
  } else if (i === 0) {
    const n = normWeights(weights);
    body = (
      <>
        <p className="text-base font-medium leading-snug">“{r.prompt}”</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="chip">{r.prompt.length} characters</span>
          {r.language && <span className="chip">{r.language}</span>}
          <span className="chip">Quality {pct(n.quality)}</span>
          <span className="chip">Cost {pct(n.cost)}</span>
          <span className="chip">Speed {pct(n.latency)}</span>
        </div>
      </>
    );
  } else if (i === 1) {
    const x = featureVector(r.prompt, weights);
    body = (
      <>
        <p className="lead">{r.reasons.join(", ")}.</p>
        <div className="grid gap-[7px]">
          {x.map((f) => (
            <div key={f.k} className="grid grid-cols-[88px_1fr_36px] items-center gap-2.5 text-[12.5px] text-dim">
              <span>{f.k}</span>
              <Bar v={f.v} tone={f.weight ? "acc" : "ink"} />
              <span className="num text-right text-xs text-ink">{f.v.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[13px] text-dim">
          <span>Estimated difficulty</span>
          <b className="num font-medium text-ink">{r.difficulty.toFixed(2)}</b>
        </div>
      </>
    );
  } else if (i === 2) {
    const hit = r.cached;
    body = (
      <>
        <p className="lead">Closest past prompt, {r.cacheMode === "lexical" ? "by wording" : "by meaning"}.</p>
        <div className="relative mt-1 h-[42px]" role="img" aria-label={`Similarity ${r.similarity.toFixed(2)}, a hit needs ${cacheThresholdOf(r)}`}>
          <span className="absolute inset-x-0 top-4 h-2 rounded-full bg-inset" />
          <span className="absolute bottom-0.5 top-1.5 w-0.5 bg-good" style={{ left: `${cacheThresholdOf(r) * 100}%` }}>
            <b className="num absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11.5px] font-semibold text-good">
              hit at {cacheThresholdOf(r)}
            </b>
          </span>
          <span
            className={`absolute top-3 -ml-2 h-4 w-4 rounded-full border-[3px] border-card ${hit ? "bg-good" : "bg-warn"}`}
            style={{ left: `${Math.min(r.similarity, 1) * 100}%` }}
          >
            <b className={`num absolute left-1/2 top-4 -translate-x-1/2 text-[11.5px] font-semibold ${hit ? "text-good" : "text-warn"}`}>
              {r.similarity.toFixed(2)}
            </b>
          </span>
        </div>
        {hit ? (
          <span className="pill pill-good">Hit: saved answer in {ms(r.latencyMs)}, $0</span>
        ) : (
          <span className="pill pill-warn">
            {r.similarity >= cacheThresholdOf(r) ? "Skipped: re-routed on purpose" : "No match, keep going"}
          </span>
        )}
        <button
          type="button"
          className="link"
          tabIndex={tab}
          disabled={actions.busy}
          onClick={() => actions.onReroute(r.prompt)}
        >
          {sample ? "Route this sample prompt for real" : hit ? "Send it again" : "Send it again to get a cache hit"}
        </button>
      </>
    );
  } else if (i === 3) {
    const pick = r.candidates.find((c) => c.chosen);
    const explored = !!pick && pick !== r.candidates[0];
    const top = pick && !r.candidates.slice(0, 6).includes(pick) ? [...r.candidates.slice(0, 5), pick] : r.candidates.slice(0, 6);
    body = (
      <>
        <div className="flex gap-3.5 text-[11.5px] text-mute">
          <span><i className="mr-1.5 inline-block h-[7px] w-3.5 rounded-full bg-acc align-middle" />track record</span>
          <span><i className="bar-bonus mr-1.5 inline-block h-[7px] w-3.5 rounded-full align-middle" />try-it bonus</span>
        </div>
        <div className="grid gap-[7px]">
          {top.map((c) => (
            <div key={c.modelId} className={`grid grid-cols-[1fr_96px_36px] items-center gap-2.5 text-[13px] ${c.chosen ? "font-semibold text-ink" : "text-dim"}`}>
              <span className="truncate">{model(c.modelId).label}</span>
              <ScoreBar mean={c.mean} bonus={c.bonus} lead={c.chosen} />
              <span className="num text-right text-xs">{c.score.toFixed(2)}</span>
            </div>
          ))}
        </div>
        {explored && pick && (
          <span className="pill pill-warn">Exploring: picked {model(pick.modelId).label} to learn how it does</span>
        )}
        <p className="lead">{r.candidates.length} models scored. Re-route this prompt with:</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Re-route with a preset">
          {PRESETS.map((p) => {
            const on = (["quality", "cost", "latency"] as const).every((k) => Math.abs(p.w[k] - weights[k]) < 0.005);
            return (
              <button
                key={p.name}
                type="button"
                tabIndex={tab}
                aria-pressed={on}
                disabled={actions.busy}
                onClick={() => actions.onRerouteWith(r.prompt, { ...p.w })}
                className={`rounded-sm border px-2.5 py-1 text-[12.5px] disabled:opacity-50 ${on ? "border-ink bg-ink text-bg" : "border-line-2 bg-inset text-dim hover:border-dim hover:text-ink"}`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
        <p className="lead">Re-routes skip the cache, so the new weights reach the scoring step.</p>
      </>
    );
  } else if (i === 4) {
    const ids = Array.from(
      new Set([
        ...Object.entries(actions.circuits).filter(([, c]) => c && c !== "closed").map(([k]) => k),
        ...actions.offline,
        r.modelId,
        ...r.candidates.slice(0, 3).map((c) => c.modelId),
      ]),
    ).slice(0, 5);
    const fo = failoverOf(r);
    body = (
      <>
        <div className="grid gap-[5px]">
          {ids.map((mid) => {
            const circ = actions.circuits[mid];
            const open = circ === "open";
            const off = actions.offline.includes(mid);
            return (
              <div
                key={mid}
                className={`flex items-center justify-between gap-2.5 rounded-[9px] py-1.5 pl-2.5 pr-2 text-[13px] ${open ? "bg-[var(--bad-soft)] text-bad" : "bg-inset text-dim"} ${off ? "opacity-60" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <i className={`h-2 w-2 flex-none rounded-full ${open ? "bg-bad" : off ? "bg-mute" : "bg-good"}`} />
                  <span className="truncate">{model(mid).label}</span>
                </span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  {open ? "circuit open" : circ === "half-open" ? "recovering" : off ? "switched off" : "healthy"}
                  <button
                    type="button"
                    role="switch"
                    className="switch"
                    tabIndex={tab}
                    aria-checked={!off}
                    aria-label={`${model(mid).label} online`}
                    onClick={() => actions.onToggle(mid, !off)}
                  />
                </span>
              </div>
            );
          })}
        </div>
        {fo ? (
          <span className="pill pill-warn">{fo.detail}</span>
        ) : (
          <p className="lead">Switch a provider off, then route again to watch the failover.</p>
        )}
      </>
    );
  } else if (i === 5) {
    const fo = failoverOf(r);
    body = (
      <>
        <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[13px] text-dim">
          <span>Model</span><b className="num text-right font-medium text-ink">{m.label}</b>
          <span>Provider</span><b className="num text-right font-medium text-ink">{m.provider} via OpenRouter</b>
          <span>Time</span><b className="num text-right font-medium text-ink">{ms(r.latencyMs)}</b>
        </div>
        <pre className="code max-h-[132px] overflow-hidden">{r.response.split("\n").slice(0, 6).join("\n")}</pre>
        {r.simulated && <span className="pill pill-warn">Simulated response</span>}
        {fo && <span className="pill pill-warn">{fo.detail}</span>}
      </>
    );
  } else if (i === 6) {
    const ratio = r.baselineUsd ? r.costUsd / r.baselineUsd : 0;
    body = (
      <>
        <div className="flex items-baseline gap-2.5">
          <b className="num text-[26px] font-semibold leading-none">{r.quality.toFixed(2)}</b>
          <span className="text-[13px] text-dim">quality, from the judge</span>
        </div>
        <div className="grid gap-1.5">
          <div className="grid grid-cols-[70px_1fr_76px] items-center gap-2.5 text-[12.5px] text-dim">
            <span>This call</span><Bar v={Math.max(0.02, ratio)} tone="acc" /><span className="num text-right text-xs text-ink">{usd(r.costUsd)}</span>
          </div>
          <div className="grid grid-cols-[70px_1fr_76px] items-center gap-2.5 text-[12.5px] text-dim">
            <span>Flagship</span><Bar v={1} tone="dim" /><span className="num text-right text-xs text-ink">{usd(r.baselineUsd)}</span>
          </div>
        </div>
        <div className="flex justify-between text-[13px] text-dim">
          <span>Saved vs flagship</span>
          <b className="num font-medium text-good">{pct(Math.max(0, 1 - ratio))}</b>
        </div>
        {r.judge && (
          <details className="text-[13px]">
            <summary className="link cursor-pointer" tabIndex={tab}>Judge&apos;s reasoning</summary>
            <p className="lead mt-1.5">{r.judge.reasoning}</p>
          </details>
        )}
      </>
    );
  } else {
    const c = chosenOf(r);
    body = r.cached ? (
      <>
        <span className="pill pill-acc">Nothing to update</span>
        <p className="lead">A cache hit calls no model, so no scores change. The router learns only from real calls.</p>
      </>
    ) : (
      <>
        <div className="flex justify-between text-[13px] text-dim">
          <span>Reward for this answer</span>
          <b className="num font-medium text-ink">{r.reward.toFixed(2)}</b>
        </div>
        {c && (
          <>
            <p className="lead">{m.label}&apos;s estimate and its uncertainty before this result:</p>
            <div className="relative h-[26px]" role="img" aria-label={`Estimate ${c.mean.toFixed(2)} plus or minus ${c.bonus.toFixed(2)}`}>
              <span className="absolute inset-x-0 top-3 h-0.5 bg-line-2" />
              <span
                className="absolute top-1.5 h-3.5 rounded-[9px] border border-acc bg-[var(--acc-soft)]"
                style={{ left: `${Math.max(0, c.mean - c.bonus) * 100}%`, width: `${Math.min(1, c.bonus * 2) * 100}%` }}
              />
              <span className="absolute top-[3px] h-5 w-0.5 bg-ink" style={{ left: `${c.mean * 100}%` }} />
            </div>
            <p className="lead">This result narrows that band, so the next similar prompt is decided with more confidence.</p>
          </>
        )}
        {share !== null && (
          <div className="flex justify-between text-[13px] text-dim">
            <span>{m.label}&apos;s share of your traffic</span>
            <b className="num font-medium text-ink">{pct(share)}</b>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="step-card" data-focus={focus ? "true" : undefined} data-tilt={interactive ? "" : undefined}>
      <div className="flex items-center justify-between gap-2.5">
        <span className="flex items-center gap-2 text-[15.5px] font-bold tracking-[-0.01em]">
          {i === 5 && !skipped && <i className={`${tierShape(m)} shape-on`} />}
          {title(i)}
        </span>
        <span className="num rounded-[7px] border border-line-2 px-[7px] py-0.5 text-xs font-semibold text-mute">
          {i + 1}
        </span>
      </div>
      {body}
    </div>
  );
}
