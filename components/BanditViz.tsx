"use client";

import { motion } from "framer-motion";
import { SectionCard } from "./RoutingDecision";
import { MODEL_BY_ID } from "@/lib/models";
import { AnimatedNumber } from "./motion";
import { BrainIcon } from "./icons";
import type { FleetStat } from "@/lib/types";

export default function BanditViz({
  fleet,
  exploration,
}: {
  fleet: FleetStat[];
  exploration: number;
}) {
  const explore = Math.round(exploration * 100);
  const exploit = 100 - explore;
  const ranked = [...fleet].sort((a, b) => b.share - a.share);

  return (
    <SectionCard icon={<BrainIcon size={16} />} label="Bandit - Learning to Route" accent="#A78BFA">
      {/* explore vs exploit */}
      <div className="mb-5">
        <div className="mb-2 flex justify-between text-[13px]">
          <span className="text-violet">Exploration {explore}%</span>
          <span className="text-coral">Exploitation {exploit}%</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-pill bg-surface-3">
          <motion.div
            className="h-full bg-violet"
            animate={{ width: `${explore}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="h-full bg-coral"
            animate={{ width: `${exploit}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* per-model share, moving */}
      <div className="eyebrow mb-2.5">Traffic share (moves as it learns)</div>
      <div className="space-y-2.5">
        {ranked.map((f) => {
          const m = MODEL_BY_ID.get(f.modelId);
          if (!m) return null;
          const share = Math.round(f.share * 100);
          return (
            <div key={f.modelId} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-[13px] text-ink-2">
                {m.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-3">
                <motion.div
                  className="h-full rounded-pill"
                  style={{ backgroundColor: m.color }}
                  animate={{ width: `${Math.max(2, share)}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="tnum w-9 shrink-0 text-right font-mono text-[13px] text-ink-2">
                <AnimatedNumber value={share} format={(v) => `${Math.round(v)}%`} />
              </span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
