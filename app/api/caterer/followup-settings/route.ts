import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";

// How many days after a function an unpaid balance counts as worth a call
export async function PUT(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ remindAfterDays: z.number().int().min(0).max(365) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await db.caterer.update({ where: { id: ctx.caterer.id }, data: { remindAfterDays: parsed.data.remindAfterDays } });
  return NextResponse.json({ remindAfterDays: parsed.data.remindAfterDays });
}
