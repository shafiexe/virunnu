import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { BookingStatus, SlotStatus } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { bookingId } = await params;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      hallSlot: { include: { hall: { include: { venue: true } } } },
    },
  });

  if (!booking || booking.hallSlot.hall.venue.orgId !== session.orgId!) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (booking.status !== BookingStatus.CANCELLED) {
    return NextResponse.json({ error: "Booking is not cancelled" }, { status: 409 });
  }
  if (booking.hallSlot.status !== SlotStatus.AVAILABLE) {
    return NextResponse.json({ error: "Slot is no longer available — another booking may have taken it" }, { status: 409 });
  }

  // Restore to ADVANCE_PAID if advance was collected, otherwise CONFIRMED
  const restoreStatus = booking.advancePaise != null
    ? BookingStatus.ADVANCE_PAID
    : BookingStatus.CONFIRMED;

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { status: restoreStatus, cancelReason: null },
    }),
    db.hallSlot.update({
      where: { id: booking.hallSlotId },
      data: { status: SlotStatus.BOOKED, heldUntil: null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
