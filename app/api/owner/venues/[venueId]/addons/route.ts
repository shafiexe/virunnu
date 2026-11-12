import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ venueId: string }> };

const bodySchema = z.object({
  addons: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().trim().min(1, "Name is required").max(60),
        priceRupees: z.number().int().min(0, "Price can't be negative").max(10000000),
        unit: z.enum(["FIXED", "HOUR"]).default("FIXED"),
        active: z.boolean().default(true),
      })
    )
    .max(20),
});

async function ownVenue(venueId: string) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) return null;
  return db.venue.findFirst({
    where: session.role === "ADMIN" ? { id: venueId } : { id: venueId, orgId: session.orgId! },
    select: { id: true },
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { venueId } = await params;
  if (!(await ownVenue(venueId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const addons = await db.venueAddon.findMany({ where: { venueId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json({ addons });
}

// Replace the venue's whole add-on list in one go.
export async function PUT(req: NextRequest, { params }: Params) {
  const { venueId } = await params;
  if (!(await ownVenue(venueId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const names = parsed.data.addons.map((a) => a.name.toLowerCase());
  if (new Set(names).size !== names.length) return NextResponse.json({ error: "Two add-ons have the same name" }, { status: 400 });

  const existing = await db.venueAddon.findMany({ where: { venueId }, select: { id: true } });
  const existingIds = new Set(existing.map((e) => e.id));
  const keep = new Set(parsed.data.addons.map((a) => a.id).filter((id): id is string => !!id && existingIds.has(id)));

  await db.$transaction([
    db.venueAddon.deleteMany({ where: { venueId, id: { notIn: [...keep] } } }),
    ...parsed.data.addons.map((a, i) =>
      a.id && existingIds.has(a.id)
        ? db.venueAddon.update({ where: { id: a.id }, data: { name: a.name, pricePaise: a.priceRupees * 100, unit: a.unit, active: a.active, sortOrder: i } })
        : db.venueAddon.create({ data: { venueId, name: a.name, pricePaise: a.priceRupees * 100, unit: a.unit, active: a.active, sortOrder: i } })
    ),
  ]);

  const addons = await db.venueAddon.findMany({ where: { venueId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json({ addons });
}
