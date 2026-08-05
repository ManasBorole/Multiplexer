"use client";

import { motion } from "framer-motion";
import { SectionCard } from "./RoutingDecision";
import { ms } from "@/lib/format";
import { AnimatedNumber } from "./motion";
import { BoltIcon } from "./icons";
import type { RequestRecord } from "@/lib/types";

export default function LatencyBreakdown({ record }: { record: RequestRecord }) {
  const l = record.latency;
  const total = l.totalMs || 1;
  const rows = [
    { label: "Feature extraction", value: l.featureMs, color: "#5CC8FF" },
    { label: "Bandit decision", value: l.banditMs, color: "#A78BFA" },
    { label: "Provider", value: l.providerMs, color: "#FF7A6B" },
  ];

  return (
    <SectionCard icon={<BoltIcon size={16} />} label="Latency" accent="#5CC8FF">
      {/* segmented total bar */}
      <div className="mb-4 flex h-3 overflow-hidden rounded-pill bg-surface-3">
        {rows.map((r, i) => (
          <motion.div
            key={r.label}
            style={{ backgroundColor: r.color }}
            initial={{ width: 0 }}
            animate={{ width: `${(r.value / total) * 100}%` }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>

      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: r.color }}
            />
            <span className="flex-1 text-[13px] text-ink-2">{r.label}</span>
            <span className="tnum font-mono text-[13px] text-ink">
              <AnimatedNumber value={r.value} format={(v) => ms(v)} />
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border-soft pt-2.5">
          <span className="text-[13px] font-semibold text-ink">Total</span>
          <span className="tnum font-mono text-base font-bold text-ink">
            <AnimatedNumber value={l.totalMs} format={(v) => ms(v)} />
          </span>
        </div>
      </div>
    </SectionCard>
  );
}
