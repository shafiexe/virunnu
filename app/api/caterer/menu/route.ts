import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2).max(80),
  category: z.string().min(1).max(50),
  description: z.string().max(300).optional(),
  priceRupees: z.number().int().min(1).max(100000),
  isVeg: z.boolean(),
  isSpecial: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CATERER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const caterer = session.orgId
    ? await db.caterer.findFirst({ where: { orgId: session.orgId } })
    : null;

  if (!caterer) {
    return NextResponse.json({ error: "Caterer profile not found" }, { status: 404 });
  }

  const item = await db.menuItem.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      description: parsed.data.description,
      priceRupees: parsed.data.priceRupees,
      isVeg: parsed.data.isVeg,
      isSpecial: parsed.data.isSpecial,
      catererId: caterer.id,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
