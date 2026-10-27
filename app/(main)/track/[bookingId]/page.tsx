import { connection } from "next/server";
export const instant = false;
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicBooking } from "@/services/booking.service";
import {
  CheckCircle2, Clock, XCircle, AlertCircle, MapPin,
  CalendarDays, Users, CreditCard, ArrowLeft, Phone,
} from "lucide-react";

type Props = { params: Promise<{ bookingId: string }> };

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; style: string; note: string }> = {
  PENDING: {
    label: "Awaiting approval",
    icon: <Clock className="h-5 w-5" />,
    style: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
    note: "The venue owner is reviewing your booking request.",
  },
  APPROVED: {
    label: "Approved — payment pending",
    icon: <AlertCircle className="h-5 w-5" />,
    style: "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/40",
    note: "Your booking has been approved. Please complete payment to confirm your slot.",
  },
  ADVANCE_PAID: {
    label: "Advance paid",
    icon: <CheckCircle2 className="h-5 w-5" />,
    style: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
    note: "Advance received. Remaining balance is due on or before the event date.",
  },
  CONFIRMED: {
    label: "Confirmed",
    icon: <CheckCircle2 className="h-5 w-5" />,
    style: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
    note: "Your booking is fully confirmed. See you at the venue!",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: <XCircle className="h-5 w-5" />,
    style: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40",
    note: "This booking has been cancelled.",
  },
  EXPIRED: {
    label: "Expired",
    icon: <Clock className="h-5 w-5" />,
    style: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
    note: "This booking hold expired before payment was completed.",
  },
};

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function PublicBookingPage({ params }: Props) {
  await connection();
  const { bookingId } = await params;
  const booking = await getPublicBooking(bookingId);
  if (!booking) notFound();

  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.PENDING;
  const venue = booking.hallSlot.hall.venue;
  const hall = booking.hallSlot.hall;
  const template = booking.hallSlot.template;
  const date = new Date(booking.hallSlot.date).toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const guestPhone = booking.guestPhone ?? booking.user?.phone ?? null;
  const guestName = booking.guestName ?? booking.user?.name ?? null;
  const maskedPhone = guestPhone
    ? guestPhone.replace(/(\d{2})\d+(\d{4})/, "$1•••••$2")
    : null;

  const advancePaid = booking.advancePaise ?? 0;
  const remaining = booking.totalPaise - advancePaid - (booking.discountPaise ?? 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      {/* Back */}
      <Link href="/track" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Track another booking
      </Link>

      {/* Status banner */}
      <div className={`rounded-2xl border p-5 flex items-start gap-3 ${cfg.style}`}>
        <span className="shrink-0 mt-0.5">{cfg.icon}</span>
        <div>
          <p className="font-semibold text-sm">{cfg.label}</p>
          <p className="text-sm opacity-80 mt-0.5">{cfg.note}</p>
          {booking.cancelReason && (
            <p className="text-sm opacity-70 mt-1">Reason: {booking.cancelReason}</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
        {/* Venue & hall */}
        <div className="p-5 space-y-1">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Venue</p>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{venue.name}</h2>
          <p className="text-sm text-zinc-500">{hall.name} · {hall.capacity.toLocaleString()} guests capacity</p>
          {venue.address && (
            <div className="flex items-center gap-1.5 text-sm text-zinc-500 mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{venue.address}</span>
            </div>
          )}
          {venue.phone && (
            <div className="flex items-center gap-1.5 text-sm text-zinc-500 mt-0.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <a href={`tel:${venue.phone}`} className="hover:text-amber-600 transition-colors">{venue.phone}</a>
            </div>
          )}
        </div>

        {/* Date & slot */}
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Date</p>
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              <CalendarDays className="h-4 w-4 text-amber-500 shrink-0" />
              {date}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Slot</p>
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              {template.name} · {template.startTime}–{template.endTime}
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="p-5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Payment</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Total amount</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">{fmt(booking.totalPaise)}</span>
            </div>
            {booking.discountPaise > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>− {fmt(booking.discountPaise)}</span>
              </div>
            )}
            {advancePaid > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Advance paid</span>
                <span>− {fmt(advancePaid)}</span>
              </div>
            )}
            {remaining > 0 && ["ADVANCE_PAID", "APPROVED"].includes(booking.status) && (
              <div className="flex justify-between font-semibold border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-1">
                <span className="text-zinc-700 dark:text-zinc-300">Balance due</span>
                <span className="text-zinc-900 dark:text-zinc-50">{fmt(remaining)}</span>
              </div>
            )}
            {booking.status === "CONFIRMED" && (
              <div className="flex items-center gap-2 mt-2 text-emerald-600 text-xs font-medium">
                <CreditCard className="h-3.5 w-3.5" />
                Fully paid
              </div>
            )}
          </div>
        </div>

        {/* Guest info */}
        {(guestName || maskedPhone) && (
          <div className="p-5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Booked by</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-400">
                {(guestName ?? "?")[0].toUpperCase()}
              </div>
              <div>
                {guestName && <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{guestName}</p>}
                {maskedPhone && <p className="text-xs text-zinc-500">{maskedPhone}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Reference */}
        <div className="p-5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Booking reference</p>
          <code className="text-xs font-mono text-zinc-600 dark:text-zinc-400 break-all">{booking.id}</code>
        </div>
      </div>

      {/* Login prompt for full actions */}
      {["APPROVED", "ADVANCE_PAID"].includes(booking.status) && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-800 dark:text-amber-300">
          <p className="font-medium mb-1">Complete your payment</p>
          <p className="text-xs opacity-80 mb-3">Sign in with your phone number to make the payment and fully confirm your booking.</p>
          <Link
            href={`/login?next=/bookings/${booking.id}`}
            className="inline-block rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 transition-colors"
          >
            Sign in to pay →
          </Link>
        </div>
      )}
    </div>
  );
}
