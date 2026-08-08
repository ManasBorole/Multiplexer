"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "./icons";

const STEPS = [
  "Request received",
  "Extracting features",
  "Estimating complexity",
  "Selecting best model",
  "Checking semantic cache",
  "Sending request",
  "Response received",
];

/**
 * Teaches what the gateway does in ~1.3s. Steps 0-4 auto-advance; the last two
 * gate on the real response so the animation reflects true timing. A cache hit
 * celebrates at the cache step and skips the provider call.
 */
export default function Pipeline({
  active,
  responseReady,
  cached,
  streamText,
  onComplete,
}: {
  active: boolean;
  responseReady: boolean;
  cached: boolean;
  streamText: string;
  onComplete: () => void;
}) {
  const [done, setDone] = useState(-1); // highest completed step index
  const [waiting, setWaiting] = useState(false); // holding at "sending"
  const readyRef = useRef(responseReady);
  readyRef.current = responseReady;
  const cachedRef = useRef(cached);
  cachedRef.current = cached;

  useEffect(() => {
    if (!active) return;
    setDone(-1);
    setWaiting(false);
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const finish = () => {
      if (cancelled) return;
      setWaiting(false);
      setDone(6);
      timers.push(setTimeout(() => !cancelled && onComplete(), 480));
    };

    const holdForResponse = () => {
      if (cancelled) return;
      if (readyRef.current) {
        // reveal remaining steps quickly
        setDone(5);
        timers.push(setTimeout(finish, 220));
      } else {
        setWaiting(true);
        timers.push(setTimeout(holdForResponse, 120));
      }
    };

    // safety net: only a true backstop. Real free models can take 20-40s, and
    // holdForResponse waits for them; this just guards a genuinely hung fetch.
    let finished = false;
    const safeFinish = () => {
      if (finished || cancelled) return;
      finished = true;
      setWaiting(false);
      setDone(6);
      onComplete();
    };
    timers.push(setTimeout(safeFinish, 75000));

    // advance steps 0..4
    STEPS.slice(0, 5).forEach((_, i) => {
      timers.push(setTimeout(() => !cancelled && setDone(i), 120 + i * 200));
    });
    // then either cache-hit shortcut or wait for the provider
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        if (readyRef.current && cachedRef.current) finish();
        else holdForResponse();
      }, 120 + 5 * 200),
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [active, onComplete]);

  const label = (i: number) => {
    if (cached && i === 4 && done >= 4) return "Semantic cache - match found";
    if (cached && (i === 5 || i === 6) && done >= 5) return "Served from cache";
    if (i === 5 && waiting) return streamText ? "Receiving response…" : "Sending request…";
    return STEPS[i];
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <ol className="relative space-y-1">
        {STEPS.map((_, i) => {
          const complete = done >= i;
          const activeStep = done === i - 1 || (i === 5 && waiting);
          const shown = done >= i - 1;
          const isCacheHit = cached && i === 4 && complete;
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: shown ? 1 : 0.35, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3.5 py-1.5"
            >
              <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                {i < STEPS.length - 1 && (
                  <span
                    className={`absolute left-1/2 top-full h-3 w-px -translate-x-1/2 ${
                      complete ? "bg-mint/50" : "bg-border"
                    }`}
                  />
                )}
                <AnimatePresence mode="wait">
                  {complete ? (
                    <motion.span
                      key="done"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 18 }}
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        isCacheHit ? "bg-mint text-[#062a1c]" : "bg-mint/90 text-[#062a1c]"
                      }`}
                    >
                      <CheckIcon size={15} />
                    </motion.span>
                  ) : activeStep ? (
                    <motion.span
                      key="active"
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-coral"
                    >
                      <motion.span
                        className="h-2 w-2 rounded-full bg-coral"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity }}
                      />
                    </motion.span>
                  ) : (
                    <span
                      key="pending"
                      className="h-7 w-7 rounded-full border-2 border-border"
                    />
                  )}
                </AnimatePresence>
              </span>
              <span
                className={`text-[14px] transition-colors ${
                  complete
                    ? isCacheHit
                      ? "font-semibold text-mint"
                      : "text-ink"
                    : activeStep
                      ? "font-medium text-ink-2"
                      : "text-ink-4"
                }`}
              >
                {label(i)}
              </span>
            </motion.li>
          );
        })}
      </ol>

      <AnimatePresence>
        {streamText && done < 6 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-border-soft bg-surface/80 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-3 whitespace-pre-wrap"
          >
            {streamText}
            <span className="ml-0.5 inline-block h-3.5 w-1.5 -translate-y-px animate-pulse bg-coral align-middle" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
