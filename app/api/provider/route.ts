import { NextResponse } from "next/server";
import { setOffline } from "@/lib/store";
import { MODEL_BY_ID } from "@/lib/models";
import { computeState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Toggle a provider offline / online - drives the failover demo.
export async function POST(req: Request) {
  let body: { modelId?: string; offline?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const modelId = (body.modelId ?? "").toString();
  if (!MODEL_BY_ID.has(modelId)) {
    return NextResponse.json({ error: "Unknown model." }, { status: 422 });
  }
  setOffline(modelId, !!body.offline);
  return NextResponse.json(
    { state: computeState() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
