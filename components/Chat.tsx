"use client";

import { motion } from "framer-motion";
import { SparkleIcon } from "./icons";

export default function Chat({
  prompt,
  response,
  modelLabel,
  modelColor,
  cached,
}: {
  prompt: string;
  response: string;
  modelLabel: string;
  modelColor: string;
  cached: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      {/* user */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-coral/30 bg-coral/12 px-4 py-3 text-[15px] leading-relaxed text-ink">
          {prompt}
        </div>
      </motion.div>

      {/* assistant */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-start"
      >
        <div className="max-w-[88%]">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: `${modelColor}22`, color: modelColor }}
            >
              <SparkleIcon size={13} />
            </span>
            <span className="text-[13px] font-semibold text-ink-2">{modelLabel}</span>
            {cached && (
              <span className="chip !py-0.5 !text-[11px] text-mint">cached</span>
            )}
          </div>
          <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-border-soft bg-surface/80 px-4 py-3 text-[15px] leading-relaxed text-ink-2">
            {response}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
