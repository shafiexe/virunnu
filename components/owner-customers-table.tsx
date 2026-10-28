"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Search, Download, Phone, LayoutList, LayoutGrid, CalendarDays } from "lucide-react";
import { usePaginated } from "@/hooks/use-paginated";
import { PaginationBar } from "@/components/pagination-bar";
import { cn } from "@/lib/utils";

type Customer = {
  id: string;
  userId: string | null;
  name: string | null;
  phone: string | null;
  bookingCount: number;
  confirmedCount: number;
  cancelledCount: number;
  totalPaise: number;
  discountPaise: number;
  advancePaise: number;
  lastBooking: string;
};

function CustomerCard({ c }: { c: Customer }) {
  const net = c.totalPaise - c.discountPaise;
  const balance = Math.max(0, net - c.advancePaise);
  const initial = ((c.name ?? c.phone ?? "?")[0]).toUpperCase();
  const href = `/owner/customers/${c.userId ?? c.id}`;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md dark:hover:shadow-zinc-800/40 transition-all flex flex-col overflow-hidden">
      {/* Top section: avatar + name + phone */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <Link href={href} className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950/60 dark:to-amber-900/40 flex items-center justify-center text-base font-bold text-amber-700 dark:text-amber-400 shrink-0 hover:opacity-80 transition-opacity">
          {initial}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={href} className="block font-semibold text-sm text-zinc-900 dark:text-zinc-50 hover:text-amber-600 dark:hover:text-amber-400 transition-colors truncate">
            {c.name ?? "No name"}
          </Link>
          <a href={`tel:${c.phone}`}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-600 transition-colors mt-0.5">
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">{c.phone ?? "—"}</span>
          </a>
        </div>
        {/* Booking count badge */}
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-none">{c.bookingCount}</div>
          <div className="text-[10px] text-zinc-400 uppercase tracking-wide">booking{c.bookingCount !== 1 ? "s" : ""}</div>
          {c.confirmedCount > 0 && <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">✓ {c.confirmedCount}</div>}
        </div>
      </div>

      {/* Finance rows */}
      <div className="px-4 pb-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Total</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {net > 0 ? `₹${(net / 100).toLocaleString("en-IN")}` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Paid</span>
          <span className={cn("font-semibold", c.advancePaise > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400")}>
            {c.advancePaise > 0 ? `₹${(c.advancePaise / 100).toLocaleString("en-IN")}` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Balance</span>
          <span className={cn("font-semibold",
            net === 0 ? "text-zinc-400" :
            balance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
            {net === 0 ? "—" : balance > 0 ? `₹${(balance / 100).toLocaleString("en-IN")}` : "Clear"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span>Last: {new Date(c.lastBooking).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
        {c.cancelledCount > 0 && (
          <span className="text-red-400">✕ {c.cancelledCount} cancelled</span>
        )}
      </div>
    </div>
  );
}

export function OwnerCustomersTable() {
  const [searchInput, setSearchInput] = useState("");
  const [view, setView] = useState<"list" | "card">("list");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("customers-view");
      if (saved === "card" || saved === "list") setView(saved);
    } catch { /* */ }
  }, []);

  const { data: customers, total, totalPages, page, pageSize, loading, error, goToPage, changePageSize, onSearchChange, refresh } =
    usePaginated<Customer>({ url: "/api/owner/customers", defaultPageSize: 50 });

  const handleSearch = useCallback((v: string) => {
    setSearchInput(v);
    onSearchChange(v);
  }, [onSearchChange]);

  const toggleView = (v: "list" | "card") => {
    setView(v);
    try { localStorage.setItem("customers-view", v); } catch { /* */ }
  };

  const exportUrl = `/api/owner/customers/export${searchInput ? `?search=${encodeURIComponent(searchInput)}` : ""}`;

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Customers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading ? "Loading…" : `${total.toLocaleString("en-IN")} unique customer${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input type="search" placeholder="Search by name or phone…" value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-sm pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-5 flex items-center gap-3 mb-4">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load customers</p>
            <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">{error}</p>
          </div>
          <button onClick={refresh} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* ── Card view ── */}
      {view === "card" && (
        <div>
          {!error && loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 h-48 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          )}
          {!error && !loading && customers.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center">
              <p className="text-zinc-400 text-sm">{searchInput ? "No customers match your search." : "No customers yet. Bookings will appear here."}</p>
            </div>
          )}
          {!error && !loading && customers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map((c) => <CustomerCard key={c.id} c={c} />)}
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
      {view === "list" && !error && (
        <>
          {!loading && customers.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center">
              <p className="text-zinc-400 text-sm">{searchInput ? "No customers match your search." : "No customers yet. Bookings will appear here."}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      {["Customer", "Phone", "Bookings", "Total", "Discount", "Paid", "Balance", "Last booking"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {loading && <tr><td colSpan={8} className="px-4 py-12 text-center text-zinc-400 text-sm">Loading…</td></tr>}
                    {!loading && customers.map((c) => {
                      const net = c.totalPaise - c.discountPaise;
                      const balance = Math.max(0, net - c.advancePaise);
                      return (
                        <tr key={c.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/owner/customers/${c.userId ?? c.id}`} className="flex items-center gap-3 group">
                              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
                                {((c.name ?? c.phone ?? "?")[0]).toUpperCase()}
                              </div>
                              <div className="font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-amber-600 transition-colors">
                                {c.name ?? "No name"}
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-amber-600 hover:underline">
                              <Phone className="h-3 w-3" />{c.phone ?? "—"}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 w-fit">{c.bookingCount} total</span>
                              {c.confirmedCount > 0 && <span className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ {c.confirmedCount} confirmed</span>}
                              {c.cancelledCount > 0 && <span className="text-[10px] text-red-500 dark:text-red-400">✕ {c.cancelledCount} cancelled</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                            {net > 0 ? `₹${(net / 100).toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            {c.discountPaise > 0 ? `−₹${(c.discountPaise / 100).toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                            {c.advancePaise > 0 ? `₹${(c.advancePaise / 100).toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">
                            {net === 0 ? <span className="text-zinc-400">—</span>
                              : balance > 0 ? <span className="text-red-600 dark:text-red-400">₹{(balance / 100).toLocaleString("en-IN")}</span>
                              : <span className="text-emerald-600 dark:text-emerald-400 text-xs">Paid</span>}
                          </td>
                          <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                            {new Date(c.lastBooking).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={goToPage} onPageSize={changePageSize} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
