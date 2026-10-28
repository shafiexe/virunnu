import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { BookingStatus, SlotStatus, PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { notifyBookingConfirmed } from "@/services/notification.service";

const schema = z.object({
  advancePaise: z.number().int().min(0).optional(),
  method: z.enum(["CASH", "ONLINE"]).optional(),
});

export async function POST(
  req: NextRequest,
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
      hallSlot: { include: { hall: { include: { venue: true } }, template: true } },
      user: true,
    },
  });

  if (!booking || booking.hallSlot.hall.venue.orgId !== session.orgId!) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    booking.status !== BookingStatus.PENDING &&
    booking.status !== BookingStatus.APPROVED &&
    booking.status !== BookingStatus.ADVANCE_PAID
  ) {
    return NextResponse.json({ error: "Only pending, approved or advance-paid bookings can be updated" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const advancePaise = parsed.success ? (parsed.data.advancePaise ?? 0) : 0;
  const payMethod = parsed.success ? (parsed.data.method ?? "CASH") : "CASH";

  const isPartial = advancePaise > 0 && advancePaise < booking.totalPaise;

  if (isPartial && advancePaise < 100000) {
    return NextResponse.json({ error: "Cash advance must be at least ₹1,000" }, { status: 400 });
  }

  const newStatus = isPartial ? BookingStatus.ADVANCE_PAID : BookingStatus.CONFIRMED;

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: {
        status: newStatus,
        paymentMethod: payMethod === "ONLINE" ? PaymentMethod.ONLINE : PaymentMethod.CASH,
        ...(isPartial ? { advancePaise } : {}),
      },
    }),
    db.hallSlot.update({
      where: { id: booking.hallSlotId },
      data: { status: SlotStatus.BOOKED, heldUntil: null },
    }),
  ]);

  const phone = booking.user?.phone ?? booking.guestPhone;
  if (phone) {
    const slot = booking.hallSlot;
    notifyBookingConfirmed({
      orgId: session.orgId!,
      customerPhone: phone,
      customerEmail: booking.user?.email ?? booking.guestEmail,
      customerName: booking.user?.name ?? booking.guestName ?? "Customer",
      venueName: slot.hall.venue.name,
      hallName: slot.hall.name,
      date: slot.date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" }),
      timeSlot: `${slot.template.name} (${slot.template.startTime}–${slot.template.endTime})`,
      totalPaise: booking.totalPaise,
      paidPaise: isPartial ? advancePaise : booking.totalPaise,
      bookingRef: booking.id.slice(-8).toUpperCase(),
    }).catch((e) => console.error("[notify/cash-payment]", e));
  }

  return NextResponse.json({ ok: true });
}
