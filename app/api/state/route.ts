import { NextResponse } from "next/server";
import { computeState, ensureSeeded } from "@/lib/state";
import { hydrate } from "@/lib/persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await hydrate();
  await ensureSeeded();
  return NextResponse.json(computeState(), {
    headers: { "Cache-Control": "no-store" },
  });
}
