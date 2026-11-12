import { NextResponse } from "next/server";
import { getCatererForSession } from "@/lib/caterer-session";
import { buildSummary, sendSummary } from "@/lib/caterer-summary";

// What tonight's summary would say
export async function GET() {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { subject, text } = await buildSummary(ctx.caterer);
  return NextResponse.json({ subject, text });
}

// Send it now, the way the caterer chose, so they can see it works
export async function POST() {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const r = await sendSummary(ctx.caterer);
  return NextResponse.json(r);
}
