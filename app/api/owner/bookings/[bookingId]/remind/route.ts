import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { notifyBalanceReminder } from "@/services/notification.service";

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
      hallSlot: { include: { hall: { include: { venue: true } }, template: true } },
      user: true,
    },
  });

  if (!booking || booking.hallSlot.hall.venue.orgId !== session.orgId!) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const phone = booking.user?.phone ?? booking.guestPhone;
  if (!phone) {
    return NextResponse.json({ error: "No phone number on record for this customer" }, { status: 400 });
  }

  const paidPaise = booking.advancePaise ?? 0;
  const balancePaise = booking.totalPaise - paidPaise;
  if (balancePaise <= 0) {
    return NextResponse.json({ error: "No outstanding balance" }, { status: 400 });
  }

  const slot = booking.hallSlot;
  await notifyBalanceReminder({
    customerPhone: phone,
    customerEmail: booking.user?.email ?? booking.guestEmail,
    customerName: booking.user?.name ?? booking.guestName ?? "Customer",
    venueName: slot.hall.venue.name,
    hallName: slot.hall.name,
    date: slot.date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" }),
    timeSlot: `${slot.template.name} (${slot.template.startTime}–${slot.template.endTime})`,
    totalPaise: booking.totalPaise,
    paidPaise,
    bookingRef: booking.id.slice(-8).toUpperCase(),
  });

  return NextResponse.json({ ok: true });
}
