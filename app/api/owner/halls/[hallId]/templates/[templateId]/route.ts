import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ hallId: string; templateId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { hallId, templateId } = await params;
  const template = await db.slotTemplate.findFirst({
    where: { id: templateId, hallId, hall: { venue: { orgId: session.orgId! } } },
  });
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
