"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, CalendarCheck,
  Users2, Inbox, Settings, ChevronRight, Receipt, BarChart3,
} from "lucide-react";
import { CatererQuickFind } from "@/components/caterer-quick-find";
import { OwnerNewMenu } from "@/components/owner-new-menu";
import { canOpenOwner } from "@/lib/owner-access";
import { cn } from "@/lib/utils";

// Settings gathers the set-up pages that are not daily work; each keeps its own address
export const SETTINGS_TABS = [
  { href: "/owner/venues", label: "Venue", also: ["/owner/facilities"], mainOwnerOnly: false },
  { href: "/owner/workflows", label: "Templates", also: [], mainOwnerOnly: false },
  { href: "/owner/team", label: "Team logins", also: [], mainOwnerOnly: true },
  { href: "/owner/activity", label: "Activity", also: [], mainOwnerOnly: true },
];

export const settingsTabsFor = (deny: readonly string[] | undefined, mainOwner: boolean) =>
  SETTINGS_TABS.filter((t) => (mainOwner || !t.mainOwnerOnly) && canOpenOwner(deny, t.href));

export const inSettings = (pathname: string) => SETTINGS_TABS.some((t) => [t.href, ...t.also].some((h) => pathname === h || pathname.startsWith(h + "/")));

type NavItem = { href: string; icon: typeof Settings; label: string; settings?: boolean };
const NAV: NavItem[] = [
  { href: "/owner/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/owner/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/owner/enquiries", icon: Inbox, label: "Enquiries" },
  { href: "/owner/bookings", icon: CalendarCheck, label: "Bookings" },
  { href: "/owner/customers", icon: Users2, label: "Customers" },
  { href: "/owner/expenses", icon: Receipt, label: "Expenses" },
  { href: "/owner/reports", icon: BarChart3, label: "Reports" },
];

// What this person sees: items hidden from them are left out; Settings opens on the first set-up page they may use
const navFor = (deny: readonly string[] | undefined, mainOwner: boolean): NavItem[] => {
  const first = settingsTabsFor(deny, mainOwner)[0];
  return [...NAV.filter((i) => canOpenOwner(deny, i.href)), ...(first ? [{ href: first.href, icon: Settings, label: "Settings", settings: true }] : [])];
};

const isActive = (pathname: string, item: NavItem) => (item.settings ? inSettings(pathname) : pathname === item.href || pathname.startsWith(item.href + "/"));

export function OwnerSidebar({ logoUrl, name, deny, mainOwner = true, waiting = 0 }: { logoUrl?: string | null; name?: string; deny?: string[]; mainOwner?: boolean; waiting?: number }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3 gap-0.5">
      <div className="px-4 mb-2 flex items-center gap-2.5">
        {logoUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white object-contain p-0.5" />
          : null}
        <span className="min-w-0">
          {name && <span className="block truncate text-sm font-bold text-zinc-900 dark:text-zinc-50">{name}</span>}
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Convention Centre</span>
        </span>
      </div>
      <CatererQuickFind variant="sidebar" endpoint="/api/owner/find" placeholder="Customer name or phone…" hint={<>Type a customer&apos;s name or phone number to jump to them and their bookings.</>} />
      <OwnerNewMenu variant="sidebar" deny={deny} />
      {navFor(deny, mainOwner).map((item) => {
        const { href, icon: Icon, label } = item;
        const active = isActive(pathname, item);
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
            {href === "/owner/enquiries" && waiting > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{waiting}</span>}
            {active && <ChevronRight className="h-3 w-3 text-amber-400 shrink-0" />}
          </Link>
        );
      })}
    </aside>
  );
}

export function OwnerTopTabs({ deny, mainOwner = true, waiting = 0 }: { deny?: string[]; mainOwner?: boolean; waiting?: number }) {
  const pathname = usePathname();
  // keep the current tab in view when the row is wider than the phone
  useEffect(() => { document.querySelector("[data-owner-tab-active]")?.scrollIntoView({ inline: "center", block: "nearest" }); }, [pathname]);
  return (
    <nav className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto">
      <div className="flex min-w-max px-2">
        <CatererQuickFind variant="icon" endpoint="/api/owner/find" placeholder="Customer name or phone…" hint={<>Type a customer&apos;s name or phone number to jump to them and their bookings.</>} />
        {navFor(deny, mainOwner).map((item) => {
          const { href, icon: Icon, label } = item;
          const active = isActive(pathname, item);
          return (
            <Link
              key={href}
              href={href}
              data-owner-tab-active={active ? "" : undefined}
              className={cn(
                "flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap",
                active
                  ? "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {href === "/owner/enquiries" && waiting > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{waiting}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// The row of set-up pages, shown on top of each of them
export function OwnerSettingsTabs({ deny, mainOwner = true }: { deny?: string[]; mainOwner?: boolean }) {
  const pathname = usePathname();
  if (!inSettings(pathname)) return null;
  const tabs = settingsTabsFor(deny, mainOwner);
  if (tabs.length < 2) return null;
  return (
    <nav aria-label="Settings" className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 overflow-x-auto">
      <div className="mx-auto flex min-w-max max-w-6xl gap-1.5 px-4 py-2.5">
        {tabs.map((t) => {
          const active = [t.href, ...t.also].some((h) => pathname === h || pathname.startsWith(h + "/"));
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
              className={cn("whitespace-nowrap rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors", active ? "bg-amber-500 text-white" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800")}>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
