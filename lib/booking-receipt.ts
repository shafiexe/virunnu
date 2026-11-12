import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatRupees } from "@/lib/gst";
import { orgLogoUrl } from "@/lib/org-logo";
import { getAppUrl } from "@/lib/app-url";
import { METHOD_LABEL, netOf, receiptNo } from "@/lib/booking-ledger";

const long = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export type ReceiptData = Awaited<ReturnType<typeof loadReceipt>>;

// Everything one receipt shows. The owner's page and the customer's link both read it from here, so they never differ.
export async function loadReceipt(where: Prisma.BookingPaymentWhereInput) {
  const payment = await db.bookingPayment.findFirst({
    where,
    include: {
      booking: {
        include: {
          user: { select: { name: true, phone: true } },
          payments: { orderBy: { createdAt: "asc" }, select: { id: true, amountPaise: true } },
          hallSlot: { include: { template: true, hall: { include: { venue: { include: { org: { select: { name: true } } } } } } } },
        },
      },
    },
  });
  if (!payment) return null;

  const { booking } = payment;
  const slot = booking.hallSlot;
  const venue = slot.hall.venue;
  const at = booking.payments.findIndex((p) => p.id === payment.id);
  const net = netOf(booking);
  const paidUpToNow = booking.payments.slice(0, at + 1).reduce((s, p) => s + p.amountPaise, 0);
  const balanceAfter = Math.max(0, net - paidUpToNow);
  const customerName = booking.user?.name ?? booking.guestName ?? "Guest";
  const customerPhone = booking.user?.phone ?? booking.guestPhone ?? "";
  const no = receiptNo(booking.id, at);
  const method = METHOD_LABEL[payment.method] ?? payment.method;
  const eventDay = long(slot.date);
  const link = `${getAppUrl()}/r/${payment.shareToken}`;

  return {
    id: payment.id, bookingId: booking.id, shareToken: payment.shareToken, link,
    no, method, note: payment.note, amountPaise: payment.amountPaise, paidOn: long(payment.paidOn),
    customerName, customerPhone,
    business: venue.org?.name ?? venue.name, venueName: venue.name, address: `${venue.address}${venue.city ? `, ${venue.city}` : ""}`,
    hallName: slot.hall.name, eventDay, slotLabel: `${slot.template.name} (${slot.template.startTime}–${slot.template.endTime})`, bookingRef: booking.id.slice(-10).toUpperCase(),
    netPaise: net, paidPaise: paidUpToNow, balancePaise: balanceAfter,
    logoUrl: await orgLogoUrl(venue.orgId),
    // the message the owner sends with the link
    message: [
      `Hello ${customerName}, we have received ₹${formatRupees(payment.amountPaise)} (${method}) on ${long(payment.paidOn)} for your booking at ${venue.name} on ${eventDay}.`,
      `Total ₹${formatRupees(net)}, received so far ₹${formatRupees(paidUpToNow)}, ${balanceAfter > 0 ? `balance ₹${formatRupees(balanceAfter)}` : "fully paid"}.`,
      `Your receipt (${no}): ${link}`,
    ].join("\n"),
  };
}
