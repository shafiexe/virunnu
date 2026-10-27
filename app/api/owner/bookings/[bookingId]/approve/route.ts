import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { BookingStatus, SlotStatus } from "@prisma/client";
import { notifyBookingApproved } from "@/services/notification.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { bookingId } = await params;

  const booking = await db.booking.findFirst({
    where: { id: bookingId, orgId: session.orgId! },
    include: {
      hallSlot: { include: { hall: { include: { venue: true } }, template: true } },
      user: true,
    },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status !== BookingStatus.PENDING) return NextResponse.json({ error: "Booking is not pending" }, { status: 400 });

  let resolvedUser: { phone: string; email: string | null; name: string | null } | null = booking.user;

  await db.$transaction(async (tx) => {
    let userId = booking.userId;
    if (!userId && booking.guestPhone) {
      const user = await tx.user.upsert({
        where: { phone: booking.guestPhone },
        create: { phone: booking.guestPhone, name: booking.guestName ?? undefined, role: "CUSTOMER" },
        update: { name: booking.guestName ?? undefined },
      });
      userId = user.id;
      resolvedUser = user;
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.APPROVED, userId: userId ?? undefined },
    });

    await tx.hallSlot.update({
      where: { id: booking.hallSlotId },
      data: { status: SlotStatus.BOOKED, heldUntil: null },
    });
  });

  const phone = resolvedUser?.phone ?? booking.guestPhone;
  if (phone) {
    const slot = booking.hallSlot;
    notifyBookingApproved({
      customerPhone: phone,
      customerEmail: resolvedUser?.email ?? booking.guestEmail,
      customerName: resolvedUser?.name ?? booking.guestName ?? "Customer",
      venueName: slot.hall.venue.name,
      hallName: slot.hall.name,
      date: slot.date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" }),
      timeSlot: `${slot.template.name} (${slot.template.startTime}–${slot.template.endTime})`,
      totalPaise: booking.totalPaise,
      bookingRef: booking.id.slice(-8).toUpperCase(),
    }).catch((e) => console.error("[notify/booking-approved]", e));
  }

  return NextResponse.json({ ok: true });
}
