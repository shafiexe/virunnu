"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Phone, ChevronDown, ChevronUp, Tag, Banknote } from "lucide-react";

type Booking = {
  id: string;
  status: string;
  totalPaise: number;
  advancePaise: number;
  discountPaise: number;
  discountReason: string | null;
  cancelReason: string | null;
  refundPaise: number;
  refundNote: string | null;
  paymentMethod: string;
  createdAt: string;
  hallName: string;
  venueName: string;
  templateName: string | null;
  slotDate: string;
  slotSession: string;
  paidPaise: number;
};

type Customer = { id: string; name: string | null; phone: string };

type Props = { customer: Customer; bookings: Booking[] };

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  ADVANCE_PAID: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  EXPIRED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  ADVANCE_PAID: "Advance paid",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

function paise(n: number) {
  return `₹${(n / 100).toLocaleString("en-IN")}`;
}

function DiscountEditor({ booking, onUpdated }: { booking: Booking; onUpdated: (updated: Booking) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(booking.discountPaise > 0 ? String(booking.discountPaise / 100) : "");
  const [reason, setReason] = useState(booking.discountReason ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const rupees = parseFloat(amount);
    if (isNaN(rupees) || rupees < 0) { setError("Enter a valid amount (0 to remove)"); return; }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/owner/bookings/${booking.id}/discount`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discountPaise: Math.round(rupees * 100), discountReason: reason.trim() || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to save discount");
      return;
    }
    const data = await res.json();
    onUpdated({
      ...booking,
      discountPaise: data.booking.discountPaise,
      discountReason: data.booking.discountReason,
    });
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-600 transition-colors"
      >
        <Tag className="h-3 w-3" />
        {booking.discountPaise > 0 ? `Discount: ${paise(booking.discountPaise)}` : "Add discount"}
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 space-y-2">
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Set discount</p>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Amount (₹)</label>
          <input
            type="number"
            min={0}
            max={booking.totalPaise / 100}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex-[2] space-y-1">
          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Family member, staff referral…"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
          Cancel
        </button>
      </div>
    </div>
  );
}

function RefundEditor({ booking, onUpdated }: { booking: Booking; onUpdated: (b: Booking) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(booking.refundPaise > 0 ? String(booking.refundPaise / 100) : "");
  const [note, setNote] = useState(booking.refundNote ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const rupees = parseFloat(amount || "0");
    if (isNaN(rupees) || rupees < 0) { setError("Enter a valid amount"); return; }
    setLoading(true); setError("");
    const res = await fetch(`/api/owner/bookings/${booking.id}/refund`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refundPaise: Math.round(rupees * 100), refundNote: note.trim() || null }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to save"); return; }
    const data = await res.json();
    onUpdated({ ...booking, refundPaise: data.booking.refundPaise, refundNote: data.booking.refundNote });
    setOpen(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-blue-600 transition-colors">
        💸 {booking.refundPaise > 0 ? `Refunded: ${paise(booking.refundPaise)}` : "Record refund"}
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 space-y-2">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Record refund</p>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Amount (₹)</label>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex-2 space-y-1">
          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Reason (optional)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Customer request, weather…"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold">
          {loading ? "Saving…" : "Save refund"}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">Cancel</button>
      </div>
    </div>
  );
}

function CashPaymentEditor({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const disc = booking.discountPaise ?? 0;
  const net = booking.totalPaise - disc;
  const remaining = net - booking.advancePaise;
  const [amountInput, setAmountInput] = useState(String(remaining / 100));

  async function save() {
    const rupees = parseFloat(amountInput || "0");
    if (isNaN(rupees) || rupees <= 0) { setError("Enter a valid amount"); return; }
    const amountPaise = Math.round(rupees * 100);
    const isFull = amountPaise >= remaining;
    const advancePaise = isFull ? 0 : amountPaise;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/owner/bookings/${booking.id}/cash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advancePaise, method: method === "CASH" ? "CASH" : "ONLINE" }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to record payment");
      return;
    }
    window.location.reload();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-600 transition-colors"
      >
        <Banknote className="h-3 w-3" />
        Record payment
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 space-y-2 w-full">
      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Record payment received</p>

      {/* Method selector */}
      <div className="grid grid-cols-3 gap-1.5">
        {([
          { key: "CASH", icon: "💵", label: "Cash" },
          { key: "UPI", icon: "📱", label: "UPI / GPay" },
          { key: "CARD", icon: "💳", label: "Card" },
        ] as const).map((m) => (
          <button key={m.key} type="button" onClick={() => setMethod(m.key)}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border text-[10px] font-semibold transition-colors ${
              method === m.key
                ? "border-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-emerald-300 bg-white dark:bg-zinc-900"
            }`}>
            <span>{m.icon}</span>{m.label}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
          Amount (₹) — remaining: {paise(remaining)}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
          <input
            type="number"
            min={1}
            step={100}
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="w-full pl-7 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {(() => {
          const a = Math.round(parseFloat(amountInput || "0") * 100);
          if (!isNaN(a) && a > 0 && a < remaining) {
            return <p className="text-[10px] text-amber-600">Partial payment — {paise(remaining - a)} will remain due</p>;
          }
          return null;
        })()}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold">
          {loading ? "Saving…" : "Confirm payment received"}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
          Cancel
        </button>
      </div>
    </div>
  );
}

