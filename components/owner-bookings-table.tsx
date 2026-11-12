"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Search, Download, LayoutList, LayoutGrid, Plus } from "lucide-react";
import { usePaginated } from "@/hooks/use-paginated";
import { PaginationBar } from "@/components/pagination-bar";
import { SendReminderButton } from "@/components/send-reminder";
import { OwnerBookingActions } from "@/components/owner-booking-actions";
import { QuickPayButton } from "@/components/quick-pay-button";
import { addonSummary, type BookingAddonItem } from "@/components/booking-addons-button";
import { cn } from "@/lib/utils";
import { WriteOnly, useCanWrite, Show } from "@/components/access-context";

type BookingStatus = "PENDING" | "APPROVED" | "ADVANCE_PAID" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "REJECTED";

const STATUS_STYLE: Record<BookingStatus, string> = {
  PENDING:      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  APPROVED:     "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400",
  ADVANCE_PAID: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
  CONFIRMED:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  CANCELLED:    "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  EXPIRED:      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  REJECTED:     "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};
const STATUS_STRIPE: Record<BookingStatus, string> = {
  PENDING:      "bg-amber-400",
  APPROVED:     "bg-sky-400",
  ADVANCE_PAID: "bg-blue-500",
  CONFIRMED:    "bg-emerald-500",
  CANCELLED:    "bg-red-400",
  EXPIRED:      "bg-zinc-300 dark:bg-zinc-600",
  REJECTED:     "bg-red-400",
};
const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Pending", APPROVED: "Approved", ADVANCE_PAID: "Advance paid",
  CONFIRMED: "Confirmed", CANCELLED: "Cancelled", EXPIRED: "Expired", REJECTED: "Rejected",
};

const TABS = [
  { key: "ALL",          label: "All" },
  { key: "ADVANCE_PAID", label: "Advance paid" },
  { key: "CONFIRMED",    label: "Confirmed" },
  { key: "CANCELLED",    label: "Cancelled" },
] as const;

type Booking = {
  id: string; status: string; totalPaise: number; advancePaise: number | null;
  discountPaise: number | null; discountReason: string | null; cancelReason: string | null;
  paymentMethod: string; createdAt: string;
  user: { name: string | null; phone: string } | null;
  guestName: string | null; guestPhone: string | null;
  hallSlot: { date: string; template: { name: string; startTime: string; endTime: string }; hall: { name: string; venue: { id?: string; name: string } } };
  payment: { status: string; amountPaise: number } | null;
  addons?: BookingAddonItem[];
};


function getAmounts(b: Booking) {
  const disc = b.discountPaise ?? 0;
  const net = b.totalPaise - disc;
  // what was actually received (kept equal to the sum of the booking's payments)
  const paid = b.status === "CONFIRMED" || b.status === "ADVANCE_PAID" ? Math.min(b.advancePaise ?? 0, net) : (b.payment?.status === "PAID" ? b.payment.amountPaise : 0);
  const balance = Math.max(0, net - paid);
  const cancelled = b.status === "CANCELLED" || b.status === "EXPIRED";
  const awaiting = b.status === "PENDING" || b.status === "APPROVED";
  return { disc, net, paid, balance, cancelled, awaiting };
}

// ── Card view ──────────────────────────────────────────────────────────────────

