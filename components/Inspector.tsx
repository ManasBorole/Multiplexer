"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { MODEL_BY_ID } from "@/lib/models";
import { usd, ms, pct } from "@/lib/format";
import { XIcon } from "./icons";
import type { RequestRecord } from "@/lib/types";

export default function Inspector({
  record,
  onClose,
}: {
  record: RequestRecord | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const m = record ? MODEL_BY_ID.get(record.modelId) : null;

  return (
    <AnimatePresence>
      {record && m && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[30rem] flex-col border-l border-border bg-surface shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
              <div>
                <div className="eyebrow">Request Inspector</div>
                <div className="mt-0.5 truncate font-display text-base font-bold text-ink">
                  {record.prompt.slice(0, 42)}
                  {record.prompt.length > 42 ? "…" : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-soft border border-border-soft text-ink-3 transition-colors hover:border-border hover:text-ink"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <ol className="relative space-y-0">
                <Step first label="User prompt">
                  <p className="text-[14px] leading-relaxed text-ink-2">{record.prompt}</p>
                </Step>

                <Step label="Feature extraction">
                  <div className="flex flex-wrap gap-1.5">
                    {record.reasons.map((r) => (
                      <span key={r} className="chip !py-0.5 !text-[12px]">{r}</span>
                    ))}
                  </div>
                </Step>

                <Step label="Complexity score">
                  <Meter value={record.difficulty} color="#FFC24B" text={pct(record.difficulty)} />
                </Step>

                <Step label="Candidate models">
                  <div className="space-y-1.5">
                    {record.candidates.map((c) => {
                      const cm = MODEL_BY_ID.get(c.modelId);
                      return (
                        <div key={c.modelId} className="flex items-center gap-2 text-[13px]">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cm?.color }} />
                          <span className={c.chosen ? "font-semibold text-ink" : "text-ink-3"}>
                            {cm?.label ?? c.modelId}
                          </span>
                          <span className="tnum ml-auto font-mono text-ink-3">
                            {c.score.toFixed(2)}
                          </span>
                          {c.chosen && <span className="text-mint">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </Step>

                <Step label={record.cached ? "Cache hit" : "Cache miss"}>
                  <p className="text-[13px] text-ink-3">
                    {record.cached
                      ? `${pct(record.similarity)} match - served from cache`
                      : `nearest ${pct(record.similarity)} - routed to a model`}
                  </p>
                </Step>

                <Step label={`Provider response · ${m.label}`}>
                  <div className="flex gap-4 text-[13px]">
                    <span className="text-ink-3">
                      Latency <span className="tnum font-mono text-ink">{ms(record.latencyMs)}</span>
                    </span>
                    <span className="text-ink-3">
                      Tokens <span className="tnum font-mono text-ink">{record.tokensOut || "-"}</span>
                    </span>
                  </div>
                </Step>

                <Step label="Estimated cost">
                  <span className="tnum font-mono text-base font-bold text-mint">
                    {record.cached ? "$0" : usd(record.costUsd, 5)}
                  </span>
                </Step>

                <Step last label="Final answer">
                  <div className="whitespace-pre-wrap rounded-soft border border-border-soft bg-bg/60 p-3 text-[13px] leading-relaxed text-ink-2">
                    {record.response}
                  </div>
                </Step>
              </ol>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Step({
  label,
  children,
  first,
  last,
}: {
  label: string;
  children: React.ReactNode;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <li className="flex gap-3.5">
      <div className="flex flex-col items-center">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${first ? "bg-coral" : "bg-surface-3 ring-1 ring-border"}`}
        />
        {!last && <span className="my-1 w-px flex-1 bg-border" />}
      </div>
      <div className={`flex-1 ${last ? "" : "pb-5"}`}>
        <div className="eyebrow mb-1.5">{label}</div>
        {children}
      </div>
    </li>
  );
}

function Meter({ value, color, text }: { value: number; color: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-3">
        <motion.div
          className="h-full rounded-pill"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <span className="tnum font-mono text-[13px] text-ink-2">{text}</span>
    </div>
  );
}
