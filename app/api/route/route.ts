import { NextResponse } from "next/server";
import { handleRequest } from "@/lib/engine";
import { computeState, ensureSeeded } from "@/lib/state";
import { consume } from "@/lib/tenants";
import type { Weights } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Per-tenant rate limit. No key ⇒ the generous "public" tenant, so the
  // homepage demo is never throttled; a real tenant key gets its own bucket.
  const apiKey = req.headers.get("x-api-key");
  const rl = consume(apiKey, Date.now());
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded for ${rl.tenant.name}. Retry in ${Math.ceil(rl.retryMs / 1000)}s.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.retryMs / 1000)),
          "X-RateLimit-Limit": String(rl.tenant.rpm),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let body: { prompt?: string; weights?: Weights } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").toString().trim();
  if (!prompt) {
    return NextResponse.json(
      { error: "A prompt is required." },
      { status: 422 },
    );
  }
  if (prompt.length > 4000) {
    return NextResponse.json(
      { error: "Prompt exceeds 4000 characters." },
      { status: 422 },
    );
  }

  const weights = sanitizeWeights(body.weights);
  await ensureSeeded();
  const record = await handleRequest(prompt, weights);
  return NextResponse.json(
    { record, state: computeState() },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Limit": String(rl.tenant.rpm),
        "X-RateLimit-Remaining": String(rl.remaining),
      },
    },
  );
}

function sanitizeWeights(w?: Weights): Weights | undefined {
  if (!w) return undefined;
  const q = num(w.quality),
    c = num(w.cost),
    l = num(w.latency);
  const sum = q + c + l;
  if (sum <= 0) return undefined;
  return { quality: q / sum, cost: c / sum, latency: l / sum };
}
function num(x: unknown): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
