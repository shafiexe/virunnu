import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { purchaseSchema, purchaseTotals } from "@/lib/caterer-purchases";
import { checkLinks } from "@/lib/caterer-purchases-server";
import { resolveSupplier } from "@/lib/caterer-suppliers-server";
import type { Prisma } from "@prisma/client";
import { actorOf, logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const month = sp.get("month");
  const where: Prisma.CatererPurchaseWhereInput = {
    catererId: ctx.caterer.id,
    ...(sp.get("employeeId") ? { employeeId: sp.get("employeeId")! } : {}),
    ...(sp.get("orderId") ? { orderId: sp.get("orderId")! } : {}),
    ...(month && /^\d{4}-\d{2}$/.test(month)
      ? { date: { gte: new Date(`${month}-01`), lte: new Date(new Date(`${month}-01`).getUTCFullYear(), new Date(`${month}-01`).getUTCMonth() + 1, 0) } }
      : {}),
  };
  const purchases = await db.catererPurchase.findMany({
    where, orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { employee: { select: { id: true, name: true } }, order: { select: { id: true, date: true, customer: { select: { name: true } } } } },
  });
  return NextResponse.json({ purchases });
}

export async function POST(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = purchaseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;

  const { lines, totalPaise, paidPaise } = purchaseTotals(d);
  if (paidPaise > totalPaise) return NextResponse.json({ error: "Paid can't be more than the bill total" }, { status: 400 });
  const bad = await checkLinks(ctx.caterer.id, ctx.caterer.orgId!, d.employeeId, d.orderId);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });

  const actor = await actorOf(ctx.session);
  const purchase = await db.$transaction(async (tx) => {
    const sup = await resolveSupplier(tx, ctx.caterer.id, d);
    return tx.catererPurchase.create({
    data: {
      catererId: ctx.caterer.id, date: new Date(d.date), supplier: sup.name, supplierId: sup.id, billNo: d.billNo, category: d.category,
      totalPaise, paidPaise, employeeId: d.employeeId, orderId: d.orderId, notes: d.notes, recordedBy: actor.label,
      lines: { create: lines },
      ...(paidPaise > 0 ? { payments: { create: { amountPaise: paidPaise, method: d.method, paidOn: new Date(d.date), note: "Paid at purchase", recordedBy: actor.label } } } : {}),
    },
    });
  });
  await logActivity(ctx.session, `Recorded a purchase of ₹${(totalPaise / 100).toLocaleString("en-IN")} from ${purchase.supplier}`);
  return NextResponse.json({ purchase }, { status: 201 });
}
