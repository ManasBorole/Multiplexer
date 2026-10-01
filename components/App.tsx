"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CircuitState, FleetStat, GatewayState, RequestRecord, Weights } from "@/lib/types";
import { deriveState } from "@/lib/session";
import Hero from "./Hero";
import Story, { storyTop } from "./Story";
import Results, { type RunError, type StepState } from "./Results";
import Session from "./Session";
import Inspector from "./Inspector";
import useTilt from "./useTilt";
import type { StepActions } from "./StepCard";
import { DEFAULT_WEIGHTS, SAMPLE, SAMPLE_OPEN_CIRCUIT, STEPS, SUGGESTIONS, model } from "./routing";
import { ms } from "@/lib/format";

// Session store: survives reload, cleared by the browser when the tab closes.
const SS_KEY = "mux_session_v1";
const HISTORY_CAP = 240;
const IDLE: StepState[] = Array(8).fill("todo");

type Saved = { records?: RequestRecord[]; offline?: string[]; weightsById?: Record<string, Weights> };

const reduceMotion = () =>
  typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function finalStates(r: RequestRecord): StepState[] {
  if (r.cached) return ["ok", "ok", "ok", "skip", "skip", "skip", "skip", "skip"];
  if (r.failed) return ["ok", "ok", "ok", "ok", "ok", "fail", "skip", "skip"];
  return Array(8).fill("ok");
}

