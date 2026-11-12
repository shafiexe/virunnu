import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// For an uptime monitor: 200 when the app can reach the database, 503 when it cannot. Reveals nothing else.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
