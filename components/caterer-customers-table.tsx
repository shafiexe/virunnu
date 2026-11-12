"use client";

import { EmptyState } from "@/components/empty-state";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UrlPagination } from "@/components/url-pagination";
import { Phone, Search, SearchX, Users2 } from "lucide-react";
import { rs } from "@/lib/caterer-orders";
import { SendReminder } from "@/components/caterer-send-reminder";
import { cn } from "@/lib/utils";
import { Show } from "@/components/access-context";

export type CustomerRow = {
  id: string; name: string; phone: string; shareToken: string; orderCount: number; billCount: number;
  billedPaise: number; receivedPaise: number; balancePaise: number; lastDate: string | null;
};

export function CatererCustomersTable({ customers, totalCustomers, totalDuePaise, search: initialSearch, dueOnly, paging, query }: {
  customers: CustomerRow[]; totalCustomers: number; totalDuePaise: number; search: string; dueOnly: boolean;
  paging: { page: number; totalPages: number; total: number; pageSize: number }; query: Record<string, string>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  // search and the "balance due" filter live in the address; changing either goes back to page 1
  const go = (next: { search?: string; due?: boolean }) => {
    const p = new URLSearchParams();
    const q = next.search ?? search;
    const d = next.due ?? dueOnly;
    if (q.trim()) p.set("search", q.trim());
    if (d) p.set("due", "1");
    if (paging.pageSize !== 50) p.set("pageSize", String(paging.pageSize));
    const qs = p.toString();
    router.replace(qs ? `/caterer/customers?${qs}` : "/caterer/customers", { scroll: false });
  };
  useEffect(() => {
    if (search.trim() === initialSearch.trim()) return;
    const t = setTimeout(() => go({ search }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const list = customers;
  const totalDue = totalDuePaise;
  const dueSetter = (v: boolean) => go({ due: v });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Customers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{totalCustomers} customer{totalCustomers !== 1 ? "s" : ""}{totalDue > 0 && <> · <span className="text-red-600 dark:text-red-400 font-medium">{rs(totalDue)} due in total</span></>}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 dark:text-zinc-400 pointer-events-none" />
          <input type="search" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div className="flex gap-1">
          {[{ k: false, l: "All" }, { k: true, l: "Balance due" }].map((t) => (
            <button key={String(t.k)} onClick={() => dueSetter(t.k)}
              className={cn("px-3 py-2 rounded-xl text-xs font-medium transition-colors", dueOnly === t.k ? "bg-amber-500 text-zinc-900 shadow-sm" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700")}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                {["Customer", "Phone", "Functions", "Billed", "Received", "Balance", "Last function"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {list.length === 0 && (
                <tr><td colSpan={7}>
                  {totalCustomers === 0
                    ? <EmptyState inTable icon={Users2} title="No customers yet" hint="Customers are filed automatically when you save an order or a quotation, so you never type them twice." actions={[{ href: "/caterer/orders/new", label: "New order" }]} />
                    : <EmptyState inTable icon={SearchX} title="No customers match" hint="Check the spelling, or clear the search and the balance filter." />}
                </td></tr>
              )}
              {list.map((c) => (
                <tr key={c.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="p-0">
                    <Link href={`/caterer/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50/60 dark:hover:bg-amber-950/10 transition-colors">
                      <span className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">{c.name[0]?.toUpperCase()}</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">{c.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><Show what="phones" fallback={<span className="text-zinc-300">—</span>}><a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-500 hover:underline"><Phone className="h-3 w-3" />{c.phone}</a></Show></td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{c.orderCount}<span className="text-xs text-zinc-500 dark:text-zinc-400"> · {c.billCount} invoice{c.billCount === 1 ? "" : "s"}</span></td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{c.billedPaise > 0 ? rs(c.billedPaise) : "—"}</td>
                  <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{c.receivedPaise > 0 ? rs(c.receivedPaise) : "—"}</td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{c.balancePaise > 0 ? <div className="space-y-1"><div className="text-red-600 dark:text-red-400">{rs(c.balancePaise)}</div><Show what="phones"><SendReminder compact customerId={c.id} customerName={c.name} phone={c.phone} balancePaise={c.balancePaise} invoices="your account" date={c.lastDate ?? new Date().toISOString()} path={`/s/${c.shareToken}`} /></Show></div> : <span className="text-zinc-500 dark:text-zinc-400 text-xs">{c.billedPaise > 0 ? "Closed" : "—"}</span>}</td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{c.lastDate ? new Date(c.lastDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <UrlPagination basePath="/caterer/customers" query={query} {...paging} />
      </div>
    </div>
  );
}
