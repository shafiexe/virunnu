"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search } from "lucide-react";

const TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "ADVANCE_PAID", label: "Advance paid" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

export function BookingsFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeStatus = searchParams.get("status") ?? "ALL";
  const search = searchParams.get("search") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) params.set(k, v); else params.delete(k);
      }
      params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Search by name or phone…"
          defaultValue={search}
          onChange={(e) => updateParams({ search: e.target.value })}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => updateParams({ status: key === "ALL" ? "" : key })}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
              activeStatus === key || (key === "ALL" && activeStatus === "ALL")
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
