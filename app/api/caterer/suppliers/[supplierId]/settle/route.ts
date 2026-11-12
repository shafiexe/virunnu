import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { settleSchema } from "@/lib/caterer-suppliers";
import { settleSupplier } from "@/lib/caterer-suppliers-server";

type Params = { params: Promise<{ supplierId: string }> };

// "Settle account": one payment to the supplier, applied to the oldest unpaid bills first.
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { supplierId } = await params;
  const supplier = await db.catererSupplier.findFirst({ where: { id: supplierId, catererId: ctx.caterer.id }, select: { id: true } });
  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = settleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  try {
    await db.$transaction((tx) => settleSupplier(tx, supplierId, Math.round(parsed.data.amount * 100), parsed.data));
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (m.startsWith("OVER:")) return NextResponse.json({ error: `That is more than the ₹${(Number(m.slice(5)) / 100).toLocaleString("en-IN")} you owe` }, { status: 400 });
    throw e;
  }
  return NextResponse.json({ ok: true });
}
