"use client";

import { useEffect, useRef } from "react";
import { usd, ms } from "@/lib/format";
import type { RequestRecord, Stage } from "@/lib/types";
import { ScoreBar } from "./StepCard";
import { model } from "./routing";

const DOT: Record<Stage["status"], string> = {
  ok: "bg-good",
  hit: "bg-acc",
  skip: "bg-mute",
  warn: "bg-warn",
  fail: "bg-bad",
};

export default function Inspector({
  record,
  onClose,
}: {
  record: RequestRecord | null;
  onClose: () => void;
}) {
  const open = !!record;
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  const r = record;
  const m = r ? model(r.modelId) : null;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-[rgba(5,7,10,0.6)] transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-title"
        inert={!open}
        className={`fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[520px] flex-col border-l border-line-2 bg-card transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ transitionTimingFunction: "var(--ease)" }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="inspector-title" className="text-base font-bold">Request inspector</h2>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </header>
        {r && m && (
          <div className="grid gap-5 overflow-y-auto px-5 pb-10 pt-5">
            <div>
              <p className="lead">Prompt</p>
              <p className="mt-1 text-[16px] font-medium leading-snug">“{r.prompt}”</p>
            </div>
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[13px] text-dim">
              {[
                ["Model", r.cached ? `Cache (${m.label})` : m.label],
                ["Cost", usd(r.costUsd)],
                ["Flagship cost", usd(r.baselineUsd)],
                ["Latency", ms(r.latencyMs)],
                ["Quality", r.quality.toFixed(2)],
                ["Reward", r.cached ? "–" : r.reward.toFixed(3)],
                ["Tokens in / out", `${r.tokensIn} / ${r.tokensOut}`],
                ["Similarity to cache", r.similarity.toFixed(2)],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>{k}</dt>
                  <dd className="num text-right text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            <div>
              <p className="lead mb-2.5">Lifecycle</p>
              <ol className="ml-1.5 grid border-l-2 border-line-2">
                {r.stages.map((s, i) => (
                  <li key={`${s.key}-${i}`} className="relative pb-3.5 pl-[18px] text-[13.5px] text-dim">
                    <span className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-card ${DOT[s.status]}`} />
                    <span className="flex justify-between gap-3">
                      <b className="font-semibold text-ink">{s.label}</b>
                      <span className="num text-xs text-mute">{ms(s.ms)}</span>
                    </span>
                    <span className="block">{s.detail}</span>
                  </li>
                ))}
              </ol>
            </div>

            {r.candidates.length > 0 && (
              <div>
                <p className="lead mb-2">Every model&apos;s score (track record plus try-it bonus)</p>
                <div className="grid gap-[7px]">
                  {r.candidates.map((c) => (
                    <div key={c.modelId} className={`grid grid-cols-[1fr_100px_40px] items-center gap-2.5 text-[13px] ${c.chosen ? "font-semibold text-ink" : "text-dim"}`}>
                      <span className="truncate">{model(c.modelId).label}</span>
                      <ScoreBar mean={c.mean} bonus={c.bonus} lead={c.chosen} />
                      <span className="num text-right text-xs">{c.score.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="lead mb-2">Answer {r.simulated && <span className="text-warn">(simulated)</span>}</p>
              <pre className="code">{r.response}</pre>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
