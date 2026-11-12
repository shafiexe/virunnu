import { BookingCaterer } from "@/components/booking-caterer";
import { BookingPayments } from "@/components/booking-payments";
import { METHOD_LABEL, receiptNo } from "@/lib/booking-ledger";
import { long, receiptMessage } from "@/lib/booking-receipt";
import { getAppUrl } from "@/lib/app-url";
import { ShowS as Show } from "@/components/show-server";
import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { formatRupees, splitForVenue } from "@/lib/gst";
import { addonDetail } from "@/lib/addons";
import { BackToList } from "@/components/back-to-list";
import { OwnerBookingActions } from "@/components/owner-booking-actions";
import { SendReminderButton } from "@/components/send-reminder";

type Params = { params: Promise<{ bookingId: string }> };

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  APPROVED: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400",
  ADVANCE_PAID: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
  CONFIRMED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  EXPIRED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending", APPROVED: "Approved", ADVANCE_PAID: "Advance paid",
  CONFIRMED: "Confirmed", CANCELLED: "Cancelled", EXPIRED: "Expired", REJECTED: "Rejected",
};

const rs = (paise: number) => `₹${formatRupees(paise)}`;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className="text-zinc-900 dark:text-zinc-50 text-right min-w-0 break-words">{children}</span>
    </div>
  );
}

