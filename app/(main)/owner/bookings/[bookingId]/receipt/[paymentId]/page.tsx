import { connection } from "next/server";
export const instant = false;
import { notFound, redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { formatRupees } from "@/lib/gst";
import { orgLogoUrl } from "@/lib/org-logo";
import { VirunnuLogo } from "@/components/virunnu-logo";
import { PrintButton } from "@/components/print-button";
import { METHOD_LABEL, netOf, receiptNo } from "@/lib/booking-ledger";

type Params = { params: Promise<{ bookingId: string; paymentId: string }> };
const long = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// A receipt for one payment: what came in, how, and what is still due after it.
export default async function ReceiptPage({ params }: Params) {
  await connection();
  const { bookingId, paymentId } = await params;
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");

  const booking = await db.booking.findFirst({
    where: { id: bookingId, orgId: session.orgId! },
    include: {
      user: { select: { name: true, phone: true } },
      payments: { orderBy: { createdAt: "asc" } },
      hallSlot: { include: { template: true, hall: { include: { venue: { include: { org: { select: { name: true } } } } } } } },
    },
  });
  if (!booking) notFound();
  const at = booking.payments.findIndex((p) => p.id === paymentId);
  if (at < 0) notFound();

  const payment = booking.payments[at];
  const venue = booking.hallSlot.hall.venue;
  const slot = booking.hallSlot;
  const logoUrl = await orgLogoUrl(venue.orgId);
  const customer = { name: booking.user?.name ?? booking.guestName ?? "Guest", phone: booking.user?.phone ?? booking.guestPhone ?? "" };

  const net = netOf(booking);
  const paidUpToNow = booking.payments.slice(0, at + 1).reduce((s, p) => s + p.amountPaise, 0);
  const balanceAfter = Math.max(0, net - paidUpToNow);
  const no = receiptNo(booking.id, at);
  const method = METHOD_LABEL[payment.method] ?? payment.method;
  const eventDay = long(slot.date);

  const phones = session.deny?.includes("hide.phones") ? "" : customer.phone.replace(/\D/g, "").slice(-10);
  const message = [
    `Hello ${customer.name}, we have received ₹${formatRupees(payment.amountPaise)} (${method}) on ${long(payment.paidOn)} for your booking at ${venue.name} on ${eventDay}.`,
    `Total ₹${formatRupees(net)}, received so far ₹${formatRupees(paidUpToNow)}, ${balanceAfter > 0 ? `balance ₹${formatRupees(balanceAfter)}` : "fully paid"}.`,
    `Receipt no. ${no}. Thank you.`,
  ].join("\n");

  return (
    <>
      <style>{`@media print { header, aside, footer, nav { display: none !important; } body > div, main { padding: 0 !important; } }`}</style>
      <div className="print:hidden bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Receipt {no}</span>
        <div className="flex flex-wrap gap-2">
          {phones.length === 10 && (
            <a href={`https://wa.me/91${phones}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> Send on WhatsApp</a>
          )}
          <PrintButton />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 sm:px-6 py-8 print:py-4 print:px-4 font-sans text-zinc-900">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="" className="mb-2 h-14 max-w-[200px] object-contain" />
              : <div className="mb-1"><VirunnuLogo fontSize={24} /></div>}
            <div className="text-sm font-semibold text-zinc-700">{venue.org?.name ?? venue.name}</div>
            <div className="text-xs text-zinc-500">{venue.address}{venue.city ? `, ${venue.city}` : ""}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold uppercase tracking-wide">Receipt</div>
            <div className="text-xs text-zinc-500 mt-1">No: <span className="font-semibold text-zinc-700">{no}</span></div>
            <div className="text-xs text-zinc-500">Date: {long(payment.paidOn)}</div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-zinc-200 px-5 py-5 mb-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Received from</div>
          <div className="text-base font-semibold">{customer.name}</div>
          <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Amount</div>
          <div className="text-3xl font-bold">₹{formatRupees(payment.amountPaise)}</div>
          <div className="mt-1 text-sm text-zinc-600">{method}{payment.note ? ` · ${payment.note}` : ""}</div>
        </div>

        <div className="text-xs text-zinc-500 mb-1">Towards the booking of</div>
        <div className="text-sm font-semibold">{slot.hall.name}, {venue.name}</div>
        <div className="text-sm text-zinc-600 mb-6">{eventDay} · {slot.template.name} ({slot.template.startTime}–{slot.template.endTime}) · Booking {booking.id.slice(-10).toUpperCase()}</div>

        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-zinc-600"><span>Booking total</span><span>₹{formatRupees(net)}</span></div>
          <div className="flex justify-between text-zinc-600"><span>Received so far</span><span>₹{formatRupees(paidUpToNow)}</span></div>
          <div className="flex justify-between font-bold border-t-2 border-zinc-200 pt-2 mt-1 text-base"><span>Balance due</span><span>{balanceAfter > 0 ? `₹${formatRupees(balanceAfter)}` : "Nil"}</span></div>
        </div>

        <div className="mt-12 pt-5 border-t border-zinc-200 text-xs text-zinc-400">
          <p>This is a computer-generated receipt. Thank you for choosing {venue.name}.</p>
        </div>
      </div>
    </>
  );
}
