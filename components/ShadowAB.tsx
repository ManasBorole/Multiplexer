"use client";

import { motion } from "framer-motion";
import { SectionCard } from "./RoutingDecision";
import { usd } from "@/lib/format";
import { ChartIcon } from "./icons";
import type { GatewayState } from "@/lib/types";

// A/B + shadow: for every routed request the static (always-flagship) and random
// policies' picks are computed but never served. Their running cost/quality is
// compared here against the live bandit - the case that the bandit wins the
// cost/quality trade-off, made from this session's own traffic.
export default function ShadowAB({ abtest }: { abtest: GatewayState["abtest"] }) {
  const rows = [
    { key: "bandit", label: "Bandit (live)", color: "#A78BFA", live: true },
    { key: "static", label: "Static - always flagship", color: "#FF7A6B", live: false },
    { key: "random", label: "Random", color: "#5CC8FF", live: false },
  ] as const;

  const data = rows.map((r) => {
    const s = abtest[r.key];
    return {
      ...r,
      avgCost: s.count ? s.spendUsd / s.count : 0,
      avgQuality: s.count ? s.qualitySum / s.count : 0,
      count: s.count,
    };
  });
  const maxCost = Math.max(1e-12, ...data.map((d) => d.avgCost));
  const bandit = data.find((d) => d.key === "bandit")!;
  const staticP = data.find((d) => d.key === "static")!;
  const savedVsStatic =
    staticP.avgCost > 0 ? Math.round((1 - bandit.avgCost / staticP.avgCost) * 100) : 0;

  return (
    <SectionCard icon={<ChartIcon size={16} />} label="A/B - Bandit vs Static vs Random" accent="#A78BFA">
      {bandit.count === 0 ? (
        <div className="py-6 text-center text-[13px] text-ink-4">
          Comparison builds as you route requests this session.
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold tracking-tighter2 text-mint">
              {savedVsStatic}%
            </span>
            <span className="text-[13px] text-ink-3">cheaper than always-flagship, at</span>
            <span className="tnum font-mono text-[13px] text-ink-2">
              {Math.round(bandit.avgQuality * 100)}% quality
            </span>
          </div>
          <div className="space-y-3">
            {data.map((d) => (
              <div key={d.key}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className={d.live ? "font-semibold text-ink" : "text-ink-2"}>
                    {d.label}
                  </span>
                  <span className="tnum font-mono text-ink-3">
                    {usd(d.avgCost, 5)}/req · {Math.round(d.avgQuality * 100)}% q
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-pill bg-surface-3">
                  <motion.div
                    className="h-full rounded-pill"
                    style={{ backgroundColor: d.color, opacity: d.live ? 1 : 0.6 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(3, (d.avgCost / maxCost) * 100)}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}
