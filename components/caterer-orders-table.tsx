"use client";

import { EmptyState } from "@/components/empty-state";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ClipboardList, Download, Eye, MessageCircle, Plus, Search, SearchX } from "lucide-react";
import { QuickPay } from "@/components/caterer-quick-pay";
import { SendReminder } from "@/components/caterer-send-reminder";
import { billMessage, whatsappLink } from "@/lib/caterer-share";
import { getActiveBusiness } from "@/lib/caterer-templates";
import { usePaginated } from "@/hooks/use-paginated";
import { PaginationBar } from "@/components/pagination-bar";
import { BILL_LABEL, billMoney, formatTime, rs, type BillTypeKey } from "@/lib/caterer-orders";
import { cn } from "@/lib/utils";
import { WriteOnly, Show } from "@/components/access-context";

type OrderRow = {
  id: string; date: string; shareToken: string; status: "CONFIRMED" | "COMPLETED" | "CANCELLED"; place: string | null; eventType: string | null;
  customer: { id: string; name: string; phone: string };
  servings: { label: string; time: string; guests: number | null }[];
  bills: { id: string; type: BillTypeKey; number: number; shareToken: string; subtotalPaise: number; discountPaise: number; taxPaise: number; receivedPaise: number }[];
};

export type OrdersUrlState = { status: string; search: string; page: number; pageSize: number };

