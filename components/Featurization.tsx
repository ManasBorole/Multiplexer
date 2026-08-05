"use client";

import { motion } from "framer-motion";
import { SectionCard } from "./RoutingDecision";
import { TargetIcon } from "./icons";
import type { RequestRecord } from "@/lib/types";

// What the gateway detected in the prompt before routing - the context features
// the bandit conditions on, made legible.
export default function Featurization({ record }: { record: RequestRecord }) {
  const codeReason = record.reasons.find((r) => /code/i.test(r));
  const complexity = record.reasons.find((r) => /complexity/i.test(r)) ?? "-";
  const outputLen = record.reasons.find((r) => /output/i.test(r)) ?? "-";
  const reasoning = record.reasons.some((r) => /reasoning/i.test(r));
  const diff = Math.round(record.difficulty * 100);

  const props: { label: string; value: string; on: boolean }[] = [
    { label: "Language", value: record.language ?? "English", on: true },
    { label: "Code", value: codeReason ? "detected" : "none", on: !!codeReason },
    { label: "Reasoning", value: reasoning ? "heavy" : "light", on: reasoning },
    { label: "Output", value: /long/i.test(outputLen) ? "long" : "short", on: /long/i.test(outputLen) },
  ];

  return (
    <SectionCard icon={<TargetIcon size={16} />} label="Featurization" accent="#FFC24B">
      <div className="grid grid-cols-2 gap-2.5">
        {props.map((p) => (
          <div
            key={p.label}
            className="rounded-soft border border-border-soft bg-surface-2/40 px-3 py-2"
          >
            <div className="eyebrow mb-0.5">{p.label}</div>
            <div className={`text-[14px] font-semibold ${p.on ? "text-ink" : "text-ink-4"}`}>
              {p.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[13px]">
          <span className="text-ink-2">Estimated complexity</span>
          <span className="tnum font-mono text-amber">{diff}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-pill bg-surface-3">
          <motion.div
            className="h-full rounded-pill bg-amber"
            initial={{ width: 0 }}
            animate={{ width: `${diff}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border-soft pt-3 text-[13px]">
        <span className="text-ink-3">Tokens</span>
        <span className="tnum font-mono text-ink-2">
          {record.tokensIn || "-"} in · {record.tokensOut || "-"} out
        </span>
      </div>
    </SectionCard>
  );
}
