// Per-tenant API keys + rate limiting.
//
// The public demo has no key: requests without `x-api-key` use the "public"
// tenant (600 requests/minute). Real tenants come from MUX_TENANTS, formatted
// `key:Name:rpm` and comma-separated, e.g. MUX_TENANTS=mux_live_abc:Acme:60.
//
// With Upstash Redis the limit is a fixed one-minute window counted with
// INCR + EXPIRE, shared by every instance. Without Redis it falls back to an
// in-memory token bucket per instance.

import { HAS_REDIS, redisPipeline } from "./upstash";

export type Tenant = { key: string; name: string; rpm: number };

export type RateResult = { ok: boolean; tenant: Tenant; remaining: number; retryMs: number };

const PUBLIC: Tenant = { key: "public", name: "Public demo", rpm: 600 };

function parseTenants(): Map<string, Tenant> {
  const m = new Map<string, Tenant>([[PUBLIC.key, PUBLIC]]);
  for (const part of (process.env.MUX_TENANTS ?? "").split(",")) {
    const [key, name, rpm] = part.trim().split(":");
    const n = Number(rpm);
    if (key && name && Number.isFinite(n) && n > 0) m.set(key, { key, name, rpm: n });
  }
  return m;
}

const TENANTS = parseTenants();

export function listTenants(): Tenant[] {
  return [...TENANTS.values()];
}

function resolve(key: string | null): Tenant {
  return (key && TENANTS.get(key)) || PUBLIC;
}

// In-memory fallback: continuous-refill token bucket.
type Bucket = { tokens: number; last: number };
const g = globalThis as unknown as { __muxBuckets?: Map<string, Bucket> };
const buckets = () => (g.__muxBuckets ??= new Map());

function consumeLocal(t: Tenant, now: number): RateResult {
  const b = buckets().get(t.key) ?? { tokens: t.rpm, last: now };
  b.tokens = Math.min(t.rpm, b.tokens + ((now - b.last) / 60_000) * t.rpm);
  b.last = now;
  buckets().set(t.key, b);
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return { ok: true, tenant: t, remaining: Math.floor(b.tokens), retryMs: 0 };
  }
  return { ok: false, tenant: t, remaining: 0, retryMs: Math.ceil(((1 - b.tokens) / t.rpm) * 60_000) };
}

/** Count one request against the tenant's per-minute limit. */
export async function consume(key: string | null, now: number): Promise<RateResult> {
  const t = resolve(key);
  if (!HAS_REDIS) return consumeLocal(t, now);
  const window = Math.floor(now / 60_000);
  const k = `mux:rl:${t.key}:${window}`;
  try {
    const [count] = (await redisPipeline([
      ["INCR", k],
      ["EXPIRE", k, 120],
      ["INCR", `mux:used:${t.key}`],
    ])) as number[];
    if (count <= t.rpm) return { ok: true, tenant: t, remaining: t.rpm - count, retryMs: 0 };
    return { ok: false, tenant: t, remaining: 0, retryMs: (window + 1) * 60_000 - now };
  } catch {
    return consumeLocal(t, now);
  }
}

/** Lifetime request count per tenant (Redis only; 0 without it). */
export async function tenantUsage(): Promise<Record<string, number>> {
  if (!HAS_REDIS) return {};
  try {
    const rows = (await redisPipeline(listTenants().map((t) => ["GET", `mux:used:${t.key}`]))) as (string | null)[];
    return Object.fromEntries(listTenants().map((t, i) => [t.key, Number(rows[i] ?? 0)]));
  } catch {
    return {};
  }
}
