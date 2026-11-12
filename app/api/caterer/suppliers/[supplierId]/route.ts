import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { supplierSchema } from "@/lib/caterer-suppliers";

type Params = { params: Promise<{ supplierId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { supplierId } = await params;
  const existing = await db.catererSupplier.findFirst({ where: { id: supplierId, catererId: ctx.caterer.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = supplierSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const clash = await db.catererSupplier.findFirst({ where: { catererId: ctx.caterer.id, id: { not: supplierId }, name: { equals: parsed.data.name, mode: "insensitive" } } });
  if (clash) return NextResponse.json({ error: "You already have a supplier with this name" }, { status: 409 });
  const { phone, notes, ...rest } = parsed.data;
  // a renamed supplier keeps its bills: the name on each purchase follows
  const supplier = await db.$transaction(async (tx) => {
    const s = await tx.catererSupplier.update({ where: { id: supplierId }, data: { ...rest, phone: phone ?? null, notes: notes ?? null } });
    if (s.name !== existing.name) await tx.catererPurchase.updateMany({ where: { supplierId }, data: { supplier: s.name } });
    return s;
  });
  return NextResponse.json({ supplier });
}

// A supplier with bills is kept (hidden) so the ledger stays complete; one with none is deleted.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { supplierId } = await params;
  const existing = await db.catererSupplier.findFirst({ where: { id: supplierId, catererId: ctx.caterer.id }, include: { _count: { select: { purchases: true } } } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing._count.purchases > 0) {
    await db.catererSupplier.update({ where: { id: supplierId }, data: { active: false } });
    return NextResponse.json({ ok: true, archived: true });
  }
  await db.catererSupplier.delete({ where: { id: supplierId } });
  return NextResponse.json({ ok: true });
}
