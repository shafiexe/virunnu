import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/services/booking.service";

export async function GET(req: NextRequest) {
  // on a live site the secret must exist and must match; a missing secret means "refuse", never "let everyone in"
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (process.env.NODE_ENV === "production" && (!secret || given !== secret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const released = await releaseExpiredHolds();
  return NextResponse.json({ released });
}
