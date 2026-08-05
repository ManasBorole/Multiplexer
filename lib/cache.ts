// Semantic cache - skip the model call when a similar request was already answered.
//
// Prompts are embedded into a fixed-width vector (hashed character trigrams,
// L2-normalized) and compared by cosine similarity. It's a real similarity
// cache that catches paraphrases and near-duplicates without any paid vector DB.
//
// ponytail: local hashed-trigram embedding. Swap embed() for a provider or
// Upstash Vector embedding when you want stronger paraphrase recall - the
// cosine/threshold machinery below stays the same.

const DIM = 256;
const THRESHOLD = 0.86;
const CAP = 300;

export type CacheEntry = {
  vec: Float32Array;
  prompt: string;
  response: string;
  modelId: string;
  ts: number;
};

const g = globalThis as unknown as { __muxCache?: CacheEntry[] };
function entries(): CacheEntry[] {
  if (!g.__muxCache) g.__muxCache = [];
  return g.__muxCache;
}

export function embed(text: string): Float32Array {
  const v = new Float32Array(DIM);
  const t = ` ${text.toLowerCase().replace(/\s+/g, " ").trim()} `;
  for (let i = 0; i < t.length - 2; i++) {
    const gram = t.slice(i, i + 3);
    let h = 2166136261;
    for (let k = 0; k < gram.length; k++) {
      h ^= gram.charCodeAt(k);
      h = Math.imul(h, 16777619);
    }
    v[(h >>> 0) % DIM] += 1;
  }
  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < DIM; i++) v[i] /= norm;
  return v;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < DIM; i++) s += a[i] * b[i];
  return s;
}

export type CacheLookup = {
  hit: boolean;
  similarity: number;
  entry?: CacheEntry;
};

export function lookup(vec: Float32Array): CacheLookup {
  let best: CacheEntry | undefined;
  let bestSim = 0;
  for (const e of entries()) {
    const sim = cosine(vec, e.vec);
    if (sim > bestSim) {
      bestSim = sim;
      best = e;
    }
  }
  return { hit: bestSim >= THRESHOLD, similarity: bestSim, entry: best };
}

export function remember(
  vec: Float32Array,
  prompt: string,
  response: string,
  modelId: string,
): void {
  const arr = entries();
  arr.unshift({ vec, prompt, response, modelId, ts: Date.now() });
  if (arr.length > CAP) arr.length = CAP;
}
