import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { supplierSchema } from "@/lib/caterer-suppliers";
import { supplierOverview } from "@/lib/caterer-suppliers-server";

export async function GET() {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ suppliers: await supplierOverview(ctx.caterer.id) });
}

export async function POST(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = supplierSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const clash = await db.catererSupplier.findFirst({ where: { catererId: ctx.caterer.id, name: { equals: parsed.data.name, mode: "insensitive" } } });
  if (clash) return NextResponse.json({ error: "You already have a supplier with this name" }, { status: 409 });
  const supplier = await db.catererSupplier.create({ data: { catererId: ctx.caterer.id, ...parsed.data } });
  return NextResponse.json({ supplier }, { status: 201 });
}
