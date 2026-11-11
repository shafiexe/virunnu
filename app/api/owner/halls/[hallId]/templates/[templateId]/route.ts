import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ hallId: string; templateId: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { hallId, templateId } = await params;
  const whereClause = session.role === "ADMIN"
    ? { id: templateId, hallId }
    : { id: templateId, hallId, hall: { venue: { orgId: session.orgId! } } };
  const template = await db.slotTemplate.findFirst({ where: whereClause });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const clash = await db.slotTemplate.findFirst({
    where: { hallId, id: { not: templateId }, name: { equals: parsed.data.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (clash) return NextResponse.json({ error: "Another slot already has this name" }, { status: 409 });

  // Existing bookings point at this slot, so they follow the new name and times.
  const updated = await db.slotTemplate.update({ where: { id: templateId }, data: parsed.data });
  return NextResponse.json({ template: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { hallId, templateId } = await params;
  const whereClause = session.role === "ADMIN"
    ? { id: templateId, hallId }
    : { id: templateId, hallId, hall: { venue: { orgId: session.orgId! } } };
  const template = await db.slotTemplate.findFirst({ where: whereClause });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Block if future confirmed bookings use this template's slots
  const activeBookings = await db.booking.count({
    where: {
      status: "CONFIRMED",
      hallSlot: { templateId, date: { gte: new Date() } },
    },
  });
  if (activeBookings > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${activeBookings} confirmed future booking(s) use this slot` },
      { status: 409 }
    );
  }

  await db.$transaction(async (tx) => {
    // Delete in dependency order: payments → bookings → slots → template
    const allSlots = await tx.hallSlot.findMany({
      where: { templateId },
      select: { id: true },
    });
    const ids = allSlots.map((s) => s.id);
    if (ids.length > 0) {
      await tx.payment.deleteMany({ where: { booking: { hallSlotId: { in: ids } } } });
      await tx.booking.deleteMany({ where: { hallSlotId: { in: ids } } });
      await tx.hallSlot.deleteMany({ where: { id: { in: ids } } });
    }
    await tx.slotTemplate.delete({ where: { id: templateId } });
  });

  return NextResponse.json({ ok: true });
}
