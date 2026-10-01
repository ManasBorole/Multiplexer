"use client";

import { MODELS } from "@/lib/models";
import { COLD_START_ROUTED } from "@/lib/session";
import { usd, ms, pct } from "@/lib/format";
import type { CircuitState, GatewayState, RequestRecord } from "@/lib/types";
import Num from "./Num";
import { Bar } from "./StepCard";
import { model, tierShape } from "./routing";

export default function Session({
  state,
  circuits,
  onToggle,
  onInspect,
  ready,
  measured,
}: {
  ready: boolean;
  measured?: GatewayState["measured"];
  state: GatewayState;
  circuits: Record<string, CircuitState | undefined>;
  onToggle: (modelId: string, off: boolean) => void;
  onInspect: (id: string) => void;
}) {
  const { metrics: mt, fleet, abtest, history } = state;
  const n = mt.total;
  const routed = fleet.filter((f) => f.picks > 0).sort((a, b) => b.picks - a.picks);
  const best = state.bestModelId ? model(state.bestModelId).label : "–";
  const pol = [
    { k: "Multiplexer (live)", s: abtest.bandit, tone: "acc" as const },
    { k: "Always flagship", s: abtest.static, tone: "dim" as const },
    { k: "Random model", s: abtest.random, tone: "dim" as const },
  ];
  const maxSpend = Math.max(...pol.map((p) => p.s.spendUsd), 1e-9);

  if (!ready) {
    return (
      <section id="session" aria-busy="true" className="bg-bg px-4 pb-28 pt-10 min-[1001px]:px-6">
        <div aria-hidden="true" className="mx-auto grid max-w-[1200px] gap-5">
          <div className="skeleton h-[86px]" />
          <div className="grid gap-5 min-[1001px]:grid-cols-2">
            <div className="skeleton h-[220px]" />
            <div className="skeleton h-[220px]" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="session" aria-labelledby="session-title" className="bg-bg px-4 pb-28 pt-10 min-[1001px]:px-6">
      <div className="mx-auto grid max-w-[1200px] gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="session-title" className="font-display text-[1.75rem] font-bold leading-tight tracking-[-0.025em]">This session</h2>
            <p className="mt-1.5 max-w-[62ch] text-[14.5px] text-dim">
              Built from the prompts you route in this tab. It survives a reload and is gone when you close the tab.
            </p>
          </div>
          {state.coldStart && (
            <span className="pill pill-warn">Still learning: {state.routedCount} of {COLD_START_ROUTED} routed</span>
          )}
        </div>

        <div className="strip grid-cols-5">
          {([
            ["Requests", n, (v: number) => String(Math.round(v)), true],
            ["Avg latency", mt.avgLatencyMs, (v: number) => ms(v), n > 0],
            ["Saved vs flagship", mt.baselineUsd ? mt.savedUsd / mt.baselineUsd : 0, (v: number) => pct(v), mt.baselineUsd > 0],
            ["Cache hit rate", mt.cacheHitRate, (v: number) => pct(v), n > 0],
          ] as const).map(([k, v, fmt, has]) => (
            <div key={k}>
              <span className="text-[12.5px] text-dim">{k}</span>
              {has ? (
                <Num className={`num text-[22px] font-semibold leading-tight ${k.startsWith("Saved") ? "text-good" : ""}`} value={v} format={fmt} />
              ) : (
                <b className="num text-[22px] font-semibold leading-tight">–</b>
              )}
            </div>
          ))}
          <div>
            <span className="text-[12.5px] text-dim">Most used</span>
            <b className="truncate text-[15px] font-semibold leading-[1.9]">{best}</b>
          </div>
        </div>

        <div className="grid gap-5 min-[1001px]:grid-cols-2">
          <div className="panel">
            <h3 className="panel-title">
              Where traffic lands
              <small>exploring {pct(state.exploration)}, exploiting {pct(1 - state.exploration)}</small>
            </h3>
            {routed.length ? (
              <>
                <div className="grid gap-[7px]">
                  {routed.map((f) => {
                    const m = model(f.modelId);
                    return (
                      <div key={f.modelId} className="grid grid-cols-[1fr_110px_40px] items-center gap-2.5 text-[13px] text-dim">
                        <span className="flex min-w-0 items-center gap-2"><i className={tierShape(m)} /><span className="truncate">{m.label}</span></span>
                        <Bar v={f.share} tone="acc" />
                        <span className="num text-right text-xs text-ink">{pct(f.share)}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="lead">
                  Exploring means the router picked a model with a lower track record to learn more about it.
                  Early on it explores a lot; traffic then settles on the models that pay off.
                </p>
              </>
            ) : (
              <p className="lead">Traffic share appears after your first routed prompt.</p>
            )}
          </div>

          <div className="panel">
            <h3 className="panel-title">Does learning pay off? <small>shadow A/B, never served</small></h3>
            {abtest.bandit.count ? (
              <div className="grid gap-3">
                {pol.map((p) => (
                  <div key={p.k} className="grid gap-1">
                    <div className="grid grid-cols-[140px_1fr_76px] items-center gap-2.5 text-[13px] text-dim">
                      <span>{p.k}</span>
                      <Bar v={p.s.spendUsd / maxSpend} tone={p.tone} />
                      <span className="num text-right text-xs text-ink">{usd(p.s.spendUsd)}</span>
                    </div>
                    <span className="pl-[150px] text-xs text-mute max-sm:pl-0">
                      avg quality {p.s.count ? (p.s.qualitySum / p.s.count).toFixed(2) : "–"}
                    </span>
                  </div>
                ))}
                <p className="lead">Estimated for your session: each routed prompt is priced as if it went to the flagship or a random model, using their usual quality.</p>
              </div>
            ) : (
              <p className="lead">Each routed prompt is also scored as if it went to the flagship or a random model, so you can compare spend and quality here.</p>
            )}
            {measured && measured.bandit.count > 0 && <Measured m={measured} />}
          </div>
        </div>

        <RewardChart history={history} />

        <div className="panel">
          <h3 className="panel-title">
            Providers
            <small>health and breaker state. Switch one off, then route again to watch the failover.</small>
          </h3>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Model</th><th>Provider</th><th>Status</th>
                  <th className="n">Picks</th><th className="n">Avg quality</th><th className="n">Drift</th><th className="n">$ out / 1M</th><th>Online</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m) => {
                  const f = fleet.find((x) => x.modelId === m.id);
                  const off = state.offline.includes(m.id);
                  const c = circuits[m.id];
                  // Only an open circuit gets a coloured pill; everything else is a quiet dot.
                  const dot = (tone: string, text: string) => (
                    <span className="flex items-center gap-2"><i className={`h-2 w-2 rounded-full ${tone}`} />{text}</span>
                  );
                  const status = off
                    ? dot("bg-mute", "Switched off")
                    : c === "open"
                      ? <span className="pill pill-bad">Circuit open, retrying soon</span>
                      : c === "half-open"
                        ? dot("bg-mute", "Recovering")
                        : f && !f.healthy
                          ? dot("bg-warn", "Recent failure")
                          : dot("bg-good", "Healthy");
                  return (
                    <tr key={m.id}>
                      <td className="text-ink"><span className="flex items-center gap-2"><i className={tierShape(m)} />{m.label}</span></td>
                      <td>{m.provider}</td>
                      <td>{status}</td>
                      <td className="n">{f?.picks ?? 0}</td>
                      <td className="n">{f?.picks ? f.avgQuality.toFixed(2) : "–"}</td>
                      <td className="n">{f?.picks && f.drift ? (f.drift > 0 ? "+" : "") + f.drift.toFixed(2) : "–"}</td>
                      <td className="n">${m.priceOut}</td>
                      <td>
                        <button
                          type="button"
                          role="switch"
                          className="switch"
                          aria-checked={!off}
                          aria-label={`${m.label} online`}
                          onClick={() => onToggle(m.id, !off)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="lead">Prices are reference prices; the demo roster uses free-tier models.</p>
        </div>

        <div className="panel">
          <h3 className="panel-title">History <small>select a row to open the inspector</small></h3>
          {history.length ? (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[640px]">
                <thead>
                  <tr><th>Prompt</th><th>Model</th><th className="n">Cost</th><th className="n">Latency</th><th className="n">Quality</th></tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr
                      key={r.id}
                      data-clickable
                      tabIndex={0}
                      aria-label={`Inspect: ${r.prompt}`}
                      onClick={() => onInspect(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onInspect(r.id);
                        }
                      }}
                    >
                      <td className="max-w-[360px] truncate text-ink">{r.prompt}</td>
                      <td>
                        {r.cached ? "Cache" : model(r.modelId).label}
                        {r.stages.some((s) => s.key === "failover") && <span className="text-warn"> (failover)</span>}
                        {r.failed && <span className="text-bad"> (failed)</span>}
                      </td>
                      <td className="n">{usd(r.costUsd)}</td>
                      <td className="n">{ms(r.latencyMs)}</td>
                      <td className="n">{r.cached ? "–" : r.quality.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="lead">No requests yet. Every prompt you route lands here and survives a reload.</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Reward per routed request, oldest first, with a 5-request rolling average. */
function RewardChart({ history }: { history: RequestRecord[] }) {
  const pts = [...history].reverse().filter((r) => !r.cached && !r.failed).map((r) => r.reward);
  const W = 640;
  const H = 150;
  const pad = { l: 34, r: 56, t: 12, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (pts.length > 1 ? (i / (pts.length - 1)) * iw : iw / 2);
  const y = (v: number) => pad.t + (1 - Math.max(0, Math.min(1, v))) * ih;
  const avg = pts.map((_, i) => {
    const w = pts.slice(Math.max(0, i - 4), i + 1);
    return w.reduce((a, b) => a + b, 0) / w.length;
  });
  const line = avg.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = avg[avg.length - 1];

  return (
    <div className="panel">
      <h3 className="panel-title">
        Is routing getting better?
        <small>reward per routed request, line = average of the last 5</small>
      </h3>
      {pts.length < 2 ? (
        <p className="lead">Route two or more prompts to see the reward trend.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Reward across ${pts.length} routed requests; latest 5-request average ${last.toFixed(2)}`}>
            {[0, 0.5, 1].map((v) => (
              <g key={v}>
                <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
                <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--mute)" className="num">{v.toFixed(1)}</text>
              </g>
            ))}
            {pts.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="var(--dim)" opacity="0.55" />
            ))}
            <path d={line} fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(avg.length - 1)} cy={y(last)} r="5" fill="var(--acc)" stroke="var(--card)" strokeWidth="2" />
            <text x={x(avg.length - 1) + 10} y={y(last) + 4} fontSize="12" fill="var(--ink)" className="num">{last.toFixed(2)}</text>
            <text x={pad.l} y={H - 6} fontSize="11" fill="var(--mute)">first</text>
            <text x={W - pad.r} y={H - 6} fontSize="11" fill="var(--mute)" textAnchor="end">latest ({pts.length})</text>
          </svg>
          <p className="lead">Reward mixes quality, cost and speed under the weights you chose. It also depends on which prompts you send, so the line can dip.</p>
        </>
      )}
    </div>
  );
}

/** Real shadow calls on a 1-in-10 sample: all three policies answered the same prompts. */
function Measured({ m }: { m: NonNullable<GatewayState["measured"]> }) {
  const rows = [
    { k: "Multiplexer (live)", s: m.bandit, tone: "acc" as const },
    { k: "Always flagship", s: m.static, tone: "dim" as const },
    { k: "Random model", s: m.random, tone: "dim" as const },
  ];
  const max = Math.max(...rows.map((r) => r.s.spendUsd), 1e-9);
  return (
    <div className="grid gap-2.5 border-t border-line pt-3">
      <p className="text-[13px] font-semibold">
        Measured on {m.bandit.count} sampled prompt{m.bandit.count === 1 ? "" : "s"}
        <span className="font-normal text-mute"> (real calls, all visitors)</span>
      </p>
      {rows.map((r) => (
        <div key={r.k} className="grid grid-cols-[140px_1fr_76px] items-center gap-2.5 text-[13px] text-dim">
          <span>{r.k}</span>
          <Bar v={r.s.spendUsd / max} tone={r.tone} />
          <span className="num text-right text-xs text-ink">
            {usd(r.s.spendUsd)} · q {(r.s.qualitySum / r.s.count).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
