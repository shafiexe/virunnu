import { todayISO } from "@/lib/booking-ledger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { splitGST } from "@/lib/gst";
import { releaseExpiredHolds } from "@/services/booking.service";
import { notifyBookingConfirmed } from "@/services/notification.service";
import { getSession } from "@/lib/session";
import { resolveAddons } from "@/lib/venue-addons";
import { checkOnlineAmount, confirmWithRazorpay, PaymentRefused, refundPayment, signatureMatches } from "@/lib/online-payment";

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
  addons: z.array(z.object({ id: z.string(), quantity: z.number().min(0.5).max(48).default(1) })).max(20).optional(),
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
  const session = await getSession();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const {
    hallSlotId: rawSlotId,
    guestName, guestPhone, guestEmail, guestAddress,
    razorpayOrderId, razorpayPaymentId, razorpaySignature,
    amountPaise, isFullPayment, addons: addonPicks,
  } = parsed.data;

  // The payment must be proved, and on a live site a missing secret means "refuse", never "skip the check"
  const secret = process.env.RAZORPAY_KEY_SECRET;
  let proven = false; // set once Razorpay itself has said the money arrived
  if (!secret && process.env.NODE_ENV === "production") return NextResponse.json({ error: "Online payments are not set up" }, { status: 503 });
  if (secret) {
    if (!signatureMatches(secret, razorpayOrderId, razorpayPaymentId, razorpaySignature)) return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    // and Razorpay itself says this money arrived, for this order, for exactly this amount
    try { await confirmWithRazorpay({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, amountPaise, slotId: rawSlotId }); }
    catch (e) { if (e instanceof PaymentRefused) return NextResponse.json({ error: e.message }, { status: e.status }); console.error("[confirm-payment] razorpay lookup failed", e); return NextResponse.json({ error: "Could not confirm the payment right now" }, { status: 502 }); }
    proven = true;
  }
  // the customer is told the truth: money taken for a booking we could not make is refunded, and they are told so
  const refundAndSay = async (why: string, status: number, message: string) => {
    const refunded = proven ? await refundPayment(razorpayPaymentId, amountPaise, why) : false;
    return NextResponse.json({ error: refunded ? `${message} Your payment has been refunded and should reach you in 5 to 7 working days.` : `${message} If money was taken from you, it will be refunded; call the venue if you do not hear back.` }, { status });
  };

  let hallSlotId: string;
  try {
    hallSlotId = await resolveSlotId(rawSlotId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "SLOT_NOT_FOUND") return refundAndSay("slot missing", 404, "That slot could not be found.");
    return refundAndSay("slot taken", 409, "Sorry, that date is no longer available.");
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

      const { totalPaise: hallPaise } = splitGST(slot.priceOverride ?? slot.hall.pricePerSlot);
      const extras = await resolveAddons(tx, slot.hall.venue.id, addonPicks);
      const totalPaise = hallPaise + extras.totalPaise;
      // what was paid must be what the venue's own rules allow for this total: no paying ₹1 for a hall, no "full payment" of a part
      const problem = checkOnlineAmount({ isFullPayment, amountPaise, totalPaise, minimumAdvancePaise: slot.hall.minimumAdvancePaise, requireFullPayment: slot.hall.requireFullPayment });
      if (problem) throw new PaymentRefused(problem);
      const bookingStatus = isFullPayment ? "CONFIRMED" : "ADVANCE_PAID";

      const booking = await tx.booking.create({
        data: {
          hallSlotId,
          orgId: slot.hall.venue.orgId,
          totalPaise,
          status: bookingStatus,
          advancePaise: amountPaise,
          payments: { create: { orgId: slot.hall.venue.orgId, amountPaise, method: "ONLINE", note: "Paid on the website", paidOn: new Date(todayISO() + "T00:00:00Z") } },
          guestName,
          guestPhone,
          guestEmail: guestEmail ?? null,
          guestAddress: guestAddress ?? null,
          razorpayOrderId,
          razorpayPaymentId,
          addons: { create: extras.rows },
          ...(session?.userId ? { userId: session.userId } : {}),
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
    if (err instanceof PaymentRefused) return refundAndSay("amount not allowed", err.status, err.message + ".");
    const msg = err instanceof Error ? err.message : "";
    if (msg === "SLOT_UNAVAILABLE") return refundAndSay("slot taken", 409, "Sorry, that slot was just taken by someone else.");
    if (msg === "SLOT_NOT_FOUND") return refundAndSay("slot missing", 404, "That slot could not be found.");
    if (msg === "ADDON_UNAVAILABLE") return refundAndSay("add-on gone", 400, "An add-on you picked is no longer available.");
    throw err;
  }
}
