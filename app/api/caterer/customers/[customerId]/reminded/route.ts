import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";

// Records that a reminder went out (or that the customer was snoozed), so they rest off the follow-up list for a few days. { clear: true } takes that back.
export async function POST(req: NextRequest, { params }: { params: Promise<{ customerId: string }> }) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { customerId } = await params;
  const body = z.object({ clear: z.boolean().optional() }).safeParse(await req.json().catch(() => ({})));
  const result = await db.catererCustomer.updateMany({
    where: { id: customerId, catererId: ctx.caterer.id },
    data: { lastRemindedAt: body.success && body.data.clear ? null : new Date() },
  });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
