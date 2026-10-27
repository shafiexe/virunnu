import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBooking } from "@/services/booking.service";
import { RazorpayCheckout } from "@/components/razorpay-checkout";
import { TestPaymentButton } from "@/components/test-payment-button";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { AdvancePaymentForm, RemainingPaymentSection } from "@/components/advance-payment";
import { CheckCircle, MapPin, ArrowLeft, Calendar, Clock, CreditCard, AlertCircle } from "lucide-react";
import { HoldCountdown } from "@/components/hold-countdown";
import { GST_RATE } from "@/lib/gst";

type Props = { params: Promise<{ bookingId: string }> };

const STATUS_LABEL: Record<string, string> = {
  PENDING:      "Awaiting approval",
  APPROVED:     "Approved — awaiting payment",
  ADVANCE_PAID: "Advance paid",
  CONFIRMED:    "Confirmed",
  CANCELLED:    "Cancelled",
  EXPIRED:      "Expired",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING:      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  APPROVED:     "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400",
  ADVANCE_PAID: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
  CONFIRMED:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  CANCELLED:    "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400",
  EXPIRED:      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function BookingPage({ params }: Props) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const { bookingId } = await params;
  const booking = await getBooking(bookingId);
  if (!booking) notFound();

  const isOwner = session.role === "OWNER" && booking.orgId === session.orgId;
  const isCustomer = booking.userId === session.userId;
  if (!isOwner && !isCustomer) notFound();

  const venue = booking.hallSlot.hall.venue;
  const hall = booking.hallSlot.hall;
  const template = booking.hallSlot.template;
  const date = new Date(booking.hallSlot.date).toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const heldUntil = booking.hallSlot.heldUntil ? new Date(booking.hallSlot.heldUntil) : null;
  const advancePaise = booking.advancePaise ?? null;
  const basePaise = Math.round(booking.totalPaise / (1 + GST_RATE / 100));
  const gstPaise = booking.totalPaise - basePaise;

  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-6">
      <Link href="/bookings" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        My bookings
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Booking</h1>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_STYLE[booking.status] ?? STATUS_STYLE.EXPIRED}`}>
          {STATUS_LABEL[booking.status] ?? booking.status}
        </span>
      </div>

      {booking.status === "CONFIRMED" && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 text-sm font-medium">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Your booking is confirmed! See you there.
        </div>
      )}

      {booking.status === "ADVANCE_PAID" && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-4 py-3 text-sm font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Advance paid — your slot is reserved. Complete the remaining payment before your event.
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {/* Hall & venue */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 space-y-1">
          <div className="font-bold text-lg text-zinc-900 dark:text-zinc-50">{hall.name}</div>
          <div className="flex items-center gap-1 text-sm text-zinc-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {venue.name}, {venue.city}
          </div>
        </div>

        {/* Details grid */}
        <div className="p-5 grid grid-cols-2 gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-zinc-500 uppercase tracking-wide font-medium">
              <Calendar className="h-3 w-3" /> Date
            </div>
            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-50">{date}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-zinc-500 uppercase tracking-wide font-medium">
              <Clock className="h-3 w-3" /> Slot
            </div>
            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-50">{template.name}</div>
            <div className="text-xs text-zinc-500">{template.startTime} – {template.endTime}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-zinc-500 uppercase tracking-wide font-medium">
              <CreditCard className="h-3 w-3" /> Amount
            </div>
            <div className="font-bold text-lg text-amber-600 dark:text-amber-400">
              ₹{(basePaise / 100).toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-zinc-500 space-y-0.5">
              <div>+₹{(gstPaise / 100).toLocaleString("en-IN")} GST (18%)</div>
              <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                Total ₹{(booking.totalPaise / 100).toLocaleString("en-IN")}
              </div>
            </div>
            {advancePaise && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Advance paid: ₹{(advancePaise / 100).toLocaleString("en-IN")}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Booking ID</div>
            <div className="font-mono text-xs text-zinc-500 break-all">{booking.id}</div>
          </div>
        </div>

        {booking.status === "PENDING" && heldUntil && (
          <div className="px-5 pb-5">
            <HoldCountdown heldUntil={heldUntil.toISOString()} />
          </div>
        )}
      </div>

      {/* PENDING: full payment + advance option */}
      {booking.status === "PENDING" && isCustomer && (
        <div className="space-y-3">
          {process.env.NODE_ENV === "development" ? (
            <TestPaymentButton bookingId={booking.id} amountPaise={booking.totalPaise} />
          ) : (
            <RazorpayCheckout bookingId={booking.id} amountPaise={booking.totalPaise} />
          )}

          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            <span>or pay an advance</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          </div>

          <AdvancePaymentForm bookingId={booking.id} totalPaise={booking.totalPaise} />

          <div className="flex justify-center">
            <CancelBookingButton bookingId={booking.id} />
          </div>
        </div>
      )}

      {/* ADVANCE_PAID: show remaining balance + pay remaining */}
      {booking.status === "ADVANCE_PAID" && isCustomer && advancePaise && (
        <div className="space-y-3">
          <RemainingPaymentSection
            bookingId={booking.id}
            totalPaise={booking.totalPaise}
            advancePaise={advancePaise}
          />
          <div className="flex justify-center">
            <CancelBookingButton bookingId={booking.id} />
          </div>
        </div>
      )}
    </div>
  );
}
