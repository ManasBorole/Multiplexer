"use client";

import { motion } from "framer-motion";
import { SectionCard } from "./RoutingDecision";
import { FLAGSHIP, MODELS } from "@/lib/models";
import { usd } from "@/lib/format";
import { AnimatedNumber } from "./motion";
import { CoinIcon } from "./icons";
import type { RequestRecord } from "@/lib/types";

export default function CostAnalysis({ record }: { record: RequestRecord }) {
  const cost = record.costUsd;
  const baseline = record.baselineUsd || cost;
  const saved = Math.max(0, baseline - cost);
  const savedPct = baseline ? Math.round((saved / baseline) * 100) : 0;

  // What each model would have cost for THIS request - same token counts, each
  // model's own price. Cheapest first; the one the router picked is highlighted.
  const tin = record.tokensIn || Math.max(4, Math.round(record.prompt.length / 4));
  const tout = record.tokensOut || 260;
  const rows = MODELS.map((m) => ({
    m,
    cost: (tin * m.priceIn + tout * m.priceOut) / 1e6,
  })).sort((a, b) => a.cost - b.cost);
  const maxCost = Math.max(1e-12, ...rows.map((r) => r.cost));

  return (
    <SectionCard icon={<CoinIcon size={16} />} label="Cost Analysis" accent="#3FE0A0">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-1">Money saved</div>
          <div className="font-display text-4xl font-extrabold tracking-tighter2 text-mint">
            <AnimatedNumber value={savedPct} />%
          </div>
        </div>
        <div className="text-right">
          <div className="eyebrow mb-1">This request</div>
          <div className="tnum font-mono text-lg text-ink">{usd(cost, 5)}</div>
          {record.cached && (
            <div className="text-[12px] text-mint">served free from cache</div>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-border-soft pt-4">
        <div className="eyebrow mb-3">
          What every model would have cost{" "}
          <span className="text-ink-4">· vs {FLAGSHIP.label} baseline</span>
        </div>
        <div className="space-y-1.5">
          {rows.map(({ m, cost: c }, i) => {
            const chosen = m.id === record.modelId;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * i }}
                className={`flex items-center gap-2.5 rounded-soft px-2 py-1 ${
                  chosen ? "bg-mint/10 ring-1 ring-mint/30" : ""
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                <span
                  className={`w-28 shrink-0 truncate text-[13px] ${
                    chosen ? "font-semibold text-ink" : "text-ink-2"
                  }`}
                >
                  {m.label}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-3">
                  <motion.div
                    className="h-full rounded-pill"
                    style={{ backgroundColor: m.color, opacity: chosen ? 1 : 0.5 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(3, (c / maxCost) * 100)}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <span className="tnum w-20 shrink-0 text-right font-mono text-[12px] text-ink-3">
                  {usd(c, 5)}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}
