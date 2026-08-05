"use client";

import { motion } from "framer-motion";
import { MODEL_BY_ID } from "@/lib/models";
import { ms, pct } from "@/lib/format";
import { AnimatedNumber, popIn, stagger } from "./motion";
import type { Metrics } from "@/lib/types";

export default function LiveMetrics({
  metrics,
  bestModelId,
}: {
  metrics: Metrics;
  bestModelId: string | null;
}) {
  const savedPct = metrics.baselineUsd
    ? Math.round((metrics.savedUsd / metrics.baselineUsd) * 100)
    : 0;
  const best = bestModelId ? MODEL_BY_ID.get(bestModelId) : null;

  const tiles = [
    { label: "Requests", node: <AnimatedNumber value={metrics.total} />, color: "#F6F0FA" },
    { label: "Avg latency", node: <AnimatedNumber value={metrics.avgLatencyMs} format={(v) => ms(v)} />, color: "#5CC8FF" },
    { label: "Money saved", node: <><AnimatedNumber value={savedPct} />%</>, color: "#3FE0A0" },
    { label: "Cache hit rate", node: <AnimatedNumber value={Math.round(metrics.cacheHitRate * 100)} format={(v) => `${Math.round(v)}%`} />, color: "#FFC24B" },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {tiles.map((t) => (
        <motion.div key={t.label} variants={popIn} className="card p-4">
          <div className="eyebrow mb-2">{t.label}</div>
          <div
            className="tnum font-display text-2xl font-extrabold tracking-tighter2 sm:text-[28px]"
            style={{ color: t.color }}
          >
            {t.node}
          </div>
        </motion.div>
      ))}
      <motion.div variants={popIn} className="card col-span-2 p-4 sm:col-span-1">
        <div className="eyebrow mb-2">Current best</div>
        {best ? (
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: best.color, boxShadow: `0 0 10px ${best.color}` }}
            />
            <span className="truncate font-display text-lg font-bold text-ink">
              {best.label}
            </span>
          </div>
        ) : (
          <div className="text-ink-4">-</div>
        )}
      </motion.div>
    </motion.div>
  );
}
