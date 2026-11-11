import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { staffPaymentSchema } from "@/lib/caterer-staff";

// Correct a payment entered wrongly: amount, date, kind, how it was paid, or the note.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { paymentId } = await params;
  const existing = await db.catererStaffPayment.findFirst({ where: { id: paymentId, catererId: ctx.caterer.id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = staffPaymentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const date = d.date ? new Date(d.date) : undefined;
  const payment = await db.catererStaffPayment.update({
    where: { id: paymentId },
    data: { amountPaise: Math.round(d.amount * 100), kind: d.kind, method: d.method, note: d.note ?? null, ...(date ? { date, forMonth: date.toISOString().slice(0, 7) } : {}) },
  });
  return NextResponse.json({ payment });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { paymentId } = await params;
  const p = await db.catererStaffPayment.findFirst({ where: { id: paymentId, catererId: ctx.caterer.id }, select: { id: true } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.catererStaffPayment.delete({ where: { id: paymentId } });
  return NextResponse.json({ ok: true });
}
