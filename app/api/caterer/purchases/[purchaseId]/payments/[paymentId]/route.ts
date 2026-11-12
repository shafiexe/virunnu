import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";

type Params = { params: Promise<{ purchaseId: string; paymentId: string }> };

// Undo a supplier payment entered by mistake.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { purchaseId, paymentId } = await params;
  const payment = await db.catererPurchasePayment.findFirst({ where: { id: paymentId, purchaseId, purchase: { catererId: ctx.caterer.id } } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.$transaction([
    db.catererPurchasePayment.delete({ where: { id: paymentId } }),
    db.catererPurchase.update({ where: { id: purchaseId }, data: { paidPaise: { decrement: payment.amountPaise } } }),
  ]);
  return NextResponse.json({ ok: true });
}
