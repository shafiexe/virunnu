import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { catererPrefill, parseImages } from "@/lib/caterer-prefill";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const { status, body: result } = await catererPrefill(
    typeof body?.text === "string" ? body.text : "",
    parseImages(body?.images)
  );
  return NextResponse.json(result, { status });
}
