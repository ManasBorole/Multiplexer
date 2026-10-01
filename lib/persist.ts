// Loads gateway state from Upstash Redis before a request and saves it after,
// so the bandit's learning, breaker state and A/B tallies survive cold starts
// and are shared by every serverless instance.
//
// ponytail: whole-state snapshot with last-write-wins. Two requests finishing at
// the same moment on different instances can drop one update; fine at demo
// traffic. Move arms to per-key HSETs with WATCH/MULTI if that ever matters.

import { HAS_REDIS, redis } from "./upstash";
import { restoreStore, snapshotStore, type StoreSnapshot } from "./store";
import { restoreBreakers, snapshotBreakers } from "./circuit";

const KEY = "mux:state:v1";

type Persisted = StoreSnapshot & { breakers: ReturnType<typeof snapshotBreakers> };

/** Pull the latest shared state into this instance. No-op without Redis. */
export async function hydrate(): Promise<void> {
  if (!HAS_REDIS) return;
  try {
    const raw = await redis<string | null>(["GET", KEY]);
    if (!raw) return;
    const data = JSON.parse(raw) as Persisted;
    restoreStore(data);
    restoreBreakers(data.breakers);
  } catch {
    /* Redis unreachable: keep serving from this instance's memory */
  }
}

/** Push this instance's state back to Redis. No-op without Redis. */
export async function persist(): Promise<void> {
  if (!HAS_REDIS) return;
  try {
    const data: Persisted = { ...snapshotStore(), breakers: snapshotBreakers() };
    await redis(["SET", KEY, JSON.stringify(data)]);
  } catch {
    /* best effort: the next request will try again */
  }
}
