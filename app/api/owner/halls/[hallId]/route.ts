import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ hallId: string }> };

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  capacity: z.number().int().min(1).optional(),
  priceRupees: z.number().int().min(1).optional(),
  amenities: z.array(z.string()).optional(),
  description: z.string().max(1000).nullable().optional(),
  minimumAdvanceRupees: z.number().int().min(100).optional(),
  requireFullPayment: z.boolean().optional(),
});

async function getOwnedHall(hallId: string, orgId: string) {
  return db.hall.findFirst({
    where: { id: hallId, venue: { orgId } },
    include: { venue: true },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { hallId } = await params;
  const hall = await getOwnedHall(hallId, session.orgId!);
  if (!hall) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, capacity, priceRupees, amenities, description, minimumAdvanceRupees, requireFullPayment } = parsed.data;
  const updated = await db.hall.update({
    where: { id: hallId },
    data: {
      ...(name !== undefined && { name }),
      ...(capacity !== undefined && { capacity }),
      ...(priceRupees !== undefined && { pricePerSlot: priceRupees * 100 }),
      ...(amenities !== undefined && { amenities }),
      ...(description !== undefined && { description }),
      ...(minimumAdvanceRupees !== undefined && { minimumAdvancePaise: minimumAdvanceRupees * 100 }),
      ...(requireFullPayment !== undefined && { requireFullPayment }),
    },
    include: { slotTemplates: true },
  });

  return NextResponse.json({ hall: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { hallId } = await params;
  const hall = await getOwnedHall(hallId, session.orgId!);
  if (!hall) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Block deletion if there are confirmed future bookings
  const activeBookings = await db.booking.count({
    where: {
      status: "CONFIRMED",
      hallSlot: {
        hallId,
        date: { gte: new Date() },
      },
    },
  });

  if (activeBookings > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${activeBookings} confirmed future booking(s) exist` },
      { status: 409 }
    );
  }

  // Delete everything in dependency order: payments → bookings → slots → templates → hall
  await db.$transaction(async (tx) => {
    const slots = await tx.hallSlot.findMany({ where: { hallId }, select: { id: true } });
    const slotIds = slots.map((s) => s.id);

    // Delete payments attached to bookings on these slots
    await tx.payment.deleteMany({ where: { booking: { hallSlotId: { in: slotIds } } } });

    // Delete all bookings for these slots
    await tx.booking.deleteMany({ where: { hallSlotId: { in: slotIds } } });

    // Delete the hall slots
    await tx.hallSlot.deleteMany({ where: { hallId } });

    // Delete slot templates
    await tx.slotTemplate.deleteMany({ where: { hallId } });

    // Finally delete the hall
    await tx.hall.delete({ where: { id: hallId } });
  });

  return NextResponse.json({ ok: true });
}
