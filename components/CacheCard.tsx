"use client";

import { motion } from "framer-motion";
import { SectionCard } from "./RoutingDecision";
import { ms, pct } from "@/lib/format";
import { AnimatedNumber } from "./motion";
import { CacheIcon } from "./icons";
import type { RequestRecord } from "@/lib/types";

/** Only meaningful when the latest request was a cache hit. */
export default function CacheCard({ record }: { record: RequestRecord }) {
  if (!record.cached) return null;
  return (
    <SectionCard icon={<CacheIcon size={16} />} label="Semantic Cache" accent="#3FE0A0">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="rounded-soft border border-mint/25 bg-mint/8 p-4"
      >
        <div className="flex items-center gap-2 text-mint">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mint" />
          </span>
          <span className="font-semibold">Match found - served from cache</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Similarity" value={pct(record.similarity)} />
          <Stat label="Response time" value={ms(record.latencyMs)} />
          <Stat label="Cost" value="$0" />
        </div>
      </motion.div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
        A near-identical prompt was answered before, so Multiplexer skipped the
        model call entirely - instant, and free.
      </p>
    </SectionCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow mb-1 !text-mint/70">{label}</div>
      <div className="tnum font-mono text-lg font-bold text-ink">{value}</div>
    </div>
  );
}
