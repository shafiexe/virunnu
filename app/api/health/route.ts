import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// For an uptime monitor: 200 when the app can reach the database, 503 when it cannot. Reveals nothing else.
export async function GET() {
  try {
    // a database that hangs counts as down, so the monitor is not left waiting
    await Promise.race([db.$queryRaw`SELECT 1`, new Promise((_, no) => setTimeout(() => no(new Error("slow")), 5000))]);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
