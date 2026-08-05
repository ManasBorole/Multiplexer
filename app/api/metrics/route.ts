import { computeMetrics, computeFleet } from "@/lib/state";
import { MODEL_BY_ID } from "@/lib/models";
import { listTenants } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Prometheus text exposition (OpenMetrics-compatible). Scrape at /api/metrics.
export async function GET() {
  const m = computeMetrics();
  const fleet = computeFleet();
  const lines: string[] = [];

  const metric = (
    name: string,
    help: string,
    type: string,
    value: number,
    labels = "",
  ) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
    lines.push(`${name}${labels} ${value}`);
  };

  metric("mux_requests_total", "Total requests handled.", "counter", m.total);
  metric("mux_routed_total", "Requests routed to a provider (non-cache).", "counter", m.routed);
  metric("mux_cache_hits_total", "Semantic cache hits.", "counter", m.cacheHits);
  metric("mux_failures_total", "Requests that hit a provider failure.", "counter", m.failures);
  metric("mux_spend_usd", "Total spend (list-price reference).", "gauge", m.spendUsd);
  metric("mux_saved_usd", "Spend saved vs always-flagship routing.", "gauge", m.savedUsd);
  metric("mux_avg_latency_ms", "Average end-to-end latency.", "gauge", m.avgLatencyMs);
  metric("mux_p95_latency_ms", "p95 latency.", "gauge", m.p95LatencyMs);
  metric("mux_avg_quality", "Average judged quality (0..1).", "gauge", m.avgQuality);
  metric("mux_cache_hit_rate", "Cache hit rate (0..1).", "gauge", m.cacheHitRate);

  // Per-model picks + circuit state (0 closed, 1 half-open, 2 open).
  lines.push("# HELP mux_model_picks_total Requests routed to each model.");
  lines.push("# TYPE mux_model_picks_total counter");
  for (const f of fleet) {
    const label = MODEL_BY_ID.get(f.modelId)?.label ?? f.modelId;
    lines.push(`mux_model_picks_total{model="${label}"} ${f.picks}`);
  }
  lines.push("# HELP mux_model_circuit Circuit-breaker state (0 closed,1 half-open,2 open).");
  lines.push("# TYPE mux_model_circuit gauge");
  for (const f of fleet) {
    const label = MODEL_BY_ID.get(f.modelId)?.label ?? f.modelId;
    const v = f.circuit === "open" ? 2 : f.circuit === "half-open" ? 1 : 0;
    lines.push(`mux_model_circuit{model="${label}"} ${v}`);
  }

  // Per-tenant request counts.
  lines.push("# HELP mux_tenant_requests_total Lifetime requests per tenant.");
  lines.push("# TYPE mux_tenant_requests_total counter");
  for (const t of listTenants()) {
    lines.push(`mux_tenant_requests_total{tenant="${t.name}"} ${t.used}`);
  }

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
