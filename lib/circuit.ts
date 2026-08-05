import type { CircuitState } from "./types";

// Per-provider circuit breaker. After N consecutive failures a provider's circuit
// trips OPEN and routing skips it (like a failure, but automatic and temporary).
// After a cooldown it goes HALF-OPEN - one trial request is allowed; success
// closes it, another failure re-opens it. This stops the router from hammering a
// down/rate-limited provider while letting it recover on its own.

const THRESHOLD = 3; // consecutive failures to trip
const COOLDOWN_MS = 20_000; // open → half-open

type Breaker = { fails: number; openedAt: number };

const g = globalThis as unknown as { __muxBreakers?: Map<string, Breaker> };
function breakers(): Map<string, Breaker> {
  if (!g.__muxBreakers) g.__muxBreakers = new Map();
  return g.__muxBreakers;
}
function get(id: string): Breaker {
  const b = breakers();
  let x = b.get(id);
  if (!x) {
    x = { fails: 0, openedAt: 0 };
    b.set(id, x);
  }
  return x;
}

export function circuitState(id: string, now: number): CircuitState {
  const b = get(id);
  if (b.fails < THRESHOLD) return "closed";
  return now - b.openedAt >= COOLDOWN_MS ? "half-open" : "open";
}

/** True if the provider may take traffic right now (closed or half-open trial). */
export function circuitAllows(id: string, now: number): boolean {
  return circuitState(id, now) !== "open";
}

export function recordSuccess(id: string): void {
  const b = get(id);
  b.fails = 0;
  b.openedAt = 0;
}

export function recordFailure(id: string, now: number): void {
  const b = get(id);
  b.fails += 1;
  if (b.fails === THRESHOLD) b.openedAt = now;
}

export function breakerFails(id: string): number {
  return get(id).fails;
}
