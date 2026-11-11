import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";

// Places this team has served before, most used first, so the Place box suggests them instead of being typed again
export async function GET() {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.catererOrder.groupBy({ by: ["place"], where: { catererId: ctx.caterer.id, place: { not: null } }, _count: { place: true }, orderBy: { _count: { place: "desc" } }, take: 40 });
  return NextResponse.json({ places: rows.map((r) => r.place).filter((p): p is string => !!p) });
}
