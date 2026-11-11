import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { centerPrefill } from "@/lib/center-prefill";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const { status, body: result } = await centerPrefill(typeof body?.text === "string" ? body.text : "");
  return NextResponse.json(result, { status });
}
