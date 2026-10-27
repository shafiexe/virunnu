import Razorpay from "razorpay";
import { db } from "@/lib/db";
import { BookingStatus, PaymentStatus, SlotStatus } from "@prisma/client";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createOrder(bookingId: string) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("BOOKING_NOT_FOUND");

  const order = await razorpay.orders.create({
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

export async function handleWebhook(body: string, signature: string): Promise<void> {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");

  if (expected !== signature) throw new Error("INVALID_SIGNATURE");

  const event = JSON.parse(body);
  if (event.event !== "payment.captured") return;

  const { order_id, id: paymentId } = event.payload.payment.entity;

  await db.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { razorpayOrderId: order_id },
      data: { razorpayPaymentId: paymentId, status: PaymentStatus.PAID },
      include: { booking: { include: { hallSlot: true } } },
    });

    await tx.booking.update({
      where: { id: payment.bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });

    await tx.hallSlot.update({
      where: { id: payment.booking.hallSlotId },
      data: { status: SlotStatus.BOOKED, heldUntil: null },
    });
  });
}
