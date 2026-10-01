"use client";

import { useState } from "react";
import type { RequestRecord } from "@/lib/types";
import { usd, ms, pct } from "@/lib/format";
import { Bar } from "./StepCard";
import Num from "./Num";
import { CACHE_THRESHOLD, STEPS, failoverOf, featureVector, model, tierPrice, tierShape } from "./routing";
import type { Weights } from "@/lib/types";

export type RunError = { title: string; detail: string };
export type StepState = "todo" | "run" | "ok" | "skip" | "fail";

const SHORT = ["Received", "Read", "Cache", "Score", "Health", "Call model", "Grade", "Learn"];

function Ring({ v }: { v: number }) {
  const C = 2 * Math.PI * 27;
  return (
    <div className="relative h-16 w-16 flex-none" role="img" aria-label={`Confidence ${pct(v)}`}>
      <svg width="64" height="64" className="-rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r="27" fill="none" stroke="var(--line-2)" strokeWidth="6" />
        <circle
          cx="32" cy="32" r="27" fill="none" stroke="var(--acc)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - v)}
          style={{ transition: "stroke-dashoffset .6s var(--ease)" }}
        />
      </svg>
      <b className="num absolute inset-0 grid place-items-center text-[15px] font-semibold">{pct(v)}</b>
    </div>
  );
}

