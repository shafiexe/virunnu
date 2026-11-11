import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { itemBody } from "@/lib/caterer-items";

type Params = { params: Promise<{ itemId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { itemId } = await params;
  const item = await db.catererItem.findFirst({ where: { id: itemId, catererId: ctx.caterer.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = itemBody.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const { name, group, unit, rate, active, showOnPublic, category, description, isVeg, isSpecial } = parsed.data;

  if (name && name.toLowerCase() !== item.name.toLowerCase()) {
    const clash = await db.catererItem.findFirst({ where: { catererId: ctx.caterer.id, id: { not: itemId }, name: { equals: name, mode: "insensitive" } } });
    if (clash) return NextResponse.json({ error: "You already have an item with this name" }, { status: 409 });
  }

  const updated = await db.catererItem.update({
    where: { id: itemId },
    data: {
      ...(name !== undefined && { name }),
      ...(group !== undefined && { group }),
      ...(unit !== undefined && { unit }),
      ...(rate !== undefined && { ratePaise: Math.round(rate * 100) }),
      ...(active !== undefined && { active }),
      ...(showOnPublic !== undefined && { showOnPublic }),
      ...(category !== undefined && { category: category || null }),
      ...(description !== undefined && { description: description || null }),
      ...(isVeg !== undefined && { isVeg }),
      ...(isSpecial !== undefined && { isSpecial }),
    },
  });
  return NextResponse.json({ item: updated });
}

// Old orders keep their own copy of the name and rate, so removing an item never changes a past bill.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { itemId } = await params;
  const item = await db.catererItem.findFirst({ where: { id: itemId, catererId: ctx.caterer.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.catererItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
