"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Search, Download, Phone } from "lucide-react";
import { usePaginated } from "@/hooks/use-paginated";
import { PaginationBar } from "@/components/pagination-bar";

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

export function OwnerCustomersTable() {
  const [searchInput, setSearchInput] = useState("");

  const { data: customers, total, totalPages, page, pageSize, loading, goToPage, changePageSize, onSearchChange } =
    usePaginated<Customer>({ url: "/api/owner/customers", defaultPageSize: 50 });

  const handleSearch = useCallback((v: string) => {
    setSearchInput(v);
    onSearchChange(v);
  }, [onSearchChange]);

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
        <a href={exportUrl} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          <Download className="h-4 w-4" /> CSV
        </a>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search by name or phone…"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-sm pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* Table */}
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
                {loading && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-zinc-400 text-sm">Loading…</td></tr>
                )}
                {!loading && customers.map((c) => {
                  const net = c.totalPaise - c.discountPaise;
                  const paid = c.advancePaise;
                  const balance = Math.max(0, net - paid);
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
                        {paid > 0 ? `₹${(paid / 100).toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">
                        {net === 0
                          ? <span className="text-zinc-400">—</span>
                          : balance > 0
                            ? <span className="text-red-600 dark:text-red-400">₹{(balance / 100).toLocaleString("en-IN")}</span>
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
    </div>
  );
}
