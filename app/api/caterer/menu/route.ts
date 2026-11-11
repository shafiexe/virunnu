import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { syncStartingPrice } from "@/lib/caterer-details";

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

  // The public menu is part of the price list: a dish is one item that orders and the public page both use
  const clash = await db.catererItem.findFirst({ where: { catererId: caterer.id, name: { equals: parsed.data.name, mode: "insensitive" } } });
  if (clash) return NextResponse.json({ error: "A dish with this name is already in the price list" }, { status: 409 });
  const item = await db.catererItem.create({
    data: {
      catererId: caterer.id, name: parsed.data.name, group: "FOOD", unit: "plate", ratePaise: parsed.data.priceRupees * 100,
      showOnPublic: true, category: parsed.data.category, description: parsed.data.description, isVeg: parsed.data.isVeg, isSpecial: parsed.data.isSpecial,
    },
  });

  await syncStartingPrice(caterer.id);
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

  // dishes already in the price list keep their rate; they are just shown on the public page
  const created = await db.catererItem.createMany({
    data: items.slice(0, 50).map((i) => ({
      catererId: caterer.id, group: "FOOD" as const, unit: "plate",
      name: String(i.name).slice(0, 80),
      ratePaise: Math.max(0, Math.floor(Number(i.priceRupees) || 0)) * 100,
      showOnPublic: true,
      category: String(i.category).slice(0, 50),
      description: i.description ? String(i.description).slice(0, 300) : null,
      isVeg: Boolean(i.isVeg),
      isSpecial: Boolean(i.isSpecial),
    })),
    skipDuplicates: true,
  });

  await syncStartingPrice(caterer.id);
  return NextResponse.json({ count: created.count }, { status: 201 });
}
