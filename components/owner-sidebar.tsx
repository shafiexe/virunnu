"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, CalendarCheck,
  Users2, Building2, Workflow, ChevronRight, Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/owner/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/owner/calendar", icon: CalendarDays, label: "Schedule" },
  { href: "/owner/bookings", icon: CalendarCheck, label: "Bookings" },
  { href: "/owner/customers", icon: Users2, label: "Customers" },
  { href: "/owner/venues", icon: Building2, label: "My Venues" },
  { href: "/owner/expenses", icon: Receipt, label: "Expenses" },
  { href: "/owner/workflows", icon: Workflow, label: "Templates" },
];

export function OwnerSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3 gap-0.5">
      <div className="px-3 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          Convention Centre
        </span>
      </div>
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "mx-2 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
              active
                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active && "text-amber-600 dark:text-amber-400")} />
            <span className="flex-1">{label}</span>
            {active && <ChevronRight className="h-3 w-3 text-amber-400 shrink-0" />}
          </Link>
        );
      })}
    </aside>
  );
}

export function OwnerTopTabs() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto">
      <div className="flex min-w-max px-2">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap",
                active
                  ? "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
