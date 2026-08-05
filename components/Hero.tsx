"use client";

import { motion } from "framer-motion";
import { SparkleIcon, ArrowIcon } from "./icons";

export default function Hero({
  onTryDemo,
  busy,
}: {
  onTryDemo: () => void;
  busy: boolean;
}) {
  return (
    <section className="relative pb-10 pt-16 text-center sm:pt-24">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-6 flex justify-center">
          <span className="chip gap-2 text-ink-2">
            <SparkleIcon size={13} className="text-coral" />
            Contextual bandit · Semantic cache · Failover
          </span>
        </div>

        <h1 className="font-display text-6xl font-extrabold tracking-tighter2 text-ink sm:text-8xl">
          Multiplexer
        </h1>
        <p className="mt-4 font-display text-xl font-semibold text-coral sm:text-2xl">
          Intelligent LLM Routing Gateway
        </p>
        <p className="mx-auto mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-ink-2 sm:text-base">
          Routes every request to the optimal AI model based on cost, latency and
          quality - and shows you the whole decision, live.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <motion.button
            type="button"
            onClick={onTryDemo}
            disabled={busy}
            whileTap={{ scale: 0.95 }}
            className="group inline-flex items-center gap-2 rounded-pill bg-coral px-6 py-3 font-semibold text-[#2a0f0b] shadow-glow-coral transition-all hover:brightness-110 disabled:opacity-50"
          >
            Try the demo
            <ArrowIcon
              size={18}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
}
