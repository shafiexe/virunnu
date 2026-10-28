import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(300).nullable().optional(),
  amountPaise: z.number().int().min(0).optional(),
  category: z.string().min(1).max(50).optional(),
  icon: z.string().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

async function guardOwner(facilityId: string) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) return { error: "Forbidden", status: 403 as const };
  const facility = await db.facility.findUnique({ where: { id: facilityId } });
  if (!facility) return { error: "Not found", status: 404 as const };
  if (session.role !== "ADMIN" && facility.orgId !== session.orgId) return { error: "Not found", status: 404 as const };
  return { session, facility };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ facilityId: string }> }) {
  const { facilityId } = await params;
  const guard = await guardOwner(facilityId);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const updated = await db.facility.update({ where: { id: facilityId }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ facilityId: string }> }) {
  const { facilityId } = await params;
  const guard = await guardOwner(facilityId);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  await db.facility.delete({ where: { id: facilityId } });
  return NextResponse.json({ ok: true });
}