function BookingCard({ b, idx, page, pageSize, onSuccess }: { b: Booking; idx: number; page: number; pageSize: number; onSuccess: () => void }) {
  const { disc, net, paid, balance, cancelled, awaiting } = getAmounts(b);
  const status = b.status as BookingStatus;
  const name = b.user?.name ?? b.guestName ?? "—";
  const phone = b.user?.phone ?? b.guestPhone ?? "—";
  const date = new Date(b.hallSlot.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const initial = name !== "—" ? name[0].toUpperCase() : "?";

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden hover:shadow-md dark:hover:shadow-zinc-800/40 transition-all flex flex-col">
      {/* Status stripe */}
      <div className={cn("h-1 w-full", STATUS_STRIPE[status] ?? STATUS_STRIPE.EXPIRED)} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Top row: date/slot + status badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/owner/bookings/${b.id}`} className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm hover:text-amber-600 hover:underline">{date}</Link>
            <div className="text-xs text-zinc-500 mt-0.5">
              {b.hallSlot.template.name} · {b.hallSlot.template.startTime}–{b.hallSlot.template.endTime}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">{b.hallSlot.hall.venue.name} · {b.hallSlot.hall.name}</div>
          </div>
          <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full shrink-0", STATUS_STYLE[status] ?? STATUS_STYLE.EXPIRED)}>
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{name}</div>
            <div className="text-xs text-zinc-500 truncate">{phone !== "—" ? <Show what="phones" fallback={<span className="text-zinc-300">—</span>}><a href={`tel:${phone}`} className="hover:text-amber-600 hover:underline">{phone}</a></Show> : phone}</div>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-base font-bold text-zinc-900 dark:text-zinc-50">₹{(b.totalPaise / 100).toLocaleString("en-IN")}</div>
            {(b.addons?.length ?? 0) > 0 && <div className="text-xs text-zinc-400">incl. {addonSummary(b.addons!)}</div>}
            {disc > 0 && <div className="text-xs text-amber-600 dark:text-amber-400">🏷️ −₹{(disc / 100).toLocaleString("en-IN")}</div>}
          </div>
          <div className="text-right text-xs space-y-0.5">
            {!cancelled && !awaiting && paid > 0 && <div className="text-emerald-600 dark:text-emerald-400">Paid ₹{(paid / 100).toLocaleString("en-IN")}</div>}
            {!cancelled && !awaiting && balance > 0 && <div className="text-red-500 dark:text-red-400 font-medium">Due ₹{(balance / 100).toLocaleString("en-IN")}</div>}
            {!cancelled && !awaiting && balance === 0 && paid > 0 && <div className="text-emerald-600 dark:text-emerald-400">Fully paid</div>}
            {awaiting && <div className="text-zinc-400">Awaiting payment</div>}
            {b.paymentMethod === "CASH" && !awaiting && <div className="text-zinc-400">💵 Cash</div>}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
          <Link href={`/owner/bookings/${b.id}`} className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">
            Details
          </Link>
          <Link href={`/owner/bookings/${b.id}/invoice`} className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">
            Invoice
          </Link>
          {(b.status === "PENDING" || b.status === "APPROVED" || b.status === "ADVANCE_PAID") && (
            <QuickPayButton
              bookingId={b.id} totalPaise={b.totalPaise} advancePaise={b.advancePaise}
              onSuccess={onSuccess}
            />
          )}
          {(b.status === "PENDING" || b.status === "APPROVED" || b.status === "CONFIRMED" || b.status === "ADVANCE_PAID") && (
            <SendReminderButton data={{
              customerPhone: phone, customerName: name,
              venueName: b.hallSlot.hall.venue.name, hallName: b.hallSlot.hall.name,
              bookingDate: new Date(b.hallSlot.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
              slotName: b.hallSlot.template.name, startTime: b.hallSlot.template.startTime, endTime: b.hallSlot.template.endTime,
              totalPaise: b.totalPaise, advancePaise: b.advancePaise, bookingId: b.id,
            }} />
          )}
          <div className="ml-auto">
            <OwnerBookingActions
              bookingId={b.id} status={status} totalPaise={b.totalPaise} advancePaise={b.advancePaise}
              paymentMethod={b.paymentMethod as "ONLINE" | "CASH"} cancelReason={b.cancelReason}
              discountPaise={b.discountPaise} discountReason={b.discountReason}
              venueId={b.hallSlot.hall.venue.id} addons={b.addons}
              onSuccess={onSuccess}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export type BookingsUrlState = { status: string; search: string; page: number; pageSize: number };

export function OwnerBookingsTable({ initial }: { initial: BookingsUrlState }) {
  const [status, setStatus] = useState(initial.status);
  const [searchInput, setSearchInput] = useState(initial.search);
  const [view, setView] = useState<"list" | "card">("list");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bookings-view");
      if (saved === "card" || saved === "list") setView(saved);
      // nothing chosen yet: a phone starts on cards, which fit the screen better than a wide table
      else if (window.matchMedia("(max-width: 767px)").matches) setView("card");
    } catch { /* */ }
  }, []);

  const { data: bookings, total, totalPages, page, pageSize, loading, error, goToPage, changePageSize, onSearchChange, changeExtraParams, refresh } =
    usePaginated<Booking>({
      url: "/api/owner/bookings",
      defaultPageSize: initial.pageSize,
      initialPage: initial.page,
      initialSearch: initial.search,
      extraParams: initial.status !== "ALL" ? { status: initial.status } : {},
    });

  // Keep the filters in the address bar so the view can be shared or reloaded as-is.
  useEffect(() => {
    const p = new URLSearchParams();
    if (status !== "ALL") p.set("status", status);
    if (searchInput.trim()) p.set("search", searchInput.trim());
    if (page > 1) p.set("page", String(page));
    if (pageSize !== 50) p.set("pageSize", String(pageSize));
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [status, searchInput, page, pageSize]);

  const handleStatus = useCallback((s: string) => {
    setStatus(s);
    changeExtraParams(s !== "ALL" ? { status: s } : {});
  }, [changeExtraParams]);

  const handleSearch = useCallback((v: string) => {
    setSearchInput(v);
    onSearchChange(v);
  }, [onSearchChange]);

  const toggleView = (v: "list" | "card") => {
    setView(v);
    try { localStorage.setItem("bookings-view", v); } catch { /* */ }
  };

  const exportUrl = `/api/owner/bookings/export?${new URLSearchParams({ ...(status !== "ALL" ? { status } : {}), ...(searchInput ? { search: searchInput } : {}) })}`;

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Bookings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading ? "Loading…" : `${total.toLocaleString("en-IN")} booking${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WriteOnly page="bookings"><Link href="/owner/calendar" className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition-colors">
            <Plus className="h-4 w-4" /> Add booking
          </Link></WriteOnly>
          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <button onClick={() => toggleView("list")} title="List view"
              className={cn("px-2.5 py-2 transition-colors", view === "list" ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800")}>
              <LayoutList className="h-4 w-4" />
            </button>
            <button onClick={() => toggleView("card")} title="Card view"
              className={cn("px-2.5 py-2 transition-colors", view === "card" ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <a href={exportUrl} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            <Download className="h-4 w-4" /> CSV
          </a>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input type="search" placeholder="Search by name or phone…" value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => handleStatus(key)}
              className={cn("px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap",
                status === key ? "bg-amber-500 text-white shadow-sm" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Card view ── */}
      {view === "card" && (
        <div>
          {error && (
            <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-5 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load bookings</p>
                <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">{error}</p>
              </div>
              <button onClick={refresh} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shrink-0">
                Retry
              </button>
            </div>
          )}
          {!error && loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 h-56 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          )}
          {!error && !loading && bookings.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center">
              <p className="text-zinc-400 text-sm">{searchInput || status !== "ALL" ? "No bookings match your filter." : "No bookings yet."}</p>
            </div>
          )}
          {!error && !loading && bookings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookings.map((b, idx) => <BookingCard key={b.id} b={b} idx={idx} page={page} pageSize={pageSize} onSuccess={refresh} />)}
            </div>
          )}
          {!error && !loading && total > 25 && (
            <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <PaginationBar page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={goToPage} onPageSize={changePageSize} />
            </div>
          )}
        </div>
      )}

      {/* ── List view ── */}
      {view === "list" && (
        <>
          {error && (
            <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-5 flex items-center gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load bookings</p>
                <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">{error}</p>
              </div>
              <button onClick={refresh} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shrink-0">
                Retry
              </button>
            </div>
          )}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wide w-10">#</th>
                  {["Date & Slot", "Customer", "Amount", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading && <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-400 text-sm">Loading…</td></tr>}
                {!loading && bookings.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-400 text-sm">
                    {searchInput || status !== "ALL" ? "No bookings match your filter." : "No bookings yet."}
                  </td></tr>
                )}
                {!loading && bookings.map((b, idx) => {
                  const { disc, net, paid, balance, cancelled, awaiting } = getAmounts(b);
                  const s = b.status as BookingStatus;
                  const date = new Date(b.hallSlot.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  return (
                    <tr key={b.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="p-0 text-xs font-medium text-zinc-400 tabular-nums">
                        <Link href={`/owner/bookings/${b.id}`} className="block px-4 py-3" aria-label="Open booking details">{(page - 1) * pageSize + idx + 1}</Link>
                      </td>
                      <td className="p-0 whitespace-nowrap">
                        <Link href={`/owner/bookings/${b.id}`} className="block px-4 py-3 hover:bg-amber-50/60 dark:hover:bg-amber-950/10 transition-colors">
                          <div className="text-zinc-900 dark:text-zinc-50">{date}</div>
                          <div className="text-zinc-500 text-xs">{b.hallSlot.template.name} · {b.hallSlot.template.startTime}–{b.hallSlot.template.endTime}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-zinc-900 dark:text-zinc-50">{b.user?.name ?? b.guestName ?? "—"}</div>
                        <div className="text-zinc-500 text-xs">{(b.user?.phone ?? b.guestPhone) ? <Show what="phones" fallback={<span className="text-zinc-300">—</span>}><a href={`tel:${b.user?.phone ?? b.guestPhone}`} className="hover:text-amber-600 hover:underline">{b.user?.phone ?? b.guestPhone}</a></Show> : "—"}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-0.5 text-xs">
                          <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">₹{(b.totalPaise / 100).toLocaleString("en-IN")}</div>
                          {(b.addons?.length ?? 0) > 0 && <div className="text-zinc-400 max-w-[180px] truncate" title={addonSummary(b.addons!)}>incl. {addonSummary(b.addons!)}</div>}
                          {disc > 0 && <div className="text-amber-600 dark:text-amber-400" title={b.discountReason ?? undefined}>🏷️ −₹{(disc / 100).toLocaleString("en-IN")}{b.discountReason && <span className="text-zinc-400 ml-1">· {b.discountReason}</span>}</div>}
                          {!cancelled && !awaiting && paid > 0 && <div className="text-emerald-600 dark:text-emerald-400">Paid ₹{(paid / 100).toLocaleString("en-IN")}</div>}
                          {!cancelled && !awaiting && balance > 0 && <div className="text-red-500 dark:text-red-400 font-medium">Due ₹{(balance / 100).toLocaleString("en-IN")}</div>}
                          {!cancelled && !awaiting && balance === 0 && paid > 0 && <div className="text-emerald-600 dark:text-emerald-400">Fully paid</div>}
                          {awaiting && <div className="text-zinc-400">Awaiting payment</div>}
                          {b.paymentMethod === "CASH" && !awaiting && <div className="text-zinc-400">💵 Cash</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", STATUS_STYLE[s] ?? STATUS_STYLE.EXPIRED)}>
                          {STATUS_LABEL[s] ?? b.status}
                        </span>
                        {b.cancelReason && <div className="text-[10px] text-zinc-400 mt-1 max-w-[120px] truncate" title={b.cancelReason}>{b.cancelReason}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/owner/bookings/${b.id}`} className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap">Details</Link>
                          <Link href={`/owner/bookings/${b.id}/invoice`} className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap">Invoice</Link>
                          {(b.status === "PENDING" || b.status === "APPROVED" || b.status === "ADVANCE_PAID") && (
                            <QuickPayButton
                              bookingId={b.id} totalPaise={b.totalPaise} advancePaise={b.advancePaise}
                              onSuccess={refresh}
                            />
                          )}
                          {(b.status === "PENDING" || b.status === "APPROVED" || b.status === "CONFIRMED" || b.status === "ADVANCE_PAID") && (
                            <SendReminderButton data={{
                              customerPhone: b.user?.phone ?? b.guestPhone ?? "",
                              customerName: b.user?.name ?? b.guestName ?? "",
                              venueName: b.hallSlot.hall.venue.name, hallName: b.hallSlot.hall.name,
                              bookingDate: new Date(b.hallSlot.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
                              slotName: b.hallSlot.template.name, startTime: b.hallSlot.template.startTime, endTime: b.hallSlot.template.endTime,
                              totalPaise: b.totalPaise, advancePaise: b.advancePaise, bookingId: b.id,
                            }} />
                          )}
                          <OwnerBookingActions
                            bookingId={b.id} status={s} totalPaise={b.totalPaise} advancePaise={b.advancePaise}
                            paymentMethod={b.paymentMethod as "ONLINE" | "CASH"} cancelReason={b.cancelReason}
                            discountPaise={b.discountPaise} discountReason={b.discountReason}
                            venueId={b.hallSlot.hall.venue.id} addons={b.addons}
                            onSuccess={refresh}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={goToPage} onPageSize={changePageSize} />
        </div>
        </>
      )}
    </div>
  );
}
