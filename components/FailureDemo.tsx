"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SectionCard } from "./RoutingDecision";
import { MODELS } from "@/lib/models";
import { PowerIcon, AlertIcon } from "./icons";

export default function FailureDemo({
  offline,
  onToggle,
}: {
  offline: string[];
  onToggle: (modelId: string, offline: boolean) => void;
}) {
  const offSet = new Set(offline);
  const downLabels = MODELS.filter((m) => offSet.has(m.id)).map((m) => m.label);

  return (
    <SectionCard icon={<PowerIcon size={16} />} label="Failure Resilience" accent="#FF5C6A">
      <p className="mb-4 text-[13px] leading-relaxed text-ink-3">
        Flip a provider offline. The next request reroutes automatically - no
        interruption, no dropped answer.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {MODELS.map((m) => {
          const down = offSet.has(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onToggle(m.id, !down)}
              className={`flex items-center gap-2.5 rounded-soft border px-3 py-2.5 text-left transition-all ${
                down
                  ? "border-danger/40 bg-danger/8"
                  : "border-border-soft bg-surface-2/50 hover:border-border"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${
                  down ? "bg-danger" : ""
                }`}
                style={down ? undefined : { backgroundColor: m.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">
                  {m.label}
                </span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    down ? "text-danger" : "text-mint"
                  }`}
                >
                  {down ? "Offline" : "Online"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {downLabels.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2.5 rounded-soft border border-danger/30 bg-danger/8 px-3.5 py-3">
              <AlertIcon size={16} className="mt-0.5 shrink-0 text-danger" />
              <span className="text-[13px] leading-relaxed text-ink-2">
                <span className="font-semibold text-ink">
                  {downLabels.join(", ")}
                </span>{" "}
                offline - traffic is failing over to healthy models. Send a
                prompt to watch the reroute.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SectionCard>
  );
}