export default async function OwnerBookingDetailPage({ params }: Params) {
  await connection();
  const { bookingId } = await params;
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { name: true, phone: true, email: true } },
      addons: { orderBy: { name: "asc" } },
      payment: true,
      payments: { orderBy: { createdAt: "asc" } },
      caterer: { select: { id: true, name: true, city: true, phone: true, whatsappNumber: true } },
      hallSlot: { include: { template: true, hall: { include: { venue: true } } } },
    },
  });
  if (!booking || booking.hallSlot.hall.venue.orgId !== session.orgId!) notFound();

  const { hallSlot } = booking;
  const venue = hallSlot.hall.venue;
  const customer = {
    name: booking.user?.name ?? booking.guestName ?? "Guest",
    phone: booking.user?.phone ?? booking.guestPhone ?? "—",
    email: booking.user?.email ?? booking.guestEmail ?? null,
  };

  const addonsPaise = booking.addons.reduce((s, a) => s + a.pricePaise, 0);
  const hallPaise = booking.totalPaise - addonsPaise;
  const discountPaise = booking.discountPaise ?? 0;
  const netPaise = booking.totalPaise - discountPaise;
  const catererEnquiry = booking.catererEnquiryId ? await db.cateringEnquiry.findUnique({ where: { id: booking.catererEnquiryId }, select: { status: true } }) : null;
  const phoneDigits = session.deny?.includes("hide.phones") ? "" : customer.phone.replace(/\D/g, "").slice(-10);
  const closed = booking.status === "CANCELLED" || booking.status === "EXPIRED" || booking.status === "REJECTED";
  const tax = splitForVenue(netPaise, venue);

  const dateLong = new Date(hallSlot.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const dateShort = new Date(hallSlot.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const created = booking.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const ref = booking.id.slice(-10).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 [&>*]:max-w-3xl space-y-5">
      <BackToList href="/owner/bookings" label="Back to bookings" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 truncate">{customer.name}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{dateLong} · {hallSlot.template.name} ({hallSlot.template.startTime}–{hallSlot.template.endTime})</p>
        </div>
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${STATUS_STYLE[booking.status] ?? STATUS_STYLE.EXPIRED}`}>
          {STATUS_LABEL[booking.status] ?? booking.status}
        </span>
      </div>

      {booking.cancelReason && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <span className="font-semibold">Cancelled:</span> {booking.cancelReason}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <OwnerBookingActions
          inline
          bookingId={booking.id}
          status={booking.status}
          totalPaise={booking.totalPaise}
          advancePaise={booking.advancePaise}
          paymentMethod={booking.paymentMethod}
          cancelReason={null}
          discountPaise={booking.discountPaise}
          discountReason={booking.discountReason}
          venueId={venue.id}
          addons={booking.addons}
        />
        <Link
          href={`/owner/bookings/${booking.id}/invoice`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
        >
          <FileText className="h-4 w-4" /> Invoice
        </Link>
        {!closed && (
          <SendReminderButton
            data={{
              customerPhone: customer.phone,
              customerName: customer.name,
              venueName: venue.name,
              hallName: hallSlot.hall.name,
              bookingDate: dateShort,
              slotName: hallSlot.template.name,
              startTime: hallSlot.template.startTime,
              endTime: hallSlot.template.endTime,
              totalPaise: booking.totalPaise,
              advancePaise: booking.advancePaise,
              bookingId: booking.id,
            }}
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Booking">
          <Row label="Date">{dateLong}</Row>
          <Row label="Slot">{hallSlot.template.name} · {hallSlot.template.startTime}–{hallSlot.template.endTime}</Row>
          <Row label="Hall">{hallSlot.hall.name}</Row>
          <Row label="Venue">{venue.name}</Row>
          <Row label="Booked on">{created}</Row>
          <Row label="Booking ID">{ref}</Row>
        </Card>

        <Card title="Customer">
          <Row label="Name">{customer.name}</Row>
          <Row label="Phone">{customer.phone !== "—" ? <Show what="phones" fallback={<span className="text-zinc-300">—</span>}><a href={`tel:${customer.phone}`} className="text-amber-600 dark:text-amber-400 hover:underline">{customer.phone}</a></Show> : "—"}</Row>
          {customer.email && <Row label="Email">{customer.email}</Row>}
          {booking.guestAddress && <Row label="Address">{booking.guestAddress}</Row>}
        </Card>
      </div>

      <Card title="Charges">
        <Row label="Hall rental">{rs(hallPaise)}</Row>
        {booking.addons.length > 0 ? (
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Add-ons</div>
            {booking.addons.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">
                  {a.name}
                  {addonDetail(a) && <span className="block text-xs text-zinc-400">{addonDetail(a)}</span>}
                </span>
                <span className="text-zinc-900 dark:text-zinc-50">{rs(a.pricePaise)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-1.5 text-sm">
              <span className="text-zinc-500">Add-ons total</span><span className="font-medium">{rs(addonsPaise)}</span>
            </div>
          </div>
        ) : (
          <Row label="Add-ons"><span className="text-zinc-400">None — use Add-ons above to add AC, security, etc.</span></Row>
        )}
        {discountPaise > 0 && (
          <Row label={`Discount${booking.discountReason ? ` (${booking.discountReason})` : ""}`}>
            <span className="text-amber-600 dark:text-amber-400">−{rs(discountPaise)}</span>
          </Row>
        )}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">Total</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{rs(netPaise)}</span>
        </div>
        {tax.enabled && (
          <p className="text-xs text-zinc-400">
            Includes GST: {rs(tax.gstPaise)} (CGST {tax.rate}% {rs(tax.cgstPaise)} + SGST {tax.rate}% {rs(tax.sgstPaise)}) on a base of {rs(tax.basePaise)}.
          </p>
        )}
      </Card>

      <Card title="Caterer">
        <BookingCaterer
          bookingId={booking.id}
          closed={closed}
          canShare={!session.deny?.includes("hide.phones")}
          caterer={booking.caterer ? { id: booking.caterer.id, name: booking.caterer.name, city: booking.caterer.city, phone: booking.caterer.phone, whatsapp: booking.caterer.whatsappNumber } : null}
          sent={booking.catererEnquiryId ? { status: catererEnquiry?.status ?? "PENDING" } : null}
        />
      </Card>

      <Card title="Payments">
        <BookingPayments
          bookingId={booking.id}
          netPaise={netPaise}
          closed={closed}
          canRemove={!session.tm}
          payments={booking.payments.map((p, i) => {
            const upTo = booking.payments.slice(0, i + 1).reduce((sum, x) => sum + x.amountPaise, 0);
            const no = receiptNo(booking.id, i);
            const text = receiptMessage({ customerName: customer.name, amountPaise: p.amountPaise, method: METHOD_LABEL[p.method] ?? p.method, paidOn: p.paidOn, venueName: venue.name, eventDay: long(hallSlot.date), net: netPaise, paidUpToNow: upTo, balanceAfter: Math.max(0, netPaise - upTo), no, link: `${getAppUrl()}/r/${p.shareToken}` });
            return { id: p.id, amountPaise: p.amountPaise, method: p.method, paidOn: p.paidOn.toISOString().slice(0, 10), note: p.note, recordedBy: p.recordedBy, receiptNo: no, whatsappHref: phoneDigits.length === 10 ? `https://wa.me/91${phoneDigits}?text=${encodeURIComponent(text)}` : null };
          })}
        />
      </Card>

      <div className="pt-1">
        <BackToList href="/owner/bookings" label="Back to bookings" />
      </div>
    </div>
  );
}
