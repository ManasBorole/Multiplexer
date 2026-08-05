"use client";

import { motion } from "framer-motion";
import { SectionCard } from "./RoutingDecision";
import { MODEL_BY_ID } from "@/lib/models";
import { AnimatedNumber } from "./motion";
import { ChartIcon } from "./icons";
import type { FleetStat } from "@/lib/types";

export default function ProviderTimeline({ fleet }: { fleet: FleetStat[] }) {
  const ranked = [...fleet].sort((a, b) => b.picks - a.picks);
  const max = Math.max(1, ...ranked.map((f) => f.picks));

  return (
    <SectionCard icon={<ChartIcon size={16} />} label="Provider Distribution" accent="#5CC8FF">
      <div className="space-y-3">
        {ranked.map((f) => {
          const m = MODEL_BY_ID.get(f.modelId);
          if (!m) return null;
          return (
            <div key={f.modelId} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-[13px] text-ink-2">
                {m.label}
              </span>
              <div className="h-6 flex-1 overflow-hidden rounded-lg bg-surface-3">
                <motion.div
                  className="flex h-full items-center justify-end rounded-lg pr-2"
                  style={{ backgroundColor: m.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(6, (f.picks / max) * 100)}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="tnum font-mono text-[11px] font-bold text-[#1a1420]">
                    {f.picks}
                  </span>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[13px] text-ink-3">
        The gateway spreads traffic across models - each request goes where the
        objective says it belongs.
      </p>
    </SectionCard>
  );
}
