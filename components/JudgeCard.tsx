"use client";

import { motion } from "framer-motion";
import { SectionCard } from "./RoutingDecision";
import { AnimatedNumber } from "./motion";
import { SparkleIcon } from "./icons";
import type { RequestRecord } from "@/lib/types";

// LLM-as-Judge verdict for the answer. This score is the quality signal the
// bandit's reward is built on - shown so the "why" behind learning is visible.
export default function JudgeCard({ record }: { record: RequestRecord }) {
  const j = record.judge;
  const score = Math.round((j?.score ?? record.quality) * 100);
  const color = score > 82 ? "#3FE0A0" : score > 62 ? "#FFC24B" : "#FF7A6B";

  return (
    <SectionCard icon={<SparkleIcon size={16} />} label="LLM-as-Judge" accent={color}>
      {record.cached ? (
        <p className="py-4 text-[13px] text-ink-3">
          Served from cache - reused a previously judged answer, so no new
          quality score was computed.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div
              className="tnum font-display text-5xl font-extrabold tracking-tighter2"
              style={{ color }}
            >
              <AnimatedNumber value={score} />
              <span className="text-2xl">%</span>
            </div>
            <div className="flex-1">
              <div className="eyebrow mb-1">Quality score</div>
              <div className="h-2 overflow-hidden rounded-pill bg-surface-3">
                <motion.div
                  className="h-full rounded-pill"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-soft border border-border-soft bg-surface-2/40 px-3.5 py-3">
            <div className="eyebrow mb-1">Reasoning</div>
            <p className="text-[14px] leading-relaxed text-ink-2">
              {j?.reasoning ?? "Heuristic quality estimate."}
            </p>
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-ink-4">
            The judge&apos;s score feeds the reward the bandit learns from - better
            answers reinforce the model that produced them.
          </p>
        </>
      )}
    </SectionCard>
  );
}
