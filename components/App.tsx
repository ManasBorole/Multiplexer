"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RequestRecord, Weights } from "@/lib/types";
import Hero from "./Hero";
import PromptBox from "./PromptBox";
import RewardControls from "./RewardControls";
import Pipeline from "./Pipeline";
import Chat from "./Chat";
import RoutingDecision from "./RoutingDecision";
import Featurization from "./Featurization";
import JudgeCard from "./JudgeCard";
import CostAnalysis from "./CostAnalysis";
import LatencyBreakdown from "./LatencyBreakdown";
import CacheCard from "./CacheCard";
import ProviderTimeline from "./ProviderTimeline";
import LiveMetrics from "./LiveMetrics";
import BanditViz from "./BanditViz";
import ProviderHealth from "./ProviderHealth";
import ShadowAB from "./ShadowAB";
import History from "./History";
import FailureDemo from "./FailureDemo";
import Inspector from "./Inspector";
import { MODEL_BY_ID } from "@/lib/models";
import { deriveState, COLD_START_ROUTED } from "@/lib/session";
import { fadeUp, stagger } from "./motion";

const DEFAULT_WEIGHTS: Weights = { quality: 0.5, cost: 0.3, latency: 0.2 };
// Session store: survives reload, cleared by the browser when the tab closes.
const SS_KEY = "mux_session_v1";
const HISTORY_CAP = 240;

type Phase = "idle" | "pipeline" | "result";

