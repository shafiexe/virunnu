import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { STARTER_ITEMS } from "@/lib/caterer-items";

// Adds the starter list, skipping any name the team already has.
export async function POST() {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const created = await db.catererItem.createMany({
    data: STARTER_ITEMS.map((i, n) => ({
      catererId: ctx.caterer.id, name: i.name, group: i.group, unit: i.unit, ratePaise: Math.round(i.rate * 100), sortOrder: n,
    })),
    skipDuplicates: true,
  });
  return NextResponse.json({ added: created.count }, { status: 201 });
}
