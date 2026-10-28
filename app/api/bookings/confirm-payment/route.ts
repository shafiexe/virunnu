import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { splitGST } from "@/lib/gst";
import { releaseExpiredHolds } from "@/services/booking.service";
import { notifyBookingConfirmed } from "@/services/notification.service";

const VIRTUAL_PREFIX = "virtual_";
const BLOCKED_PREFIX = "blocked_";

const schema = z.object({
  hallSlotId: z.string().min(1),
  guestName: z.string().min(1),
  guestPhone: z.string().min(10),
  guestEmail: z.string().email().nullable().optional(),
  guestAddress: z.string().nullable().optional(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  amountPaise: z.number().int().positive(),
  isFullPayment: z.boolean(),
});

async function resolveSlotId(id: string): Promise<string> {
  const isVirtual = id.startsWith(VIRTUAL_PREFIX);
  const isBlocked = id.startsWith(BLOCKED_PREFIX);
  if (!isVirtual && !isBlocked) return id;

  const normalised = isBlocked ? VIRTUAL_PREFIX + id.slice(BLOCKED_PREFIX.length) : id;
  const rest = normalised.slice(VIRTUAL_PREFIX.length);
  const dateStr = rest.slice(-10);
  const templateId = rest.slice(0, rest.length - 11);

  const template = await db.slotTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("SLOT_NOT_FOUND");

  const date = new Date(dateStr + "T00:00:00.000Z");
  const blocked = await db.blockedDate.findFirst({ where: { hallId: template.hallId, date } });
  if (blocked) throw new Error("SLOT_UNAVAILABLE");

  const slot = await db.hallSlot.upsert({
    where: { hallId_templateId_date: { hallId: template.hallId, templateId, date } },
    create: { hallId: template.hallId, templateId, date, status: "AVAILABLE" },
    update: {},
  });
  return slot.id;
}

export async function POST(req: NextRequest) {
  await releaseExpiredHolds();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const {
    hallSlotId: rawSlotId,
    guestName, guestPhone, guestEmail, guestAddress,
    razorpayOrderId, razorpayPaymentId, razorpaySignature,
    amountPaise, isFullPayment,
  } = parsed.data;

  // Verify Razorpay signature
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "placeholder";
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (process.env.RAZORPAY_KEY_SECRET && expectedSig !== razorpaySignature) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  let hallSlotId: string;
  try {
    hallSlotId = await resolveSlotId(rawSlotId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "SLOT_NOT_FOUND") return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    return NextResponse.json({ error: "Slot unavailable" }, { status: 409 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const slot = await tx.hallSlot.findUnique({
        where: { id: hallSlotId },
        include: { hall: { include: { venue: true } }, template: true },
      });

      if (!slot) throw new Error("SLOT_NOT_FOUND");
      if (slot.status !== "AVAILABLE") throw new Error("SLOT_UNAVAILABLE");

      // Payment received — book slot immediately, no owner approval needed
      await tx.hallSlot.update({
        where: { id: hallSlotId, status: "AVAILABLE" },
        data: { status: "BOOKED", heldUntil: null },
      });

      const { totalPaise } = splitGST(slot.priceOverride ?? slot.hall.pricePerSlot);
      const bookingStatus = isFullPayment ? "CONFIRMED" : "ADVANCE_PAID";

      const booking = await tx.booking.create({
        data: {
          hallSlotId,
          orgId: slot.hall.venue.orgId,
          totalPaise,
          status: bookingStatus,
          advancePaise: isFullPayment ? 0 : amountPaise,
          guestName,
          guestPhone,
          guestEmail: guestEmail ?? null,
          guestAddress: guestAddress ?? null,
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
          status: "PAID",
        },
      });

      return {
        bookingId: booking.id,
        status: bookingStatus,
        totalPaise,
        orgId: slot.hall.venue.orgId,
        venueName: slot.hall.venue.name,
        hallName: slot.hall.name,
        slotDate: slot.date,
        template: slot.template,
      };
    });

    // Customer confirmation — non-blocking
    notifyBookingConfirmed({
      orgId: result.orgId,
      customerPhone: guestPhone,
      customerEmail: guestEmail ?? null,
      customerName: guestName,
      venueName: result.venueName,
      hallName: result.hallName,
      date: new Date(result.slotDate).toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "short", year: "numeric",
      }),
      timeSlot: result.template
        ? `${result.template.name} (${result.template.startTime}–${result.template.endTime})`
        : "",
      totalPaise: result.totalPaise,
      paidPaise: amountPaise,
      bookingRef: result.bookingId.slice(-8).toUpperCase(),
    }).catch((e) => console.error("[notify/confirm-payment]", e));

    return NextResponse.json({ bookingId: result.bookingId }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "SLOT_UNAVAILABLE") return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
    if (msg === "SLOT_NOT_FOUND") return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    throw err;
  }
}