export default function App() {
  const [records, setRecords] = useState<RequestRecord[]>([]);
  const [offline, setOffline] = useState<string[]>([]);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [hydrated, setHydrated] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [latest, setLatest] = useState<RequestRecord | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState(false);
  const [responseReady, setResponseReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pending = useRef<RequestRecord | null>(null);
  const busyRef = useRef(false);
  busyRef.current = busy;
  const weightsRef = useRef(weights);
  weightsRef.current = weights;

  // Load this session's tape (empty on a fresh visit; restored after a reload).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { records?: RequestRecord[]; offline?: string[] };
        if (Array.isArray(p.records)) setRecords(p.records);
        if (Array.isArray(p.offline)) setOffline(p.offline);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({ records, offline }));
    } catch {
      /* ignore */
    }
  }, [records, offline, hydrated]);

  const submit = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || busyRef.current) return;
    setBusy(true);
    setPhase("pipeline");
    setResponseReady(false);
    pending.current = null;
    setLatest(null);
    try {
      const r = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: clean, weights: weightsRef.current }),
      });
      const data = await r.json();
      pending.current = data.record ?? null;
      setResponseReady(true);
    } catch {
      pending.current = null;
      setResponseReady(true);
    }
  }, []);

  // Deep-link ?demo=1 auto-runs the demo prompt (shareable, drives capture).
  const submitRef = useRef<(t: string) => void>(() => {});
  submitRef.current = submit;
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      const t = setTimeout(
        () => submitRef.current("Write a Python function to merge two sorted linked lists."),
        700,
      );
      return () => clearTimeout(t);
    }
  }, []);

  const onPipelineDone = useCallback(() => {
    const rec = pending.current;
    if (rec) {
      setLatest(rec);
      setRecords((prev) => [rec, ...prev].slice(0, HISTORY_CAP));
      setPhase("result");
    } else {
      setPhase("idle");
    }
    setBusy(false);
  }, []);

  const onSubmit = useCallback(() => submit(prompt), [prompt, submit]);

  const onTryDemo = useCallback(() => {
    const demo = "Write a Python function to merge two sorted linked lists.";
    setPrompt(demo);
    submit(demo);
    document.getElementById("prompt")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [submit]);

  const toggleProvider = useCallback(async (modelId: string, off: boolean) => {
    // Update the local (session) view immediately; tell the server so routing honors it.
    setOffline((prev) =>
      off ? Array.from(new Set([...prev, modelId])) : prev.filter((id) => id !== modelId),
    );
    try {
      await fetch("/api/provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, offline: off }),
      });
    } catch {
      /* ignore */
    }
  }, []);

  const state = useMemo(() => deriveState(records, offline), [records, offline]);

  const selected = selectedId
    ? records.find((r) => r.id === selectedId) ??
      (latest?.id === selectedId ? latest : null)
    : null;

  const latestModel = latest ? MODEL_BY_ID.get(latest.modelId) : null;
  const hasData = records.length > 0;

  return (
    <div className="relative">
      <Hero onTryDemo={onTryDemo} busy={busy} />

      <div id="prompt" className="scroll-mt-24">
        <PromptBox value={prompt} onChange={setPrompt} onSubmit={onSubmit} busy={busy} />
        <RewardControls
          weights={weights}
          onChange={setWeights}
          onReroute={() => {
            const last = latest?.prompt ?? records[0]?.prompt;
            if (last) submit(last);
          }}
          canReroute={!!(latest || records.length)}
          busy={busy}
        />
      </div>

      {/* interaction: pipeline → chat + per-request cards */}
      <div className="mt-8">
        <AnimatePresence>
          {phase === "pipeline" && (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="card mx-auto max-w-md p-6"
            >
              <Pipeline
                active
                responseReady={responseReady}
                cached={pending.current?.cached ?? false}
                onComplete={onPipelineDone}
              />
            </motion.div>
          )}

          {phase === "result" && latest && latestModel && (
            <motion.div
              key="result"
              variants={stagger}
              initial="hidden"
              animate="show"
              className="space-y-5"
            >
              <motion.div variants={fadeUp}>
                <Chat
                  prompt={latest.prompt}
                  response={latest.response}
                  modelLabel={latestModel.label}
                  modelColor={latestModel.color}
                  cached={latest.cached}
                />
              </motion.div>

              <motion.div variants={fadeUp} className="mx-auto max-w-4xl space-y-5">
                <RoutingDecision record={latest} />
                <div className="grid gap-5 md:grid-cols-2">
                  {latest.cached && <CacheCard record={latest} />}
                  <Featurization record={latest} />
                  <JudgeCard record={latest} />
                  <CostAnalysis record={latest} />
                  <LatencyBreakdown record={latest} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* dashboard - session-scoped, zig-zag with context copy alongside each card */}
      {hasData && (
        <div className="mt-16 space-y-6">
          <div className="flex items-center justify-center gap-3">
            <SectionTitle>Live metrics</SectionTitle>
            {state.coldStart && (
              <span className="chip !py-0.5 gap-1.5 text-amber">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
                </span>
                Learning… {state.routedCount}/{COLD_START_ROUTED}
              </span>
            )}
          </div>
          <LiveMetrics metrics={state.metrics} bestModelId={state.bestModelId} />

          <ZigRow
            side="left"
            title="Where traffic lands"
            body="Every prompt is scored against the whole roster of free models and sent to the one your objective favors - cheap models soak up the easy asks, the flagships earn the hard ones. The bars shift as your session grows."
          >
            <ProviderTimeline fleet={state.fleet} />
          </ZigRow>

          <ZigRow
            side="right"
            title="Learning as it routes"
            body="A contextual bandit weighs exploring under-tried models against exploiting the ones that pay off. Early on it samples widely - the “Learning…” badge shows the cold-start window - then traffic concentrates on the winners for each kind of prompt."
          >
            <BanditViz fleet={state.fleet} exploration={state.exploration} />
          </ZigRow>

          <ZigRow
            side="left"
            title="Does the learning pay off?"
            body="For every request, the always-flagship and random policies are scored in the background without ever being served (shadow mode). The bandit should land cheaper than always-flagship while holding quality - proof the learning beats both baselines."
          >
            <ShadowAB abtest={state.abtest} />
          </ZigRow>

          <ZigRow
            side="right"
            title="Catching a bad provider"
            body="Quality drift and circuit-breaker state are tracked per provider. If a model degrades or trips its breaker, it drops out of rotation and the bandit routes around it - visible here in real time."
          >
            <ProviderHealth fleet={state.fleet} />
          </ZigRow>

          <ZigRow
            side="left"
            title="Your session, replayed"
            body="Every prompt you send this session lands here - model, saving, latency - and survives a reload. Close the tab and it's gone; nothing about your session is kept server-side."
          >
            <History records={state.history} onSelect={setSelectedId} />
          </ZigRow>

          <ZigRow
            side="right"
            title="No dropped requests"
            body="Flip any provider offline and the next request reroutes to the best healthy model automatically. A rate-limited or downed provider never costs you an answer."
          >
            <FailureDemo offline={state.offline} onToggle={toggleProvider} />
          </ZigRow>
        </div>
      )}

      <Inspector record={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

/** One dashboard row: card on `side`, context copy on the other. Stacks on mobile. */
function ZigRow({
  side,
  title,
  body,
  children,
}: {
  side: "left" | "right";
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  const cardLeft = side === "left";
  return (
    <div className="grid items-center gap-5 md:grid-cols-2 lg:gap-8">
      <div className={cardLeft ? "md:order-1" : "md:order-2"}>{children}</div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`px-1 ${cardLeft ? "md:order-2" : "md:order-1"}`}
      >
        <h3 className="font-display text-2xl font-bold tracking-tightish text-ink">
          {title}
        </h3>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-3">{body}</p>
      </motion.div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center font-display text-sm font-semibold uppercase tracking-[0.18em] text-ink-3"
    >
      {children}
    </motion.h2>
  );
}
