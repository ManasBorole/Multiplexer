"use client";

import dynamic from "next/dynamic";
import type { Weights } from "@/lib/types";
import { PRESETS, SUGGESTIONS, normWeights } from "./routing";
import type { PlaneProps } from "./CardPlane";

// The tilted card plane is decoration-with-data; load it after first paint.
const CardPlane = dynamic(() => import("./CardPlane"), {
  ssr: false,
  loading: () => (
    <div className="plane-scene min-h-[380px]" aria-hidden="true">
      <div
        className="skeleton absolute left-1/2 top-1/2 h-[46%] w-[86%]"
        style={{ transform: "translate(-50%,-50%) rotateX(54deg) rotateZ(-34deg)" }}
      />
    </div>
  ),
});

const SLIDERS: { key: keyof Weights; label: string }[] = [
  { key: "quality", label: "Quality" },
  { key: "cost", label: "Cost" },
  { key: "latency", label: "Speed" },
];

export default function Hero({
  prompt,
  setPrompt,
  onSubmit,
  busy,
  weights,
  setWeights,
  plane,
  status,
  outcome,
  leadWithWalk,
  onWalk,
  onResults,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  weights: Weights;
  setWeights: (w: Weights) => void;
  plane: PlaneProps;
  status: string;
  outcome: { tone: "ok" | "bad"; text: string } | null;
  leadWithWalk: boolean;
  onWalk: () => void;
  onResults: () => void;
}) {
  const n = normWeights(weights);
  const same = (a: Weights, b: Weights) =>
    (["quality", "cost", "latency"] as const).every((k) => Math.abs(a[k] - b[k]) < 0.005);

  return (
    <section
      id="try"
      className="relative grid min-h-[100svh] grid-cols-1 gap-6 overflow-clip px-4 pb-8 pt-[84px] min-[1001px]:grid-cols-[minmax(0,500px)_1fr] min-[1001px]:pl-10 min-[1001px]:pr-6 min-[1001px]:pt-[92px]"
      style={{ background: "radial-gradient(90% 70% at 75% 45%, var(--bg-2), var(--bg) 70%)" }}
    >
      <div className="relative z-10 flex min-w-0 flex-col justify-center gap-[18px]">
        <h1 className="font-display text-[clamp(2.1rem,3.9vw,3.25rem)] font-extrabold leading-[1.03] tracking-[-0.035em]">
          Send a prompt. Multiplexer picks the best model for it.
        </h1>
        <p className="max-w-[44ch] text-base text-dim">
          It weighs quality, cost and speed for every request, learns from each answer, and shows
          you every decision it makes.
        </p>

        <form
          className="flex gap-2 rounded-[14px] border border-line-2 bg-card p-[7px] shadow-[var(--shadow)] focus-within:border-acc"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <label htmlFor="prompt" className="sr-only">Your prompt</label>
          <input
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={4000}
            autoComplete="off"
            placeholder="Ask anything, for example: explain the CAP theorem simply"
            className="min-w-0 flex-1 bg-transparent px-2.5 py-2.5 text-[15px] placeholder:text-mute focus-visible:outline-none"
          />
          <button className="btn" type="submit" disabled={busy || !prompt.trim()}>
            {busy ? "Routing…" : "Route this prompt"}
          </button>
        </form>

        <div aria-live="polite" className="min-h-[1.25rem]">
          {status && <p className="text-[13px] text-acc">{status}</p>}
          {outcome && (
            <div className="reveal grid gap-3 rounded-[14px] border border-line bg-card px-4 py-3.5">
              <p className={`text-[14.5px] ${outcome.tone === "bad" ? "text-bad" : "text-ink"}`}>{outcome.text}</p>
              <div className="flex flex-wrap gap-2">
                {outcome.tone === "bad" ? (
                  <button type="button" className="btn btn-sm" onClick={onResults}>See what happened</button>
                ) : leadWithWalk ? (
                  <>
                    <button type="button" className="btn btn-sm" onClick={onWalk}>Walk me through it</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onResults}>Jump to results</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-sm" onClick={onResults}>Jump to results</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onWalk}>Walk me through it</button>
                  </>
                )}
              </div>
              {outcome.tone === "ok" && leadWithWalk && (
                <p className="flex items-center gap-2 text-[13px] text-mute">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M7 2v9M3 7.5 7 11.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Or just scroll: your request travels through all 8 steps.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5" aria-label="Example prompts">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              className="rounded-full border border-line px-[11px] py-[5px] text-[12.5px] text-dim hover:border-line-2 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>

        <fieldset className="grid gap-2.5 rounded-[14px] border border-line bg-card px-4 py-3.5">
          <legend className="sr-only">What matters most</legend>
          <div className="flex items-center justify-between gap-2.5">
            <h2 className="text-sm font-bold">What matters most?</h2>
            <span className="text-[12.5px] text-mute">Changes which model wins</span>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Presets">
            {PRESETS.map((p) => {
              const on = same(p.w, weights);
              return (
                <button
                  key={p.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setWeights({ ...p.w })}
                  className={`rounded-sm border px-2.5 py-[5px] text-[12.5px] ${on ? "border-ink bg-ink text-bg" : "border-line-2 bg-inset text-dim hover:text-ink"}`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          {SLIDERS.map((s) => (
            <label key={s.key} htmlFor={`w-${s.key}`} className="grid grid-cols-[62px_1fr_40px] items-center gap-2.5 text-[13px] text-dim">
              <span>{s.label}</span>
              <input
                id={`w-${s.key}`}
                type="range"
                min={0}
                max={100}
                value={Math.round(weights[s.key] * 100)}
                onChange={(e) => setWeights({ ...weights, [s.key]: Number(e.target.value) / 100 })}
                className="range"
                aria-valuetext={`${s.label} ${Math.round(n[s.key] * 100)} percent of the objective`}
              />
              <output className="num text-right text-[12.5px] text-ink">{Math.round(n[s.key] * 100)}%</output>
            </label>
          ))}
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
            <i className="block bg-ink" style={{ flex: weights.quality }} />
            <i className="block bg-good" style={{ flex: weights.cost }} />
            <i className="block bg-acc" style={{ flex: weights.latency }} />
          </div>
        </fieldset>

        <p className="text-[13px] text-mute">Or scroll to watch a request get routed, step by step.</p>
      </div>

      <CardPlane {...plane} />
    </section>
  );
}
