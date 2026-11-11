import { NextRequest, NextResponse } from "next/server";
import { centerPrefill } from "@/lib/center-prefill";
import { clientIp, rateLimited } from "@/lib/rate-limit";

// Public: lets a convention center fill its application from its website / pasted text.
export async function POST(req: NextRequest) {
  if (rateLimited(`apply-ai:${clientIp(req)}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many AI requests. Please wait a few minutes or fill the form by hand." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const { status, body: result } = await centerPrefill(typeof body?.text === "string" ? body.text.slice(0, 8000) : "");
  return NextResponse.json(result, { status });
}
