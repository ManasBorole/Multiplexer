"use client";

import { motion } from "framer-motion";
import { TargetIcon, RouteIcon } from "./icons";
import type { Weights } from "@/lib/types";

// Configurable reward function + Pareto preference. Three weights define the
// joint objective the bandit optimizes; they're part of the context vector, so
// dragging them re-steers routing. "Re-route" replays the last prompt so the
// effect is visible immediately.

const CH: { key: keyof Weights; label: string; color: string }[] = [
  { key: "quality", label: "Quality", color: "#A78BFA" },
  { key: "cost", label: "Cost", color: "#3FE0A0" },
  { key: "latency", label: "Latency", color: "#5CC8FF" },
];

const PRESETS: { name: string; w: Weights }[] = [
  { name: "Balanced", w: { quality: 0.5, cost: 0.3, latency: 0.2 } },
  { name: "Best quality", w: { quality: 0.85, cost: 0.1, latency: 0.05 } },
  { name: "Cheapest", w: { quality: 0.15, cost: 0.75, latency: 0.1 } },
  { name: "Fastest", w: { quality: 0.2, cost: 0.2, latency: 0.6 } },
];

export default function RewardControls({
  weights,
  onChange,
  onReroute,
  canReroute,
  busy,
}: {
  weights: Weights;
  onChange: (w: Weights) => void;
  onReroute: () => void;
  canReroute: boolean;
  busy: boolean;
}) {
  const sum = weights.quality + weights.cost + weights.latency || 1;
  const pct = (k: keyof Weights) => Math.round((weights[k] / sum) * 100);

  return (
    <div className="mx-auto mt-4 w-full max-w-2xl">
      <div className="card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-ink-2">
            <TargetIcon size={15} className="text-coral" />
            <span className="eyebrow !text-ink-2">Reward function · Pareto preference</span>
          </div>
          <button
            type="button"
            onClick={onReroute}
            disabled={!canReroute || busy}
            className="inline-flex items-center gap-1.5 rounded-pill border border-border-soft bg-surface-2/60 px-3 py-1 text-[12px] font-medium text-ink-2 transition-colors hover:border-coral/40 hover:text-ink disabled:opacity-40"
            title="Replay the last prompt with these weights"
          >
            <RouteIcon size={13} /> Re-route
          </button>
        </div>

        <div className="space-y-3">
          {CH.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-[13px] text-ink-2">{c.label}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(weights[c.key] * 100)}
                onChange={(e) =>
                  onChange({ ...weights, [c.key]: Number(e.target.value) / 100 })
                }
                className="mux-range h-1.5 flex-1"
                style={{ accentColor: c.color }}
                aria-label={`${c.label} weight`}
              />
              <span
                className="tnum w-10 shrink-0 text-right font-mono text-[13px] font-semibold"
                style={{ color: c.color }}
              >
                {pct(c.key)}%
              </span>
            </div>
          ))}
        </div>

        {/* Pareto bar - the current cost↔quality↔latency blend at a glance */}
        <div className="mt-4 flex h-2 overflow-hidden rounded-pill">
          {CH.map((c) => (
            <motion.div
              key={c.key}
              className="h-full"
              style={{ backgroundColor: c.color }}
              animate={{ width: `${pct(c.key)}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => onChange(p.w)}
              className="rounded-pill border border-border-soft bg-surface/60 px-2.5 py-1 text-[12px] text-ink-3 transition-colors hover:border-coral/40 hover:text-ink-2"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
