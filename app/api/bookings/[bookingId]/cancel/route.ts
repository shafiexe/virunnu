import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBooking } from "@/services/booking.service";
import { db } from "@/lib/db";
import { BookingStatus, SlotStatus } from "@prisma/client";
import { z } from "zod";

const schema = z.object({ reason: z.string().min(1).max(500).optional() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await params;
  const booking = await getBooking(bookingId);

  if (!booking || booking.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.ADVANCE_PAID) {
    return NextResponse.json(
      { error: "Only pending or advance-paid bookings can be cancelled" },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const cancelReason = parsed.success ? (parsed.data.reason ?? null) : null;

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED, cancelReason },
    }),
    db.hallSlot.update({
      where: { id: booking.hallSlotId },
      data: { status: SlotStatus.AVAILABLE, heldUntil: null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
