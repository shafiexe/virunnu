import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSummary } from "@/lib/caterer-summary";

// Runs once each night (see vercel.json). Vercel sends the secret as a bearer token; the older routes use x-cron-secret.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (process.env.NODE_ENV === "production" && (!secret || given !== secret)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00Z");
  const due = await db.caterer.findMany({
    where: { summaryEnabled: true, disabled: false, approved: true, orgId: { not: null }, OR: [{ lastSummaryOn: null }, { lastSummaryOn: { lt: today } }] },
    select: { id: true, orgId: true, name: true, phone: true, whatsappNumber: true, email: true, summaryVia: true, summaryEmail: true },
  });

  let sent = 0, failed = 0;
  for (const c of due) {
    try {
      const r = await sendSummary(c);
      const ok = r.whatsapp === "sent" || r.email === "sent";
      // mark the day done only when something went out, so a failure is tried again on the next run
      if (ok) { await db.caterer.update({ where: { id: c.id }, data: { lastSummaryOn: today } }); sent++; } else failed++;
    } catch { failed++; }
  }
  return NextResponse.json({ checked: due.length, sent, failed });
}
