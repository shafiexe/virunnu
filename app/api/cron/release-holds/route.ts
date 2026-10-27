import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/services/booking.service";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const released = await releaseExpiredHolds();
  return NextResponse.json({ released });
}
