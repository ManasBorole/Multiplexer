// Per-tenant API keys + token-bucket rate limiting (in-memory, single instance).
//
// ponytail: in-memory buckets. Back with Upstash Redis (INCR + EXPIRE, or a
// sorted-set sliding window) when you need limits shared across serverless
// instances - the check/consume interface below is the seam.
//
// The public demo has no key: requests without `x-api-key` fall through to a
// generous "public" tenant so the homepage is never rate-limited.

export type Tenant = {
  key: string;
  name: string;
  rpm: number; // requests per minute
  tokens: number; // current bucket
  last: number; // last refill (ms)
  used: number; // lifetime requests
};

const g = globalThis as unknown as { __muxTenants?: Map<string, Tenant> };

function seed(): Map<string, Tenant> {
  const m = new Map<string, Tenant>();
  const now = 0;
  m.set("public", { key: "public", name: "Public demo", rpm: 600, tokens: 600, last: now, used: 0 });
  m.set("mux_live_ACME", { key: "mux_live_ACME", name: "Acme Corp", rpm: 60, tokens: 60, last: now, used: 0 });
  m.set("mux_live_GLOBEX", { key: "mux_live_GLOBEX", name: "Globex", rpm: 20, tokens: 20, last: now, used: 0 });
  return m;
}

function tenants(): Map<string, Tenant> {
  if (!g.__muxTenants) g.__muxTenants = seed();
  return g.__muxTenants;
}

export function listTenants(): Tenant[] {
  return [...tenants().values()];
}

export type RateResult = { ok: boolean; tenant: Tenant; remaining: number; retryMs: number };

/** Refill the bucket, then try to consume one token. */
export function consume(key: string | null, now: number): RateResult {
  const t = tenants().get(key ?? "public") ?? tenants().get("public")!;
  // continuous refill: rpm tokens per 60s
  const elapsed = now - t.last;
  if (elapsed > 0) {
    t.tokens = Math.min(t.rpm, t.tokens + (elapsed / 60_000) * t.rpm);
    t.last = now;
  }
  if (t.tokens >= 1) {
    t.tokens -= 1;
    t.used += 1;
    return { ok: true, tenant: t, remaining: Math.floor(t.tokens), retryMs: 0 };
  }
  const retryMs = Math.ceil(((1 - t.tokens) / t.rpm) * 60_000);
  return { ok: false, tenant: t, remaining: 0, retryMs };
}