function BookingCard({ booking: initial, onUpdated }: { booking: Booking; onUpdated: (b: Booking) => void }) {
  const [booking, setBooking] = useState(initial);

  function handleUpdate(updated: Booking) {
    setBooking(updated);
    onUpdated(updated);
  }
  const [expanded, setExpanded] = useState(true);

  const disc = booking.discountPaise ?? 0;
  const effTotal = booking.totalPaise - disc;
  const totalPaid = booking.advancePaise + booking.paidPaise;
  const balance = Math.max(0, effTotal - totalPaid);
  const cancelled = booking.status === "CANCELLED" || booking.status === "EXPIRED";

  const dateStr = new Date(booking.slotDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">{booking.venueName}</span>
            <span className="text-zinc-400">·</span>
            <span className="text-sm text-zinc-500">{booking.hallName}</span>
            {booking.templateName && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{booking.templateName}</span>}
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">{dateStr} · {booking.slotSession}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[booking.status] ?? ""}`}>
            {STATUS_LABEL[booking.status] ?? booking.status}
          </span>
          <button onClick={() => setExpanded((v) => !v)} className="p-1 text-zinc-400 hover:text-zinc-600">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Quick amounts */}
      {(() => {
        const slotPast = new Date(booking.slotDate) < new Date();
        const overdue = !cancelled && balance > 0 && slotPast;
        const advanceTaken = booking.advancePaise > 0;
        const refund = booking.refundPaise ?? 0;
        return (
          <div className="px-4 pb-3 flex gap-4 flex-wrap text-sm">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wide font-semibold">Total</div>
              <div className="font-semibold text-zinc-800 dark:text-zinc-200">{paise(booking.totalPaise)}</div>
            </div>
            {disc > 0 && (
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wide font-semibold">Discount</div>
                <div className="font-semibold text-amber-600 dark:text-amber-400">−{paise(disc)}</div>
              </div>
            )}
            {cancelled && advanceTaken && (
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wide font-semibold">Advance collected</div>
                <div className="font-semibold text-zinc-600 dark:text-zinc-400">{paise(booking.advancePaise)}</div>
              </div>
            )}
            {cancelled && refund > 0 && (
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wide font-semibold">Refunded</div>
                <div className="font-semibold text-blue-600 dark:text-blue-400">{paise(refund)}</div>
              </div>
            )}
            {!cancelled && totalPaid > 0 && (
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wide font-semibold">Paid</div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">{paise(totalPaid)}</div>
              </div>
            )}
            {!cancelled && (
              <div>
                <div className={`text-[10px] uppercase tracking-wide font-semibold ${overdue ? "text-red-500" : "text-zinc-400"}`}>
                  {overdue ? "⚠ Overdue" : "Balance"}
                </div>
                <div className={`font-bold ${balance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {balance > 0 ? paise(balance) : "Fully paid"}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 space-y-3">
          {/* Invoice breakdown */}
          <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 text-sm overflow-hidden">
            <div className="flex justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50">
              <span className="text-zinc-500">Booking total</span>
              <span className="font-medium">{paise(booking.totalPaise)}</span>
            </div>
            {booking.discountPaise > 0 && (
              <div className="flex justify-between px-3 py-2">
                <div>
                  <span className="text-amber-600">Discount</span>
                  {booking.discountReason && <span className="ml-2 text-[10px] text-zinc-400 italic">{booking.discountReason}</span>}
                </div>
                <span className="font-medium text-amber-600">−{paise(booking.discountPaise)}</span>
              </div>
            )}
            <div className="flex justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 font-semibold">
              <span>Net payable</span>
              <span>{paise(effTotal)}</span>
            </div>
            {booking.advancePaise > 0 && (
              <div className="flex justify-between px-3 py-2 text-emerald-600">
                <span>Advance paid</span>
                <span>−{paise(booking.advancePaise)}</span>
              </div>
            )}
            {booking.paidPaise > 0 && (
              <div className="flex justify-between px-3 py-2 text-emerald-600">
                <span>Payment received</span>
                <span>−{paise(booking.paidPaise)}</span>
              </div>
            )}
            {cancelled ? (
              <>
                {booking.refundPaise > 0 ? (
                  <div className="flex justify-between px-3 py-2 font-bold text-blue-600 dark:text-blue-400">
                    <span>Refunded</span>
                    <span>{paise(booking.refundPaise)}</span>
                  </div>
                ) : booking.advancePaise > 0 ? (
                  <div className="flex justify-between px-3 py-2 text-zinc-400 italic text-xs">
                    <span className="not-italic font-semibold text-sm text-zinc-500">Booking cancelled</span>
                    <span>No refund recorded</span>
                  </div>
                ) : (
                  <div className="flex justify-between px-3 py-2 font-semibold text-zinc-500">
                    <span>Booking cancelled</span>
                    <span>—</span>
                  </div>
                )}
              </>
            ) : (
              <div className={`flex justify-between px-3 py-2 font-bold ${balance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                <span>{balance > 0 ? "Balance due" : "Balance"}</span>
                <span>{balance > 0 ? paise(balance) : "₹0"}</span>
              </div>
            )}
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap gap-3">
            {!cancelled && <DiscountEditor booking={booking} onUpdated={handleUpdate} />}
            {!cancelled && (booking.status === "PENDING" || booking.status === "ADVANCE_PAID") && (
              <CashPaymentEditor booking={booking} />
            )}
            {cancelled && booking.advancePaise > 0 && <RefundEditor booking={booking} onUpdated={handleUpdate} />}
          </div>

          {/* Cancel reason */}
          {booking.cancelReason && (
            <p className="text-xs text-red-500">Cancelled: {booking.cancelReason}</p>
          )}

          <div className="text-[10px] text-zinc-400">
            Booked on {new Date(booking.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {booking.paymentMethod}
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomerDetail({ customer, bookings: initialBookings }: Props) {
  const [bookings, setBookings] = useState(initialBookings);

  function handleBookingUpdate(updated: Booking) {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  const active = bookings.filter((b) => b.status !== "CANCELLED" && b.status !== "EXPIRED");
  const totalPaise = active.reduce((s, b) => s + b.totalPaise, 0);
  const totalDiscount = active.reduce((s, b) => s + (b.discountPaise ?? 0), 0);
  const totalPaid =
    active.reduce((s, b) => s + b.advancePaise + b.paidPaise, 0) +
    bookings.filter((b) => b.status === "CANCELLED").reduce((s, b) => s + Math.max(0, b.advancePaise - (b.refundPaise ?? 0)), 0);
  const totalBalance = bookings.reduce((s, b) => {
    if (b.status === "EXPIRED") return s;
    if (b.status === "CANCELLED") {
      return s + Math.max(0, b.advancePaise - (b.refundPaise ?? 0));
    }
    const disc = b.discountPaise ?? 0;
    return s + Math.max(0, b.totalPaise - disc - b.advancePaise - b.paidPaise);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Back + customer header */}
      <div>
        <Link href="/owner/customers" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 mb-4">
          <ArrowLeft className="h-4 w-4" /> Customers
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-xl font-bold text-amber-700 dark:text-amber-400">
            {(customer.name ?? customer.phone)[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{customer.name ?? "No name"}</h1>
            <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 text-amber-600 hover:underline text-sm mt-0.5">
              <Phone className="h-3.5 w-3.5" />
              {customer.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total booked", value: paise(Math.max(0, totalPaise - totalDiscount)), color: "text-zinc-900 dark:text-zinc-50" },
          { label: "Discount given", value: totalDiscount > 0 ? paise(totalDiscount) : "—", color: "text-amber-600 dark:text-amber-400" },
          { label: "Amount paid", value: totalPaid > 0 ? paise(totalPaid) : "—", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Balance due", value: totalPaid === 0 && totalBalance === 0 ? "—" : totalBalance > 0 ? paise(totalBalance) : "Fully paid", color: totalPaid === 0 && totalBalance === 0 ? "text-zinc-400" : totalBalance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400" },
        ].map((t) => (
          <div key={t.label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">{t.label}</div>
            <div className={`text-lg font-bold mt-1 ${t.color}`}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* Bookings */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Bookings ({bookings.length})</h2>
        <div className="space-y-3">
          {bookings.map((b) => <BookingCard key={b.id} booking={b} onUpdated={handleBookingUpdate} />)}
        </div>
      </div>
    </div>
  );
}
