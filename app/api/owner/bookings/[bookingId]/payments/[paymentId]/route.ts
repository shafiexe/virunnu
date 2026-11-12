import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { bookingRef, METHOD_LABEL, netOf, statusAfterPayment } from "@/lib/booking-ledger";

// Removes a payment that was entered by mistake. Only the main owner can, and it is written to the activity list.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ bookingId: string; paymentId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.tm) return NextResponse.json({ error: "Only the owner can remove a payment" }, { status: 403 });

  const { bookingId, paymentId } = await params;
  const payment = await db.bookingPayment.findFirst({ where: { id: paymentId, bookingId, orgId: session.orgId }, include: { booking: { include: { payments: { select: { id: true, amountPaise: true } } } } } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { booking } = payment;
  // money that came through the website is Virunnu's to account for (commission, payout), so it cannot be undone from here
  if (payment.method === "ONLINE") return NextResponse.json({ error: "A payment made on the website cannot be removed here. Contact Virunnu." }, { status: 409 });

  const paidAfter = booking.payments.filter((p) => p.id !== paymentId).reduce((s, p) => s + p.amountPaise, 0);
  const net = netOf(booking);
  // nothing paid any more still leaves a confirmed booking, with the whole amount due
  const status = booking.status === "CANCELLED" || booking.status === "EXPIRED" ? booking.status : paidAfter > 0 ? statusAfterPayment(booking.status, net, paidAfter) : "CONFIRMED";

  await db.$transaction([
    db.bookingPayment.delete({ where: { id: paymentId } }),
    db.booking.update({ where: { id: bookingId }, data: { advancePaise: paidAfter, status: status as typeof booking.status } }),
  ]);

  await logActivity(session, `Removed a payment of ₹${(payment.amountPaise / 100).toLocaleString("en-IN")} (${METHOD_LABEL[payment.method] ?? payment.method}) from booking ${bookingRef(bookingId).slice(-6)}`, "payment");
  return NextResponse.json({ ok: true, paidPaise: paidAfter });
}
