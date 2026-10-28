"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function CatererDashboardTabs({ activeTab, pendingCount }: { activeTab: string; pendingCount: number }) {
  const tabs = [
    { key: "service", label: "My Service" },
    { key: "enquiries", label: pendingCount > 0 ? `Enquiries (${pendingCount})` : "Enquiries" },
  ];

  return (
    <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`/caterer/dashboard?tab=${t.key}`}
          className={cn(
            "flex-1 text-center py-2 px-4 rounded-lg text-sm font-semibold transition-colors",
            activeTab === t.key
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          {t.label}
          {t.key === "enquiries" && pendingCount > 0 && activeTab !== "enquiries" && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
