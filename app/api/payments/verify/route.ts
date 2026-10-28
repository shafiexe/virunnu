import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { notifyBookingConfirmed } from "@/services/notification.service";

const schema = z.object({
  bookingId: z.string(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  amountPaise: z.number().int().positive(),
  isFullPayment: z.boolean(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature, amountPaise, isFullPayment } = parsed.data;

  const secret = process.env.RAZORPAY_KEY_SECRET ?? "placeholder";
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSig !== razorpaySignature && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      hallSlot: { include: { hall: { include: { venue: true } }, template: true } },
      user: true,
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newStatus = isFullPayment ? "CONFIRMED" : "ADVANCE_PAID";

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: {
        status: newStatus,
        razorpayPaymentId,
        advancePaise: isFullPayment ? 0 : amountPaise,
      },
    }),
    db.hallSlot.update({
      where: { id: booking.hallSlotId },
      data: { status: "BOOKED", heldUntil: null },
    }),
    db.payment.create({
      data: {
        bookingId,
        razorpayOrderId,
        razorpayPaymentId,
        amountPaise,
        status: "PAID",
      },
    }),
  ]);

  const phone = booking.user?.phone ?? booking.guestPhone;
  if (phone) {
    const slot = booking.hallSlot;
    notifyBookingConfirmed({
      orgId: booking.orgId,
      customerPhone: phone,
      customerEmail: booking.user?.email ?? booking.guestEmail,
      customerName: booking.user?.name ?? booking.guestName ?? "Customer",
      venueName: slot.hall.venue.name,
      hallName: slot.hall.name,
      date: slot.date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" }),
      timeSlot: `${slot.template.name} (${slot.template.startTime}–${slot.template.endTime})`,
      totalPaise: booking.totalPaise,
      paidPaise: amountPaise,
      bookingRef: booking.id.slice(-8).toUpperCase(),
    }).catch((e) => console.error("[notify/booking-confirmed]", e));
  }

  return NextResponse.json({ success: true, status: newStatus });
}
