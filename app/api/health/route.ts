import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const HEADERS = { "Cache-Control": "no-store" };

// For an uptime monitor. Reveals nothing else.
//   /api/health        200 when the site answers. It does not touch the database, so a monitor calling it every few minutes
//                      cannot keep a sleeping (pay-per-use) database awake.
//   /api/health?db=1   also needs the database to answer: 200 when it does, 503 when it does not. Call this one rarely (hourly).
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("db") !== "1") return NextResponse.json({ ok: true }, { headers: HEADERS });
  try {
    // a database that hangs counts as down, so the monitor is not left waiting; a sleeping one needs a few seconds to wake
    await Promise.race([db.$queryRaw`SELECT 1`, new Promise((_, no) => setTimeout(() => no(new Error("slow")), 8000))]);
    return NextResponse.json({ ok: true, db: true }, { headers: HEADERS });
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 503, headers: HEADERS });
  }
}