export default function App() {
  const [records, setRecords] = useState<RequestRecord[]>([]);
  const [offline, setOffline] = useState<string[]>([]);
  const [weightsById, setWeightsById] = useState<Record<string, Weights>>({});
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [hydrated, setHydrated] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [latest, setLatest] = useState<RequestRecord | null>(null);
  const [running, setRunning] = useState(false);
  const [states, setStates] = useState<StepState[]>(IDLE);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<RunError | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [heroDone, setHeroDone] = useState(false);
  const [measured, setMeasured] = useState<GatewayState["measured"]>(undefined);
  const [circuits, setCircuits] = useState<Record<string, CircuitState | undefined>>({});
  useTilt();

  const runningRef = useRef(false);
  const weightsRef = useRef(weights);
  weightsRef.current = weights;
  const lastAttempt = useRef<{ text: string; w: Weights; skipCache: boolean } | null>(null);

  const takeCircuits = (fleet?: FleetStat[], m?: GatewayState["measured"]) => {
    if (m) setMeasured(m);
    if (!Array.isArray(fleet)) return;
    setCircuits(Object.fromEntries(fleet.map((f) => [f.modelId, f.circuit])));
  };

  // Restore this tab's session; read breaker state from the server.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Saved;
        if (Array.isArray(p.records)) {
          // sessionStorage is client-only, so it can only be read after hydration.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setRecords(p.records);
          if (p.records[0]) setLatest(p.records[0]);
        }
        if (Array.isArray(p.offline)) setOffline(p.offline);
        if (p.weightsById && typeof p.weightsById === "object") setWeightsById(p.weightsById);
      }
    } catch {
      /* storage unavailable: start empty */
    }
    setHydrated(true);
    fetch("/api/state", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && takeCircuits(s.fleet, s.measured))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({ records, offline, weightsById }));
    } catch {
      /* ignore */
    }
  }, [records, offline, weightsById, hydrated]);

  const submit = useCallback(async (text: string, w?: Weights, opts: { fromHero?: boolean; skipCache?: boolean } = {}) => {
    const clean = text.trim();
    if (!clean || runningRef.current) return;
    const useW = w ?? weightsRef.current;
    if (w) setWeights(w);
    lastAttempt.current = { text: clean, w: useW, skipCache: !!opts.skipCache };
    runningRef.current = true;
    setRunning(true);
    setHeroDone(false);
    setError(null);
    setStreamText("");
    setStates(["run", ...IDLE.slice(1)]);

    // Steps 1-5 are fast and server-side; advance them briskly, then hold on
    // "Call model" until the real answer arrives. The final state comes from the record.
    let step = 0;
    const timer = setInterval(() => {
      if (step >= 5) return;
      step += 1;
      setStates((s) => s.map((_, i) => (i < step ? "ok" : i === step ? "run" : "todo")));
    }, reduceMotion() ? 0 : 170);

    const fail = (title: string, detail: string) => {
      clearInterval(timer);
      setStates((s) => s.map((x) => (x === "run" ? "fail" : x)));
      setError({ title, detail });
    };

    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: clean, weights: useW, skipCache: !!opts.skipCache }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        if (res.status === 429) {
          const wait = res.headers.get("Retry-After");
          fail("Too many prompts at once", `${body.error ?? "The demo is rate limited."} ${wait ? `Wait ${wait} seconds, then try again.` : ""}`.trim());
        } else if (res.status === 422 || res.status === 400) {
          fail("That prompt can't be routed", `${body.error ?? "The request was invalid."} Edit the prompt and try again.`);
        } else {
          fail("The gateway returned an error", `Status ${res.status}. Try again in a moment.`);
        }
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let rec: RequestRecord | null = null;
      let streamErr = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === "token") {
              acc += msg.v;
              setStreamText(acc);
            } else if (msg.type === "done") {
              rec = msg.record ?? null;
              takeCircuits(msg.state?.fleet, msg.state?.measured);
            } else if (msg.type === "error") {
              streamErr = msg.error ?? "Routing failed.";
            }
          } catch {
            /* skip a malformed line */
          }
        }
      }
      clearInterval(timer);
      if (!rec) {
        fail("Routing stopped partway", `${streamErr || "No result came back."} If you switched providers off, switch one back on and try again.`);
        return;
      }
      const record = rec;
      setStates(finalStates(record));
      setLatest(record);
      setRecords((prev) => [record, ...prev].slice(0, HISTORY_CAP));
      setWeightsById((m) => ({ ...m, [record.id]: useW }));
    } catch {
      fail("Couldn't reach Multiplexer", "Check your connection, then try again.");
    } finally {
      clearInterval(timer);
      runningRef.current = false;
      setRunning(false);
      // From the hero, stay put: the visitor chooses to walk through or jump.
      if (opts.fromHero) setHeroDone(true);
    }
  }, []);

  // ?demo=1 routes the first example prompt on load (shareable, drives capture).
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    if (new URLSearchParams(location.search).get("demo") === "1") {
      // ?demo=1 is only knowable on the client, after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrompt(SUGGESTIONS[0]);
      const t = setTimeout(() => submitRef.current(SUGGESTIONS[0], undefined, { fromHero: true }), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const toggleProvider = useCallback(async (modelId: string, off: boolean) => {
    setOffline((prev) => (off ? Array.from(new Set([...prev, modelId])) : prev.filter((id) => id !== modelId)));
    try {
      const r = await fetch("/api/provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, offline: off }),
      });
      if (r.ok) takeCircuits((await r.json()).state?.fleet);
    } catch {
      /* local view already updated; the next route call re-syncs */
    }
  }, []);

  const state = useMemo(() => deriveState(records, offline), [records, offline]);

  // The story tells the visitor's own last request, or a labelled sample.
  const story = latest ?? SAMPLE;
  const storyWeights = latest ? (weightsById[latest.id] ?? weights) : DEFAULT_WEIGHTS;
  const storyCircuits = latest ? circuits : { ...circuits, [SAMPLE_OPEN_CIRCUIT]: "open" as const };
  const share = latest && !latest.cached ? (state.fleet.find((f) => f.modelId === latest.modelId)?.share ?? null) : null;

  const actions: StepActions = {
    busy: running,
    offline,
    circuits: storyCircuits,
    onReroute: (p) => submit(p),
    onRerouteWith: (p, w) => submit(p, w, { skipCache: true }),
    onToggle: toggleProvider,
  };

  const focusPrompt = () => {
    scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
    setTimeout(() => document.getElementById("prompt")?.focus(), 400);
  };

  const runIdx = states.findIndex((s) => s === "run");
  const heroStatus = running
    ? `Routing: step ${runIdx + 1} of 8, ${STEPS[Math.max(0, runIdx)].name.replace(/^It /, "").toLowerCase()}`
    : "";

  // What the hero says once routing finishes, and which next step it leads with.
  const savedPct = latest && latest.baselineUsd ? Math.round((1 - latest.costUsd / latest.baselineUsd) * 100) : 0;
  const outcome =
    !heroDone || running
      ? null
      : error
        ? { tone: "bad" as const, text: `${error.title}. ${error.detail}` }
        : latest
          ? {
              tone: "ok" as const,
              text: latest.cached
                ? `Answered from the cache in ${ms(latest.latencyMs)}, at no cost.`
                : latest.failed
                  ? "Every provider failed for this prompt."
                  : `Routed to ${model(latest.modelId).label} in ${ms(latest.latencyMs)}${savedPct > 0 ? `, ${savedPct}% cheaper than the flagship` : ""}.`,
            }
          : null;
  const firstRoute = records.length <= 1;
  const toResults = () =>
    document.getElementById("results")?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth" });

  const selected = selectedId ? (records.find((r) => r.id === selectedId) ?? null) : null;
  const jump = (n: number) =>
    scrollTo({ top: storyTop(n), behavior: reduceMotion() ? "auto" : "smooth" });

  return (
    <>
      <a href="#prompt" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-sm focus:bg-card focus:px-3 focus:py-2">
        Skip to the prompt
      </a>
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-3.5 bg-[linear-gradient(var(--bg)_55%,transparent)] px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top,0px))] min-[1001px]:px-6">
        <a href="#try" className="font-display flex items-center gap-2.5 text-[17px] font-extrabold tracking-[-0.02em]">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M2 11h6M8 11l6-7h6M8 11h12M8 11l6 7h6" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="8" cy="11" r="2.4" fill="var(--acc)" />
          </svg>
          Multiplexer
        </a>
        <nav aria-label="Sections" className="hidden gap-1 text-sm min-[1001px]:flex">
          {[["#story", "How it routes"], ["#results", "Results"], ["#session", "Session"]].map(([h, t]) => (
            <a key={h} href={h} className="rounded-[9px] px-3 py-1.5 text-dim hover:bg-card hover:text-ink">{t}</a>
          ))}
        </nav>
        <a href="https://github.com/ManasBorole/Multiplexer" className="rounded-[9px] border border-line px-3 py-1.5 text-[13px] text-dim hover:text-ink">
          Source on GitHub
        </a>
      </header>

      <main>
        <Hero
          prompt={prompt}
          setPrompt={setPrompt}
          onSubmit={() => submit(prompt, undefined, { fromHero: true })}
          busy={running}
          weights={weights}
          setWeights={setWeights}
          plane={{ record: story, weights: storyWeights, share, actions, onJump: jump, live: running ? states : null }}
          status={heroStatus}
          outcome={outcome}
          leadWithWalk={firstRoute && !error}
          onWalk={() => jump(1)}
          onResults={toResults}
        />
        <Story record={story} weights={storyWeights} share={share} actions={actions} />
        <Results
          ready={hydrated}
          latest={latest}
          weights={latest ? (weightsById[latest.id] ?? weights) : weights}
          states={states}
          running={running}
          streamText={streamText}
          error={error}
          onReroute={() => latest && submit(latest.prompt, undefined, { skipCache: true })}
          onReplay={() => jump(1)}
          onInspect={setSelectedId}
          onRetry={() => lastAttempt.current && submit(lastAttempt.current.text, lastAttempt.current.w, { skipCache: lastAttempt.current.skipCache })}
          onWrite={focusPrompt}
        />
        <Session ready={hydrated} measured={measured} state={state} circuits={circuits} onToggle={toggleProvider} onInspect={setSelectedId} />
      </main>

      <footer className="border-t border-line px-4 py-8 text-center text-[13px] text-mute">
        Free-tier models through OpenRouter. Prices are reference prices. Without an API key, answers are simulated and labelled.
      </footer>

      <Inspector record={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}