const TABS = [
  { key: "ALL", label: "All" },
  { key: "CONFIRMED", label: "Upcoming" },
  { key: "DUES", label: "Balance due" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

const STATUS_STYLE = {
  CONFIRMED: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
} as const;
const STATUS_LABEL = { CONFIRMED: "Upcoming", COMPLETED: "Completed", CANCELLED: "Cancelled" } as const;

export function CatererOrdersTable({ initial }: { initial: OrdersUrlState }) {
  const [status, setStatus] = useState(initial.status);
  const [searchInput, setSearchInput] = useState(initial.search);

  const params = (s: string): Record<string, string> => (s === "DUES" ? { dues: "1" } : s !== "ALL" ? { status: s } : {});
  const { data: orders, total, totalPages, page, pageSize, loading, error, goToPage, changePageSize, onSearchChange, changeExtraParams, refresh } =
    usePaginated<OrderRow>({
      url: "/api/caterer/orders", defaultPageSize: initial.pageSize, initialPage: initial.page, initialSearch: initial.search, extraParams: params(initial.status),
    });

  // Filters live in the address bar so a filtered list can be shared or reloaded as-is
  useEffect(() => {
    const p = new URLSearchParams();
    if (status !== "ALL") p.set("status", status);
    if (searchInput.trim()) p.set("search", searchInput.trim());
    if (page > 1) p.set("page", String(page));
    if (pageSize !== 50) p.set("pageSize", String(pageSize));
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [status, searchInput, page, pageSize]);

  const handleStatus = useCallback((s: string) => { setStatus(s); changeExtraParams(params(s)); }, [changeExtraParams]);
  const handleSearch = useCallback((v: string) => { setSearchInput(v); onSearchChange(v); }, [onSearchChange]);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Orders</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{loading ? "Loading…" : `${total.toLocaleString("en-IN")} order${total !== 1 ? "s" : ""}`}</p>
        </div>
        <WriteOnly page="orders"><Link href="/caterer/orders/new" className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors">
          <Plus className="h-4 w-4" /> New order
        </Link></WriteOnly>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 dark:text-zinc-400 pointer-events-none" />
          <input
            type="search" placeholder="Search by customer, phone or place…" value={searchInput} onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => handleStatus(key)}
              className={cn("px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap", status === key ? "bg-amber-500 text-zinc-900 shadow-sm" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-5 flex items-center gap-3 mb-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="flex-1 text-sm text-red-700 dark:text-red-400">{error}</p>
          <button onClick={refresh} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-100 text-red-700">Retry</button>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                {["Date", "Customer", "Serve times", "Bills", "Balance", "Status", "Invoice"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading && <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Loading…</td></tr>}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={7}>
                  {searchInput || status !== "ALL"
                    ? <EmptyState inTable icon={SearchX} title="No orders match" hint="Try a different word, or look at all orders." actions={[{ href: "/caterer/orders", label: "Show all orders", primary: false }]} />
                    : <EmptyState inTable icon={ClipboardList} title="No orders yet" hint="Add your first function. Customers, invoices and balances are filed for you as you go." actions={[{ href: "/caterer/orders/new", label: "New order" }, { href: "/caterer/quotes/new", label: "Send a quotation first", primary: false }]} />}
                </td></tr>
              )}
              {!loading && orders.map((o) => {
                const balance = o.status === "CANCELLED" ? 0 : o.bills.reduce((s, b) => s + billMoney(b).balancePaise, 0);
                const date = new Date(o.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
                return (
                  <tr key={o.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-0 whitespace-nowrap">
                      <Link href={`/caterer/orders/${o.id}`} className="block px-4 py-3 hover:bg-amber-50/60 dark:hover:bg-amber-950/10 transition-colors" aria-label="Open order">
                        <div className="text-zinc-900 dark:text-zinc-50">{date}</div>
                        <div className="text-zinc-500 text-xs">{o.eventType ?? "Function"}{o.place ? ` · ${o.place}` : ""}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/caterer/customers/${o.customer.id}`} className="text-zinc-900 dark:text-zinc-50 hover:text-amber-600">{o.customer.name}</Link>
                      <Show what="phones"><div className="text-xs"><a href={`tel:${o.customer.phone}`} className="text-zinc-500 hover:text-amber-600 hover:underline">{o.customer.phone}</a></div></Show>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {o.servings.length === 0 ? "—" : o.servings.map((s, i) => (
                        <div key={i} className="whitespace-nowrap">{s.label} {formatTime(s.time)}{s.guests ? ` · ${s.guests}` : ""}</div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {o.bills.length === 0 ? "—" : o.bills.map((b) => (
                        <div key={b.id} className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">#{b.number}</span> {b.type === "FOOD" ? "Food" : "Service"} {rs(billMoney(b).netPaise)}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">
                      {o.bills.length === 0 || o.status === "CANCELLED" ? <span className="text-zinc-500 dark:text-zinc-400">—</span>
                        : balance > 0 ? (
                          <div className="space-y-1">
                            <div className="text-red-600 dark:text-red-400">{rs(balance)}</div>
                            <div className="flex flex-wrap gap-1">
                              <QuickPay compact customer={o.customer.name} onDone={refresh}
                                bills={o.bills.map((b) => ({ id: b.id, number: b.number, type: b.type, balancePaise: billMoney(b).balancePaise })).filter((b) => b.balancePaise > 0)} />
                              <Show what="phones"><SendReminder compact customerId={o.customer.id} customerName={o.customer.name} phone={o.customer.phone} balancePaise={balance} date={o.date} path={`/o/${o.shareToken}`}
                                invoices={(() => { const n = o.bills.filter((b) => billMoney(b).balancePaise > 0).map((b) => b.number); return n.length === 1 ? `Invoice ${n[0]}` : `Invoices ${n.join(", ")}`; })()} /></Show>
                            </div>
                          </div>
                        )
                        : <span className="text-emerald-600 dark:text-emerald-400 text-xs">Closed</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", STATUS_STYLE[o.status])}>{STATUS_LABEL[o.status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      {o.bills.length === 0 || o.status === "CANCELLED" ? <span className="text-zinc-500 dark:text-zinc-400">—</span> : (
                        <div className="space-y-1">
                          {o.bills.map((b) => (
                            <div key={b.id} className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                              <span className="w-14 text-zinc-500">#{b.number} {b.type === "FOOD" ? "Food" : "Service"}</span>
                              <Link href={`/caterer/orders/${o.id}/invoice?bill=${b.type}`} title="View invoice" aria-label={`View invoice ${b.number}`}
                                className="inline-flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-amber-400 hover:text-amber-600 transition-colors">
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                              <Show what="phones"><button type="button" title="Send invoice on WhatsApp" aria-label={`Send invoice ${b.number} on WhatsApp`}
                                onClick={() => window.open(whatsappLink(o.customer.phone, billMessage({ catererName: getActiveBusiness().name, customerName: o.customer.name, number: b.number, type: b.type, date: o.date, bill: { ...b, taxPaise: b.taxPaise ?? 0 }, url: `${window.location.origin}/b/${b.shareToken}` })), "_blank", "noopener")}
                                className="inline-flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-emerald-600 hover:border-emerald-400 transition-colors">
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button></Show>
                              <a href={`/api/caterer/orders/${o.id}/pdf?bill=${b.type}`} download title="Download PDF" aria-label={`Download invoice ${b.number}`}
                                className="inline-flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-amber-400 hover:text-amber-600 transition-colors">
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && total > 25 && <PaginationBar page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={goToPage} onPageSize={changePageSize} />}
      </div>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{Object.values(BILL_LABEL).join(" · ")} are billed separately for each function.</p>
    </div>
  );
}
