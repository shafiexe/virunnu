import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBooking } from "@/services/booking.service";
import { db } from "@/lib/db";
import { BookingStatus, SlotStatus } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await params;
  const booking = await getBooking(bookingId);

  if (!booking || booking.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (booking.status !== "PENDING") {
    return NextResponse.json({ error: "Booking is not pending" }, { status: 409 });
  }

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    }),
    db.hallSlot.update({
      where: { id: booking.hallSlotId },
      data: { status: SlotStatus.BOOKED, heldUntil: null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
