import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ venueId: string }> };

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(3).optional(),
  googleMapsUrl: z.string().nullable().optional(),
  googleRating: z.number().min(0).max(5).nullable().optional(),
  googleReviewCount: z.number().int().min(0).nullable().optional(),
  googleReviewUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { venueId } = await params;
  const venue = await db.venue.findFirst({ where: { id: venueId, orgId: session.orgId! } });
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, ...rest } = parsed.data;

  try {
    const updated = await db.venue.update({ where: { id: venueId }, data: { name, ...rest } });
    if (name) {
      await db.hall.updateMany({ where: { venueId }, data: { name } });
    }
    return NextResponse.json({ venue: updated });
  } catch (err) {
    console.error("venue PATCH error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { venueId } = await params;

  const venue = await db.venue.findFirst({
    where: { id: venueId },
    include: { halls: { select: { id: true } } },
  });
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Block if any confirmed future bookings exist across all halls
  const hallIds = venue.halls.map((h) => h.id);
  const activeBookings = await db.booking.count({
    where: {
      status: "CONFIRMED",
      hallSlot: { hallId: { in: hallIds }, date: { gte: new Date() } },
    },
  });
  if (activeBookings > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${activeBookings} confirmed future booking(s) exist` },
      { status: 409 }
    );
  }

  // Delete in dependency order for all halls in this venue
  await db.$transaction(async (tx) => {
    for (const hall of venue.halls) {
      const slots = await tx.hallSlot.findMany({
        where: { hallId: hall.id },
        select: { id: true },
      });
      const slotIds = slots.map((s) => s.id);
      if (slotIds.length > 0) {
        await tx.payment.deleteMany({ where: { booking: { hallSlotId: { in: slotIds } } } });
        await tx.booking.deleteMany({ where: { hallSlotId: { in: slotIds } } });
        await tx.hallSlot.deleteMany({ where: { hallId: hall.id } });
      }
      await tx.slotTemplate.deleteMany({ where: { hallId: hall.id } });
      await tx.hall.delete({ where: { id: hall.id } });
    }
    await tx.venue.delete({ where: { id: venueId } });
  });

  return NextResponse.json({ ok: true });
}
