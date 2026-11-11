import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { itemBody } from "@/lib/caterer-items";

export async function GET() {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const items = await db.catererItem.findMany({
    where: { catererId: ctx.caterer.id },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = itemBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const { name, group, unit, rate, active, showOnPublic, category, description, isVeg, isSpecial } = parsed.data;
  const clash = await db.catererItem.findFirst({ where: { catererId: ctx.caterer.id, name: { equals: name, mode: "insensitive" } } });
  if (clash) return NextResponse.json({ error: "You already have an item with this name" }, { status: 409 });

  const item = await db.catererItem.create({
    data: { catererId: ctx.caterer.id, name, group, unit, ratePaise: Math.round(rate * 100), active, showOnPublic: showOnPublic ?? false, category: category || null, description: description || null, isVeg: isVeg ?? true, isSpecial: isSpecial ?? false },
  });
  return NextResponse.json({ item }, { status: 201 });
}
