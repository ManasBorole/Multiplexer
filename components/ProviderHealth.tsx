"use client";

import { motion } from "framer-motion";
import { SectionCard } from "./RoutingDecision";
import { MODEL_BY_ID } from "@/lib/models";
import { PowerIcon } from "./icons";
import type { FleetStat } from "@/lib/types";

// Circuit-breaker status + quality-drift trend per provider. Surfaces when a
// model is degrading (drift ↓), tripped (circuit open), or healthy.
export default function ProviderHealth({ fleet }: { fleet: FleetStat[] }) {
  const active = fleet
    .filter((f) => f.picks > 0 || f.circuit === "open")
    .sort((a, b) => (a.drift ?? 0) - (b.drift ?? 0));

  return (
    <SectionCard icon={<PowerIcon size={16} />} label="Provider Health & Drift" accent="#5CC8FF">
      {active.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-ink-4">
          Health and drift appear once traffic starts flowing.
        </div>
      ) : (
        <div className="space-y-2.5">
          {active.map((f) => {
            const m = MODEL_BY_ID.get(f.modelId);
            if (!m) return null;
            const drift = f.drift ?? 0;
            const open = f.circuit === "open";
            const half = f.circuit === "half-open";
            const bad = !f.healthy || open;
            const status = open
              ? "circuit open"
              : half
                ? "recovering"
                : !f.healthy
                  ? "unhealthy"
                  : "healthy";
            const statusColor = bad ? "#FF5C6A" : half ? "#FFC24B" : "#3FE0A0";
            // drift bar: center = 0, ±0.15 full scale
            const driftPct = Math.max(-1, Math.min(1, drift / 0.15));
            return (
              <div key={f.modelId} className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: statusColor, boxShadow: bad ? `0 0 8px ${statusColor}` : undefined }}
                />
                <span className="w-28 shrink-0 truncate text-[13px] text-ink-2">{m.label}</span>

                {/* centered drift meter */}
                <div className="relative h-1.5 flex-1 rounded-pill bg-surface-3">
                  <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-border" />
                  <motion.div
                    className="absolute top-0 h-full rounded-pill"
                    style={{
                      backgroundColor: drift < 0 ? "#FF5C6A" : "#3FE0A0",
                      left: drift < 0 ? `${50 + driftPct * 50}%` : "50%",
                      right: drift < 0 ? "50%" : `${50 - driftPct * 50}%`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                </div>

                <span
                  className="w-24 shrink-0 text-right text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: statusColor }}
                >
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-[13px] leading-relaxed text-ink-3">
        Red = quality drifting below the model&apos;s prior; a tripped circuit
        breaker takes a provider out of rotation until it recovers.
      </p>
    </SectionCard>
  );
}
