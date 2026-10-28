import Razorpay from "razorpay";
import { db } from "@/lib/db";
import { BookingStatus, PaymentStatus, SlotStatus } from "@prisma/client";
import { splitGST } from "@/lib/gst";
import crypto from "crypto";
import { notifyBookingConfirmed, notifyOwnerNewBooking } from "@/services/notification.service";

const VIRTUAL_PREFIX = "virtual_";

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export async function createOrder(bookingId: string) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("BOOKING_NOT_FOUND");

  const order = await getRazorpay().orders.create({
    amount: booking.totalPaise,
    currency: "INR",
    receipt: bookingId,
  });

  const payment = await db.payment.create({
    data: {
      bookingId,
      razorpayOrderId: order.id,
      amountPaise: booking.totalPaise,
      status: PaymentStatus.CREATED,
    },
  });

  return { orderId: order.id, amountPaise: booking.totalPaise, paymentId: payment.id };
}

async function resolveSlotId(id: string): Promise<string> {
  if (!id.startsWith(VIRTUAL_PREFIX)) return id;
  const rest = id.slice(VIRTUAL_PREFIX.length);
  const dateStr = rest.slice(-10);
  const templateId = rest.slice(0, rest.length - 11);
  const template = await db.slotTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("SLOT_NOT_FOUND");
  const date = new Date(dateStr + "T00:00:00.000Z");
  const slot = await db.hallSlot.upsert({
    where: { hallId_templateId_date: { hallId: template.hallId, templateId, date } },
    create: { hallId: template.hallId, templateId, date, status: "AVAILABLE" },
    update: {},
  });
  return slot.id;
}

export async function handleWebhook(body: string, signature: string): Promise<void> {
  if (process.env.RAZORPAY_WEBHOOK_SECRET) {
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");
    if (expected !== signature) throw new Error("INVALID_SIGNATURE");
  }

  const event = JSON.parse(body);
  if (event.event !== "payment.captured") return;

  const entity = event.payload.payment.entity;
  const { order_id: razorpayOrderId, id: razorpayPaymentId, amount: amountPaise, notes } = entity;

  // Idempotency — if client-side handler already created the booking, do nothing
  const existing = await db.booking.findFirst({ where: { razorpayOrderId } });
  if (existing) return;

  // Rebuild booking from order notes (set when creating the Razorpay order)
  const rawSlotId: string = notes?.hallSlotId ?? "";
  const guestName: string = notes?.guestName ?? "Unknown";
  const guestPhone: string = notes?.guestPhone ?? "";
  const guestEmail: string | null = notes?.guestEmail || null;
  const guestAddress: string | null = notes?.guestAddress || null;
  const isFullPayment: boolean = notes?.isFullPayment === "1";

  if (!rawSlotId || !guestPhone) {
    console.error("[webhook] Missing booking notes on order", razorpayOrderId);
    return;
  }

  let hallSlotId: string;
  try {
    hallSlotId = await resolveSlotId(rawSlotId);
  } catch {
    console.error("[webhook] Could not resolve slot", rawSlotId);
    return;
  }

  const webhookResult = await db.$transaction(async (tx) => {
    const slot = await tx.hallSlot.findUnique({
      where: { id: hallSlotId },
      include: { hall: { include: { venue: true } }, template: true },
    });
    if (!slot || slot.status !== "AVAILABLE") return null;

    await tx.hallSlot.update({
      where: { id: hallSlotId },
      data: { status: SlotStatus.BOOKED, heldUntil: null },
    });

    const { totalPaise } = splitGST(slot.priceOverride ?? slot.hall.pricePerSlot);
    const bookingStatus = isFullPayment ? BookingStatus.CONFIRMED : BookingStatus.ADVANCE_PAID;

    const booking = await tx.booking.create({
      data: {
        hallSlotId,
        orgId: slot.hall.venue.orgId,
        totalPaise,
        status: bookingStatus,
        advancePaise: isFullPayment ? 0 : amountPaise,
        guestName,
        guestPhone,
        guestEmail,
        guestAddress,
        razorpayOrderId,
        razorpayPaymentId,
      },
    });

    await tx.payment.create({
      data: {
        bookingId: booking.id,
        razorpayOrderId,
        razorpayPaymentId,
        amountPaise,
        status: PaymentStatus.PAID,
      },
    });

    return {
      bookingId: booking.id,
      orgId: slot.hall.venue.orgId,
      totalPaise,
      venueName: slot.hall.venue.name,
      hallName: slot.hall.name,
      slotDate: slot.date,
      templateName: slot.template?.name ?? "",
      templateStart: slot.template?.startTime ?? "",
      templateEnd: slot.template?.endTime ?? "",
      bookingStatus,
    };
  });

  // Send notifications only when webhook actually created a booking (not duplicate)
  if (webhookResult) {
    const r = webhookResult;
    const dateStr = new Date(r.slotDate).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "short", year: "numeric",
    });
    const timeSlot = r.templateName
      ? `${r.templateName} (${r.templateStart}–${r.templateEnd})`
      : "";
    const bookingRef = r.bookingId.slice(-8).toUpperCase();

    notifyBookingConfirmed({
      orgId: r.orgId,
      customerPhone: guestPhone,
      customerEmail: guestEmail,
      customerName: guestName,
      venueName: r.venueName,
      hallName: r.hallName,
      date: dateStr,
      timeSlot,
      totalPaise: r.totalPaise,
      paidPaise: amountPaise,
      bookingRef,
    }).catch((e) => console.error("[webhook/notify-customer]", e));

    db.user.findFirst({ where: { orgId: r.orgId, role: "OWNER" }, select: { phone: true, email: true } })
      .then((owner) => {
        if (!owner) return;
        notifyOwnerNewBooking({
          orgId: r.orgId,
          ownerPhone: owner.phone,
          ownerEmail: owner.email,
          customerName: guestName,
          customerPhone: guestPhone,
          venueName: r.venueName,
          hallName: r.hallName,
          date: dateStr,
          timeSlot,
          totalPaise: r.totalPaise,
          bookingRef,
        }).catch((e) => console.error("[webhook/notify-owner]", e));
      })
      .catch((e) => console.error("[webhook/owner-lookup]", e));
  }
}
