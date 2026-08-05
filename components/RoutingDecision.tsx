"use client";

import { motion } from "framer-motion";
import { MODEL_BY_ID, costTier } from "@/lib/models";
import type { RequestRecord } from "@/lib/types";
import { CheckIcon, RouteIcon } from "./icons";
import { AnimatedNumber } from "./motion";

export default function RoutingDecision({ record }: { record: RequestRecord }) {
  const model = MODEL_BY_ID.get(record.modelId);
  if (!model) return null;
  const alts = record.candidates.filter((c) => !c.chosen).slice(0, 6);
  const confPct = Math.round(record.confidence * 100);

  return (
    <SectionCard
      icon={<RouteIcon size={16} />}
      label="Routing Decision"
      accent={model.color}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow mb-1.5">Selected model</div>
          <div className="flex items-center gap-2.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: model.color, boxShadow: `0 0 12px ${model.color}` }}
            />
            <span className="font-display text-2xl font-bold tracking-tightish text-ink">
              {model.label}
            </span>
          </div>
          <div className="mt-1 text-[13px] text-ink-3">{model.provider}</div>
        </div>
        <ConfidenceRing pct={confPct} color={model.color} />
      </div>

      {/* why */}
      <div className="mt-5">
        <div className="eyebrow mb-2.5">Why?</div>
        <div className="flex flex-wrap gap-2">
          {record.reasons.map((r, i) => (
            <motion.span
              key={r}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="inline-flex items-center gap-1.5 rounded-pill border border-mint/25 bg-mint/8 px-3 py-1.5 text-[13px] text-ink-2"
            >
              <CheckIcon size={13} className="text-mint" />
              {r}
            </motion.span>
          ))}
        </div>
      </div>

      {/* alternatives */}
      {alts.length > 0 && (
        <div className="mt-5 border-t border-border-soft pt-4">
          <div className="eyebrow mb-3">Alternatives considered</div>
          <div className="space-y-2.5">
            {alts.map((c, i) => {
              const m = MODEL_BY_ID.get(c.modelId);
              if (!m) return null;
              // The bandit's predicted reward for THIS prompt - varies per request,
              // unlike the model's static quality prior.
              const quality = Math.round(Math.max(0, Math.min(1, c.mean)) * 100);
              return (
                <motion.div
                  key={c.modelId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="w-32 shrink-0 truncate text-[13px] text-ink-2">
                    {m.label}
                  </span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-3">
                      <motion.div
                        className="h-full rounded-pill"
                        style={{ backgroundColor: m.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${quality}%` }}
                        transition={{ delay: 0.3 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <span className="tnum w-8 shrink-0 text-right font-mono text-[12px] text-ink-3">
                      {quality}
                    </span>
                  </div>
                  <span
                    className="w-9 shrink-0 text-right font-mono text-[13px] font-semibold"
                    style={{ color: m.color }}
                    title={`~$${m.priceOut}/1M out`}
                  >
                    {costTier(m.priceOut)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function ConfidenceRing({ pct, color }: { pct: number; color: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#30273D" strokeWidth="6" />
        <motion.circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="tnum font-mono text-lg font-bold text-ink">
          <AnimatedNumber value={pct} />
        </span>
        <span className="-mt-1 text-[9px] uppercase tracking-wide text-ink-4">conf</span>
      </div>
    </div>
  );
}

export function SectionCard({
  icon,
  label,
  accent,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-soft"
          style={{
            backgroundColor: accent ? `${accent}18` : "#30273D",
            color: accent ?? "#C3B7D2",
          }}
        >
          {icon}
        </span>
        <h3 className="font-display text-[15px] font-bold tracking-tightish text-ink">
          {label}
        </h3>
      </div>
      {children}
    </div>
  );
}
