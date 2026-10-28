import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  city: z.string().min(1).optional(),
  state: z.string().optional(),
  description: z.string().nullable().optional(),
  cuisines: z.array(z.string()).optional(),
  whatsappNumber: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  youtubeUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  services: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ catererId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { catererId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const caterer = await db.caterer.findUnique({ where: { id: catererId } });
  if (!caterer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.caterer.update({ where: { id: catererId }, data: parsed.data });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ catererId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { catererId } = await params;

  const caterer = await db.caterer.findUnique({ where: { id: catererId } });
  if (!caterer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete related records before deleting caterer to avoid FK constraint errors
  await db.menuItem.deleteMany({ where: { catererId } });
  await db.cateringEnquiry.deleteMany({ where: { catererId } });
  await db.caterer.delete({ where: { id: catererId } });

  return NextResponse.json({ ok: true });
}
