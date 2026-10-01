// Minimal Upstash REST clients (Redis + Vector) over fetch - no SDK dependency.
// Both are optional: without their env vars the gateway falls back to
// in-process memory, which is also what local benchmarks use.

const env = (k: string) => (process.env[k] ?? "").trim();

const REDIS_URL = env("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = env("UPSTASH_REDIS_REST_TOKEN");
const VECTOR_URL = env("UPSTASH_VECTOR_REST_URL");
const VECTOR_TOKEN = env("UPSTASH_VECTOR_REST_TOKEN");

export const HAS_REDIS = !!(REDIS_URL && REDIS_TOKEN);
export const HAS_VECTOR = !!(VECTOR_URL && VECTOR_TOKEN);

const TIMEOUT_MS = 2500;

async function call<T>(url: string, token: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result as T;
}

/** Run one Redis command, e.g. redis(["GET", "key"]). */
export function redis<T = unknown>(command: (string | number)[]): Promise<T> {
  return call<T>(REDIS_URL, REDIS_TOKEN, command);
}

/** Run several Redis commands in one round trip; returns each command's result. */
export async function redisPipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const rows = (await res.json()) as { result?: unknown; error?: string }[];
  return rows.map((r) => r.result);
}

/** Call an Upstash Vector REST endpoint, e.g. vector("query-data/ns", {...}). */
export function vector<T = unknown>(path: string, body?: unknown, method = "POST"): Promise<T> {
  return call<T>(`${VECTOR_URL}/${path}`, VECTOR_TOKEN, body, method);
}
