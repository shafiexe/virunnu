import { NextRequest, NextResponse } from "next/server";
import { catererPrefill, parseImages } from "@/lib/caterer-prefill";
import { clientIp, rateLimited } from "@/lib/rate-limit";

// Public: lets a catering team fill its application from its links, text or menu-card photos.
export async function POST(req: NextRequest) {
  if (rateLimited(`apply-ai:${clientIp(req)}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many AI requests. Please wait a few minutes or fill the form by hand." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const { status, body: result } = await catererPrefill(
    typeof body?.text === "string" ? body.text.slice(0, 8000) : "",
    parseImages(body?.images)
  );
  return NextResponse.json(result, { status });
}
