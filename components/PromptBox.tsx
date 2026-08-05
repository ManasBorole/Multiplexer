"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SendIcon } from "./icons";

// A big pool; four are picked per session so the chips vary each visit (#6).
const EXAMPLE_POOL = [
  "How do I optimize slow SQL queries?",
  "Write a haiku about the ocean.",
  "Explain the CAP theorem simply.",
  "Prove √2 is irrational.",
  "Design a schema for a URL shortener.",
  "Refactor a callback into async/await.",
  "What's the difference between TCP and UDP?",
  "Give me three names for a coffee shop.",
  "Summarize the plot of Hamlet in two lines.",
  "Write a regex that matches an IPv4 address.",
  "Translate 'good morning' into Japanese.",
  "Explain eventual consistency with a cart example.",
  "Derive the time complexity of merge sort.",
  "Draft a polite follow-up on an overdue invoice.",
  "Why isn't 0.1 + 0.2 exactly 0.3?",
  "Architect a multi-region Postgres failover.",
];

const SS_KEY = "mux_examples_v1";

function pickFour(): string[] {
  const pool = [...EXAMPLE_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 4);
}

export default function PromptBox({
  value,
  onChange,
  onSubmit,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  // Deterministic first paint (avoids hydration mismatch); shuffle in after mount,
  // stable for the rest of the session, fresh next visit.
  const [examples, setExamples] = useState(EXAMPLE_POOL.slice(0, 4));
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (raw) {
        setExamples(JSON.parse(raw));
        return;
      }
    } catch {
      /* ignore */
    }
    const picked = pickFour();
    setExamples(picked);
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify(picked));
    } catch {
      /* ignore */
    }
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!busy && value.trim()) onSubmit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="group relative">
        {/* soft glow behind the box */}
        <div className="absolute -inset-px rounded-[20px] bg-gradient-to-r from-coral/40 via-rose/30 to-coral/40 opacity-40 blur-md transition-opacity duration-500 group-focus-within:opacity-70" />
        <div className="relative flex items-end gap-2 rounded-[20px] border border-border-soft bg-surface/90 p-2.5 shadow-lift backdrop-blur-sm">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Enter your prompt…"
            className="max-h-40 min-h-[48px] flex-1 resize-none bg-transparent px-3 py-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-4"
          />
          <motion.button
            type="button"
            onClick={onSubmit}
            disabled={busy || !value.trim()}
            whileTap={{ scale: 0.94 }}
            className="flex h-12 items-center gap-2 rounded-2xl bg-coral px-5 font-semibold text-[#2a0f0b] shadow-glow-coral transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? "Routing…" : "Send"}
            {!busy && <SendIcon size={18} />}
          </motion.button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onChange(ex)}
            disabled={busy}
            className="rounded-pill border border-border-soft bg-surface/60 px-3 py-1.5 text-[13px] text-ink-3 transition-colors hover:border-coral/40 hover:text-ink-2 disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
