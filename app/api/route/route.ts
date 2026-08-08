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

  // Stream the lifecycle as newline-delimited JSON: `token` frames carry the
  // answer as it generates, and a final `done` frame carries the full record +
  // state (routing decision, judge, cost, latency) once scoring completes. This
  // lets the UI show the answer forming instead of blocking on the whole call.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const record = await handleRequest(prompt, weights, (t) =>
          send({ type: "token", v: t }),
        );
        send({ type: "done", record, state: computeState() });
      } catch {
        send({ type: "error", error: "Request failed while routing." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-RateLimit-Limit": String(rl.tenant.rpm),
      "X-RateLimit-Remaining": String(rl.remaining),
    },
  });
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
