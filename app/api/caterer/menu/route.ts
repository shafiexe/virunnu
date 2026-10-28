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
  if (!session || (session.role !== "CATERER" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  // Admin can pass catererId directly; caterer uses their own orgId
  let caterer;
  if (session.role === "ADMIN" && body?.catererId) {
    caterer = await db.caterer.findUnique({ where: { id: body.catererId } });
  } else {
    caterer = session.orgId
      ? await db.caterer.findFirst({ where: { orgId: session.orgId } })
      : null;
  }

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

// Bulk create menu items (used by AI prefill)
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "CATERER" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const items: Array<{ name: string; category: string; description?: string; priceRupees: number; isVeg: boolean; isSpecial: boolean }> = body?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  let caterer;
  if (session.role === "ADMIN" && body?.catererId) {
    caterer = await db.caterer.findUnique({ where: { id: body.catererId } });
  } else {
    caterer = session.orgId
      ? await db.caterer.findFirst({ where: { orgId: session.orgId } })
      : null;
  }

  if (!caterer) return NextResponse.json({ error: "Caterer not found" }, { status: 404 });

  const created = await db.menuItem.createMany({
    data: items.slice(0, 50).map((i) => ({
      name: String(i.name).slice(0, 80),
      category: String(i.category).slice(0, 50),
      description: i.description ? String(i.description).slice(0, 300) : null,
      priceRupees: Math.max(0, Math.floor(Number(i.priceRupees) || 0)),
      isVeg: Boolean(i.isVeg),
      isSpecial: Boolean(i.isSpecial),
      catererId: caterer.id,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ count: created.count }, { status: 201 });
}