export function Pipeline({ states }: { states: StepState[] }) {
  return (
    <ol className="pipe" aria-label="Routing progress">
      {states.map((s, i) => (
        <li key={SHORT[i]} data-s={s} className="list-none">
          <b>{s === "ok" ? "✓" : s === "fail" ? "✕" : i + 1}</b>
          {SHORT[i]}
          <span className="sr-only">
            {STEPS[i].name}: {s === "ok" ? "done" : s === "run" ? "in progress" : s === "skip" ? "skipped" : s === "fail" ? "failed" : "waiting"}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Model answers are markdown-ish: render fenced code as code, the rest as text. */
function Answer({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text.trim()) {
    return (
      <p className="lead">
        The model returned an empty answer. This happens on free-tier providers; use Re-route to try again.
      </p>
    );
  }
  const long = text.length > 900;
  const fenced = text.includes("```");
  const parts = fenced ? text.split(/```[\w+-]*\n?/) : [text];
  const bare = !fenced && /\n/.test(text) && /^(def |class |function |import |const |SELECT )/m.test(text);
  return (
    <div className="reveal grid gap-2">
      <div className={`relative grid gap-3 ${long && !open ? "max-h-[420px] overflow-hidden" : ""}`}>
        {bare ? (
          <pre className="code text-[13px]">{text}</pre>
        ) : (
          parts.map((p, i) =>
            i % 2 ? (
              <pre key={i} className="code text-[13px]">{p.replace(/\n$/, "")}</pre>
            ) : p.trim() ? (
              <p key={i} className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {p.trim().split(/\*\*(.+?)\*\*/g).map((t, j) => (j % 2 ? <strong key={j} className="font-semibold">{t}</strong> : t))}
              </p>
            ) : null,
          )
        )}
        {long && !open && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(transparent,var(--card))]" />
        )}
      </div>
      {long && (
        <button type="button" className="link justify-self-start" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Show less" : "Show the full answer"}
        </button>
      )}
    </div>
  );
}

export default function Results({
  latest,
  weights,
  states,
  running,
  streamText,
  error,
  onReroute,
  onReplay,
  onInspect,
  onRetry,
  onWrite,
  ready,
}: {
  ready: boolean;
  latest: RequestRecord | null;
  weights: Weights;
  states: StepState[];
  running: boolean;
  streamText: string;
  error: RunError | null;
  onReroute: () => void;
  onReplay: () => void;
  onInspect: (id: string) => void;
  onRetry: () => void;
  onWrite: () => void;
}) {
  const r = latest;
  const status = running
    ? `Routing: ${STEPS[Math.max(0, states.findIndex((s) => s === "run"))].name.toLowerCase()}.`
    : error
      ? error.title
      : r
        ? `Routed to ${r.cached ? "the cache" : model(r.modelId).label}.`
        : "";

  return (
    <section id="results" aria-labelledby="results-title" className="relative z-[3] border-t border-line bg-bg px-4 pb-10 pt-16 min-[1001px]:px-6">
      <div className="mx-auto grid max-w-[1200px] gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="results-title" className="font-display text-[1.75rem] font-bold leading-tight tracking-[-0.025em]">
              {running ? "Routing your prompt" : "Your results"}
            </h2>
            <p className="mt-1.5 max-w-[70ch] truncate text-[14.5px] text-dim">
              {r && !running ? `“${r.prompt}”` : running ? "Watching it move through the pipeline." : "Nothing routed yet this session."}
            </p>
            <p className="sr-only" aria-live="polite">{status}</p>
          </div>
          {r && !running && (
            <div className="flex flex-wrap gap-1.5">
              <button className="btn btn-ghost btn-sm" type="button" onClick={onReroute} title="Skips the cache so your current weights reach the scoring step">Re-route with current weights</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={onWrite}>New prompt</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={onReplay}>Replay step by step</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => onInspect(r.id)}>Open inspector</button>
            </div>
          )}
        </div>

        {(running || r || error) && <Pipeline states={states} />}

        {error && !running && (
          <div role="alert" className="grid gap-2 rounded-lg border border-[var(--bad)] bg-[var(--bad-soft)] px-4 py-3.5">
            <b className="text-bad">{error.title}</b>
            <p className="text-[14px] text-ink">{error.detail}</p>
            <button className="btn btn-ghost btn-sm justify-self-start" type="button" onClick={onRetry}>Try again</button>
          </div>
        )}

        {!ready && (
          <div aria-hidden="true" className="grid gap-5">
            <div className="skeleton h-[52px]" />
            <div className="grid gap-5 min-[1001px]:grid-cols-[1.55fr_1fr]">
              <div className="skeleton h-[280px]" />
              <div className="skeleton h-[280px]" />
            </div>
          </div>
        )}

        {ready && !r && !running && !error && (
          <div className="grid justify-items-center gap-2.5 rounded-lg border border-dashed border-line-2 p-7 text-center text-dim">
            <b className="text-ink">Send a prompt to see its routing decision here.</b>
            <span>Try an example prompt at the top, then change what matters most and route it again.</span>
            <button className="btn mt-1" type="button" onClick={onWrite}>Write a prompt</button>
          </div>
        )}

        {running && (
          <div className="panel" aria-busy="true">
            <p className="panel-title">Answer <small>streaming</small></p>
            {streamText ? (
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {streamText}
                <span className="caret" aria-hidden="true" />
              </p>
            ) : (
              <p className="lead">Waiting for the first words from the model…</p>
            )}
          </div>
        )}

        {r && !running && <Detail r={r} weights={weights} />}
      </div>
    </section>
  );
}

function Detail({ r, weights }: { r: RequestRecord; weights: Weights }) {
  const m = model(r.modelId);
  const fo = failoverOf(r);
  const alts = r.candidates.filter((c) => !c.chosen).slice(0, 4);
  const ratio = r.baselineUsd ? r.costUsd / r.baselineUsd : 0;
  const L = r.latency;
  return (
    <>
      <div className="grid gap-5 min-[1001px]:grid-cols-[1.55fr_1fr]">
        <div className="panel">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`pill ${r.cached ? "pill-acc" : "pill-mute"}`}>
              <i className={`${tierShape(m)} ${r.cached ? "" : "shape-on"}`} />
              {r.cached ? `From cache (first answered by ${m.label})` : m.label}
            </span>
            {r.simulated && <span className="pill pill-warn">Simulated response: no API key on this deployment</span>}
            {r.failed && <span className="pill pill-bad">Every provider failed</span>}
          </div>
          <Answer key={r.id} text={r.response} />
        </div>

        <div className="panel">
          <h3 className="panel-title">Routing decision <small>{r.cached ? "cache hit" : "LinUCB"}</small></h3>
          <div className="flex items-center gap-3.5">
            <Ring v={r.confidence} />
            <div className="min-w-0">
              <b className="text-[17px]">{m.label}</b>
              <p className="lead">{m.provider}, {tierPrice(m)} tier, {r.cached ? "answer reused" : `confidence ${pct(r.confidence)}`}</p>
            </div>
          </div>
          {fo && <span className="pill pill-warn">Failover: {fo.detail}</span>}
          <div>
            <p className="lead mb-1.5">Why this model</p>
            <ul className="grid gap-1.5">
              {r.reasons.map((x) => (
                <li key={x} className="relative pl-4 text-[13.5px] text-dim before:absolute before:left-0 before:top-2 before:h-[7px] before:w-[7px] before:rounded-[2px] before:bg-good">{x}</li>
              ))}
            </ul>
          </div>
          {!r.cached && alts.length > 0 && (
            <div>
              <p className="lead mb-2">Alternatives considered</p>
              <div className="grid gap-1.5">
                {alts.map((c) => {
                  const a = model(c.modelId);
                  return (
                    <div key={c.modelId} className="grid grid-cols-[1fr_64px_38px_30px] items-center gap-2.5 text-[13px] text-dim">
                      <span className="flex min-w-0 items-center gap-2"><i className={tierShape(a)} /><span className="truncate">{a.label}</span></span>
                      <Bar v={c.score} tone="dim" />
                      <span className="num text-right text-xs">{c.score.toFixed(2)}</span>
                      <span className="num text-right text-xs text-mute">{tierPrice(a)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="strip grid-cols-4">
        <div>
          <h4 className="text-[13.5px] font-semibold text-dim">Cost</h4>
          <Num className="num text-[26px] font-semibold leading-none" value={r.costUsd} format={(v) => usd(v)} />
          <p className="lead">Flagship: {usd(r.baselineUsd)}. <span className="text-good">Saved {pct(Math.max(0, 1 - ratio))}</span></p>
        </div>
        <div>
          <h4 className="text-[13.5px] font-semibold text-dim">Latency</h4>
          <Num className="num text-[26px] font-semibold leading-none" value={r.latencyMs} format={(v) => ms(v)} />
          {r.cached ? (
            <p className="lead">Served from cache</p>
          ) : (
            <>
              <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                <i className="block bg-warn" style={{ flex: Math.max(L.featureMs, 1) }} />
                <i className="block bg-acc" style={{ flex: Math.max(L.banditMs, 1) }} />
                <i className="block bg-ink" style={{ flex: Math.max(L.providerMs, 1) }} />
              </div>
              <p className="lead">Features {ms(L.featureMs)}, routing {ms(L.banditMs)}, model {ms(L.providerMs)}</p>
            </>
          )}
        </div>
        <div>
          <h4 className="text-[13.5px] font-semibold text-dim">Semantic cache</h4>
          <Num className="num text-[26px] font-semibold leading-none" value={r.similarity} format={(v) => v.toFixed(2)} />
          <span className={`pill ${r.cached ? "pill-good" : "pill-warn"}`}>{r.cached ? "Hit, $0" : `Miss, hit needs ${CACHE_THRESHOLD}`}</span>
        </div>
        <div>
          <h4 className="text-[13.5px] font-semibold text-dim">Judge</h4>
          {r.cached ? (
            <b className="num text-[26px] font-semibold leading-none">–</b>
          ) : (
            <Num className="num text-[26px] font-semibold leading-none" value={r.quality} format={(v) => v.toFixed(2)} />
          )}
          <p className="lead">{r.cached ? "Not re-graded: the answer was reused from the cache." : (r.judge?.reasoning ?? "Quality estimate for this answer.")}</p>
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">Prompt signals <small>what the router read, difficulty {r.difficulty.toFixed(2)}</small></h3>
        <div className="grid gap-x-7 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {featureVector(r.prompt, weights).map((f) => (
            <div key={f.k} className="grid grid-cols-[84px_1fr_36px] items-center gap-2.5 text-[12.5px] text-dim">
              <span>{f.k}</span>
              <Bar v={f.v} tone={f.weight ? "acc" : "ink"} />
              <span className="num text-right text-xs text-ink">{f.v.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
