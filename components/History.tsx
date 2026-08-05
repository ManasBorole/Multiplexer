"use client";

import { motion } from "framer-motion";
import { SectionCard } from "./RoutingDecision";
import { MODEL_BY_ID } from "@/lib/models";
import { ms } from "@/lib/format";
import { HistoryIcon, ChevronIcon } from "./icons";
import type { RequestRecord } from "@/lib/types";

export default function History({
  records,
  onSelect,
}: {
  records: RequestRecord[];
  onSelect: (id: string) => void;
}) {
  const rows = records.slice(0, 8);
  return (
    <SectionCard icon={<HistoryIcon size={16} />} label="History" accent="#A78BFA">
      {rows.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-ink-4">
          Your prompts will appear here.
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => {
            const m = MODEL_BY_ID.get(r.modelId);
            const saved = r.baselineUsd
              ? Math.round((Math.max(0, r.baselineUsd - r.costUsd) / r.baselineUsd) * 100)
              : 0;
            return (
              <motion.button
                key={r.id}
                type="button"
                onClick={() => onSelect(r.id)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group flex w-full items-center gap-3 rounded-soft border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border-soft hover:bg-surface-2/60"
              >
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
                  {r.prompt}
                </span>
                <span className="hidden items-center gap-1.5 sm:flex">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: m?.color ?? "#6E6483" }}
                  />
                  <span className="w-24 truncate text-[12px] text-ink-3">
                    {m?.label ?? r.modelId}
                  </span>
                </span>
                {r.cached ? (
                  <span className="chip !py-0.5 !text-[11px] text-mint">cached</span>
                ) : (
                  <span className="tnum w-12 text-right font-mono text-[12px] text-mint">
                    −{saved}%
                  </span>
                )}
                <span className="tnum hidden w-14 text-right font-mono text-[12px] text-ink-3 md:block">
                  {ms(r.latencyMs)}
                </span>
                <ChevronIcon
                  size={15}
                  className="shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-2"
                />
              </motion.button>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
