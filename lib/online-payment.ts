import { raiseAlert } from "@/lib/alert";
import Razorpay from "razorpay";
import { db } from "@/lib/db";
import { splitGST } from "@/lib/gst";
import { resolveAddons, type AddonPick } from "@/lib/venue-addons";
import { checkOnlineAmount, signatureMatches, MIN_ONLINE_PAYMENT_PAISE } from "@/lib/online-amount";

export { checkOnlineAmount, signatureMatches, MIN_ONLINE_PAYMENT_PAISE };

// Everything about taking a payment online that must be decided by the server, never by the browser: what the booking costs,
// what may be paid now, and whether the money really arrived. The browser only says which slot, which add-ons, and "advance or full".

export class PaymentRefused extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const VIRTUAL = "virtual_", BLOCKED = "blocked_";

// What a slot costs and whether it can still be booked, for a real slot or a calendar day that has no slot row yet
export async function quoteSlot(rawSlotId: string, addons: AddonPick[] | undefined) {
  let hallId: string, priceOverride: number | null = null, date: Date, templateId: string | null = null, slotRow: { id: string; status: string } | null = null;

  if (rawSlotId.startsWith(VIRTUAL) || rawSlotId.startsWith(BLOCKED)) {
    const rest = rawSlotId.slice((rawSlotId.startsWith(VIRTUAL) ? VIRTUAL : BLOCKED).length);
    date = new Date(rest.slice(-10) + "T00:00:00.000Z");
    templateId = rest.slice(0, rest.length - 11);
    const t = await db.slotTemplate.findUnique({ where: { id: templateId }, select: { hallId: true } });
    if (!t || Number.isNaN(date.getTime())) throw new PaymentRefused("That slot was not found", 404);
    hallId = t.hallId;
    slotRow = await db.hallSlot.findUnique({ where: { hallId_templateId_date: { hallId, templateId, date } }, select: { id: true, status: true, priceOverride: true } });
    priceOverride = (slotRow as { priceOverride?: number | null } | null)?.priceOverride ?? null;
  } else {
    const s = await db.hallSlot.findUnique({ where: { id: rawSlotId }, select: { id: true, status: true, hallId: true, date: true, priceOverride: true } });
    if (!s) throw new PaymentRefused("That slot was not found", 404);
    hallId = s.hallId; date = s.date; priceOverride = s.priceOverride; slotRow = { id: s.id, status: s.status };
  }

  const hall = await db.hall.findUnique({ where: { id: hallId }, select: { pricePerSlot: true, minimumAdvancePaise: true, requireFullPayment: true, venue: { select: { id: true, approved: true } } } });
  if (!hall || !hall.venue.approved) throw new PaymentRefused("That venue is not taking bookings", 404);
  if (await db.blockedDate.findFirst({ where: { hallId, date }, select: { id: true } })) throw new PaymentRefused("That date is not available", 409);
  if (slotRow && slotRow.status !== "AVAILABLE") throw new PaymentRefused("That slot was just taken. Please pick another.", 409);
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00Z");
  if (date < today) throw new PaymentRefused("That date has passed", 400);

  const extras = await resolveAddons(db as never, hall.venue.id, addons);
  const totalPaise = splitGST(priceOverride ?? hall.pricePerSlot).totalPaise + extras.totalPaise;
  return { totalPaise, minimumAdvancePaise: hall.minimumAdvancePaise, requireFullPayment: hall.requireFullPayment };
}

// The money really arrived: Razorpay itself says this payment belongs to this order, is paid, and is for exactly this amount.
export async function confirmWithRazorpay(o: { orderId: string; paymentId: string; amountPaise: number; slotId?: string }) {
  const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
  const [payment, order] = await Promise.all([rz.payments.fetch(o.paymentId), rz.orders.fetch(o.orderId)]);
  if (payment.order_id !== o.orderId || Number(payment.amount) !== o.amountPaise || !["captured", "authorized"].includes(String(payment.status))) throw new PaymentRefused("This payment could not be confirmed with Razorpay");
  if (Number(order.amount) !== o.amountPaise || (o.slotId && order.notes?.hallSlotId !== o.slotId)) throw new PaymentRefused("This payment was not made for this booking");
}

// Money that arrived for a booking we could not make (the date was taken a moment earlier, an add-on went, the amount was not allowed)
// goes back to the customer straight away. Returns whether Razorpay accepted the refund; a failure is logged so it can be done by hand.
export async function refundPayment(paymentId: string, amountPaise: number, reason: string): Promise<boolean> {
  try {
    const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
    await rz.payments.refund(paymentId, { amount: amountPaise, speed: "optimum", notes: { reason } });
    return true;
  } catch (e) {
    console.error(`[refund-failed] payment ${paymentId} ₹${amountPaise / 100} (${reason}) NEEDS A MANUAL REFUND`, e);
    await raiseAlert("A refund failed: do it by hand", `Razorpay payment ${paymentId}, ₹${amountPaise / 100}, reason: ${reason}. Refund it in the Razorpay dashboard.`);
    return false;
  }
}
