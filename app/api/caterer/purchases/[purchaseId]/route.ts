import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { purchaseSchema, purchaseTotals } from "@/lib/caterer-purchases";
import { checkLinks } from "@/lib/caterer-purchases-server";
import { resolveSupplier } from "@/lib/caterer-suppliers-server";

type Params = { params: Promise<{ purchaseId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { purchaseId } = await params;
  const purchase = await db.catererPurchase.findFirst({ where: { id: purchaseId, catererId: ctx.caterer.id }, include: { lines: { orderBy: { sortOrder: "asc" } } } });
  if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ purchase });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { purchaseId } = await params;
  const existing = await db.catererPurchase.findFirst({ where: { id: purchaseId, catererId: ctx.caterer.id }, select: { id: true, paidPaise: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = purchaseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const { lines, totalPaise } = purchaseTotals(d);
  // Payments already made are kept; the new total can't drop below what has been paid
  if (existing.paidPaise > totalPaise) return NextResponse.json({ error: "The bill total can't be less than what you have already paid. Undo a payment first." }, { status: 400 });
  const bad = await checkLinks(ctx.caterer.id, ctx.caterer.orgId!, d.employeeId, d.orderId);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });

  const purchase = await db.$transaction(async (tx) => {
    await tx.catererPurchaseLine.deleteMany({ where: { purchaseId } });
    const sup = await resolveSupplier(tx, ctx.caterer.id, d);
    return tx.catererPurchase.update({
      where: { id: purchaseId },
      data: {
        date: new Date(d.date), supplier: sup.name, supplierId: sup.id, billNo: d.billNo ?? null, category: d.category, totalPaise,
        employeeId: d.employeeId ?? null, orderId: d.orderId ?? null, notes: d.notes ?? null,
        lines: { create: lines },
      },
    });
  });
  return NextResponse.json({ purchase });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { purchaseId } = await params;
  const existing = await db.catererPurchase.findFirst({ where: { id: purchaseId, catererId: ctx.caterer.id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.catererPurchase.delete({ where: { id: purchaseId } });
  return NextResponse.json({ ok: true });
}
