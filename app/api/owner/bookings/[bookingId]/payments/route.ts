import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { actorOf, logActivity } from "@/lib/activity";
import { asDay, bookingRef, METHOD_LABEL, netOf, paymentBody, statusAfterPayment, todayISO } from "@/lib/booking-ledger";

const rs = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

// Record money received against a booking. The booking's paid total, balance and status follow from the payments.
export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = paymentBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const { bookingId } = await params;
  const booking = await db.booking.findFirst({ where: { id: bookingId, orgId: session.orgId }, include: { payments: { select: { amountPaise: true } } } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status === "CANCELLED" || booking.status === "EXPIRED" || booking.status === "REJECTED") return NextResponse.json({ error: "This booking is cancelled" }, { status: 409 });

  const { amountRupees, method, note } = parsed.data;
  const paidOn = parsed.data.paidOn ?? todayISO();
  if (paidOn > todayISO()) return NextResponse.json({ error: "The date cannot be in the future" }, { status: 400 });

  const amountPaise = Math.round(amountRupees * 100);
  const net = netOf(booking);
  const paidBefore = booking.payments.reduce((s, p) => s + p.amountPaise, 0);
  const due = net - paidBefore;
  if (due <= 0) return NextResponse.json({ error: "This booking is already fully paid" }, { status: 409 });
  if (amountPaise > due) return NextResponse.json({ error: `Only ${rs(due)} is still due` }, { status: 400 });

  const paidAfter = paidBefore + amountPaise;
  const status = statusAfterPayment(booking.status, net, paidAfter);
  const actor = await actorOf(session);
  const wasWaiting = booking.status === "PENDING" || booking.status === "APPROVED";

  const [payment] = await db.$transaction([
    db.bookingPayment.create({ data: { bookingId, orgId: session.orgId, amountPaise, method, note: note || null, paidOn: asDay(paidOn), recordedBy: actor.label } }),
    db.booking.update({ where: { id: bookingId }, data: { advancePaise: paidAfter, status: status as typeof booking.status, ...(method === "CASH" ? { paymentMethod: "CASH" } : {}) } }),
    // the first money in on a requested booking is what confirms the date
    ...(wasWaiting ? [db.hallSlot.update({ where: { id: booking.hallSlotId }, data: { status: "BOOKED", heldUntil: null } })] : []),
  ]);

  await logActivity(session, `Recorded ${rs(amountPaise)} (${METHOD_LABEL[method]}) on booking ${bookingRef(bookingId).slice(-6)}`, "payment");
  return NextResponse.json({ payment, paidPaise: paidAfter, balancePaise: Math.max(0, net - paidAfter), status }, { status: 201 });
}
