// OpenRouter access with multi-key rotation.
//
// The free tier caps each account at 50 model requests/day. Supplying more than
// one key (from separate accounts) pools their daily allowances: when one key
// returns 429 (free-models-per-day), the next key is tried automatically. Add
// keys via OPENROUTER_API_KEY and OPENROUTER_API_KEY_2 (…_3, _4 also work).

const KEYS: string[] = [
  process.env.OPENROUTER_API_KEY,
  process.env.OPENROUTER_API_KEY_2,
  process.env.OPENROUTER_API_KEY_3,
  process.env.OPENROUTER_API_KEY_4,
]
  .map((k) => (k ?? "").trim())
  .filter(Boolean);

/** True when at least one key is configured (otherwise the app runs simulated). */
export const HAS_KEY = KEYS.length > 0;

export const KEY_COUNT = KEYS.length;

// Remembered across requests so we don't re-probe an exhausted key every time:
// once a key 429s we advance, and subsequent requests start from the working
// one. When an exhausted key's daily quota resets, the loop wraps back to it.
let cursor = 0;

/**
 * Run `makeRequest(key)` against each configured key, starting from the
 * last-known-good one. A 429 (rate-limited) advances to the next key; any other
 * status (success or a real error) is returned as-is. Returns the final 429
 * response only if every key is exhausted. Throws if no key is configured.
 */
export async function fetchWithKeyRotation(
  makeRequest: (key: string) => Promise<Response>,
): Promise<Response> {
  if (!KEYS.length) throw new Error("No OpenRouter API key configured.");
  let last: Response | null = null;
  for (let i = 0; i < KEYS.length; i++) {
    const idx = (cursor + i) % KEYS.length;
    // eslint-disable-next-line no-await-in-loop
    const res = await makeRequest(KEYS[idx]);
    if (res.status !== 429) {
      cursor = idx; // stick to the key that worked
      return res;
    }
    last = res; // this key is over its daily cap - try the next
  }
  return last as Response; // all keys exhausted
}
