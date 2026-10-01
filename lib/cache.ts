// Similarity cache - skip the model call when a near-identical request was
// already answered.
//
// Two backends, chosen at runtime:
//  - semantic: Upstash Vector embeds the prompt with OpenAI text-embedding-3-small
//    (hosted by Upstash) and returns the nearest stored prompt. Upstash reports
//    cosine similarity rescaled to 0..1 ((1 + cos) / 2). Hits at >= 0.92: on our
//    calibration pairs paraphrases scored 0.926-0.972 and the closest *different*
//    question scored 0.898.
//  - lexical (fallback, and the default without Upstash): hashed character
//    trigrams in a 256-d vector, cosine >= 0.86, kept in process memory. It
//    catches near-duplicates and small rewordings, not paraphrases.
// If the Vector call fails, the lexical cache answers instead.

import { HAS_VECTOR, vector } from "./upstash";

export type CacheMode = "semantic" | "lexical";

export const SEMANTIC_THRESHOLD = 0.92;
export const LEXICAL_THRESHOLD = 0.86;

const NAMESPACE = "mux-cache";
const DIM = 256;
const CAP = 300;
const MAX_RESPONSE_CHARS = 6000; // Vector metadata is capped per entry

export type CacheEntry = { prompt: string; response: string; modelId: string };

export type CacheLookup = {
  hit: boolean;
  similarity: number;
  threshold: number;
  mode: CacheMode;
  entry?: CacheEntry;
};

// ── Lexical fallback (in-process) ───────────────────────────────────────────
type LocalEntry = CacheEntry & { vec: Float32Array };
const g = globalThis as unknown as { __muxCache?: LocalEntry[] };
const local = () => (g.__muxCache ??= []);

function trigramVector(text: string): Float32Array {
  const v = new Float32Array(DIM);
  const t = ` ${text.toLowerCase().replace(/\s+/g, " ").trim()} `;
  for (let i = 0; i < t.length - 2; i++) {
    let h = 2166136261;
    for (let k = 0; k < 3; k++) {
      h ^= t.charCodeAt(i + k);
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

function lexicalLookup(prompt: string): CacheLookup {
  const vec = trigramVector(prompt);
  let best: LocalEntry | undefined;
  let bestSim = 0;
  for (const e of local()) {
    let s = 0;
    for (let i = 0; i < DIM; i++) s += vec[i] * e.vec[i];
    if (s > bestSim) {
      bestSim = s;
      best = e;
    }
  }
  return {
    hit: bestSim >= LEXICAL_THRESHOLD,
    similarity: bestSim,
    threshold: LEXICAL_THRESHOLD,
    mode: "lexical",
    entry: best,
  };
}

function lexicalRemember(entry: CacheEntry): void {
  const arr = local();
  arr.unshift({ ...entry, vec: trigramVector(entry.prompt) });
  if (arr.length > CAP) arr.length = CAP;
}

// ── Semantic (Upstash Vector) ───────────────────────────────────────────────
type VectorMatch = { id: string; score: number; metadata?: CacheEntry };

async function semanticLookup(prompt: string): Promise<CacheLookup> {
  const res = await vector<VectorMatch[]>(`query-data/${NAMESPACE}`, {
    data: prompt,
    topK: 1,
    includeMetadata: true,
  });
  const top = res?.[0];
  const similarity = top?.score ?? 0;
  return {
    hit: !!top?.metadata && similarity >= SEMANTIC_THRESHOLD,
    similarity,
    threshold: SEMANTIC_THRESHOLD,
    mode: "semantic",
    entry: top?.metadata,
  };
}

function idFor(prompt: string): string {
  let h = 2166136261;
  for (let i = 0; i < prompt.length; i++) {
    h ^= prompt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `p_${(h >>> 0).toString(36)}_${prompt.length}`;
}

export async function lookup(prompt: string): Promise<CacheLookup> {
  if (HAS_VECTOR) {
    try {
      return await semanticLookup(prompt);
    } catch {
      /* Vector unavailable: fall through to the in-process cache */
    }
  }
  return lexicalLookup(prompt);
}

export async function remember(prompt: string, response: string, modelId: string): Promise<void> {
  const entry = { prompt, response: response.slice(0, MAX_RESPONSE_CHARS), modelId };
  lexicalRemember(entry);
  if (!HAS_VECTOR) return;
  try {
    await vector(`upsert-data/${NAMESPACE}`, [{ id: idFor(prompt), data: prompt, metadata: entry }]);
  } catch {
    /* best effort: the lexical copy still serves this instance */
  }
}
