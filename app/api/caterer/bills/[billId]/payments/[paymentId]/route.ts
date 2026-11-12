import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { actorOf, logActivity } from "@/lib/activity";

type Params = { params: Promise<{ billId: string; paymentId: string }> };

// Undo a payment entered by mistake; the bill's received total goes back down.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { billId, paymentId } = await params;

  const payment = await db.catererPayment.findFirst({ where: { id: paymentId, billId, bill: { catererId: ctx.caterer.id } } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.$transaction([
    db.catererPayment.delete({ where: { id: paymentId } }),
    db.catererBill.update({ where: { id: billId }, data: { receivedPaise: { decrement: payment.amountPaise } } }),
  ]);
  await logActivity(ctx.session, `Took back a payment of ₹${(payment.amountPaise / 100).toLocaleString("en-IN")}`);
  return NextResponse.json({ ok: true });
}
