"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, ClipboardList, Users2, Package, Receipt,
  UtensilsCrossed, ChevronRight, Wallet, BarChart3, BookOpen, ShoppingCart, Truck, Settings,
} from "lucide-react";
import { canOpen } from "@/lib/caterer-access";
import { AccessProvider } from "@/components/access-context";
import { CatererNewMenu } from "@/components/caterer-new-menu";
import { CatererQuickFind } from "@/components/caterer-quick-find";
import { ToastProvider } from "@/components/undo-toast";
import { setActiveBusiness, setActiveTemplates, type Templates } from "@/lib/caterer-templates";
import { cn } from "@/lib/utils";

// Grouped by what you are doing: run the day, follow the money, keep the lists. `also` lists pages that live under an item as tabs.
export const CATERER_NAV_GROUPS = [
  {
    title: "Work",
    items: [
      { href: "/caterer/dashboard", icon: LayoutDashboard, label: "Dashboard", also: [] as string[] },
      { href: "/caterer/calendar", icon: CalendarDays, label: "Calendar", also: [] as string[] },
      { href: "/caterer/orders", icon: ClipboardList, label: "Orders", also: ["/caterer/enquiries", "/caterer/quotes"] },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/caterer/daybook", icon: BookOpen, label: "Day Book", also: ["/caterer/payments"] },
      { href: "/caterer/purchases", icon: ShoppingCart, label: "Purchases", also: [] as string[] },
      { href: "/caterer/expenses", icon: Receipt, label: "Expenses", also: [] as string[] },
      { href: "/caterer/reports", icon: BarChart3, label: "Reports", also: [] as string[] },
    ],
  },
  {
    title: "Lists",
    items: [
      { href: "/caterer/customers", icon: Users2, label: "Parties", also: ["/caterer/followup", "/caterer/suppliers", "/caterer/staff"] },
      { href: "/caterer/items", icon: Package, label: "Menu & Prices", also: [] as string[] },
    ],
  },
];

// Settings gathers the set-up pages that are not daily work; each keeps its own address and its own permission
export const SETTINGS_TABS = [
  { href: "/caterer/profile", label: "Profile", mainOwnerOnly: false },
  { href: "/caterer/messages", label: "Messages", mainOwnerOnly: false },
  { href: "/caterer/team", label: "Team logins", mainOwnerOnly: true },
  { href: "/caterer/activity", label: "Activity", mainOwnerOnly: true },
];

export const settingsTabsFor = (deny: readonly string[] | undefined, mainOwner: boolean) =>
  SETTINGS_TABS.filter((t) => (mainOwner || !t.mainOwnerOnly) && canOpen(deny, t.href));

export const inSettings = (pathname: string) => SETTINGS_TABS.some((t) => pathname === t.href || pathname.startsWith(t.href + "/"));

type NavItem = { href: string; icon: typeof Settings; label: string; also: string[]; settings?: boolean };

// What this person sees in the menu: items hidden from them are left out. Settings opens on the first set-up page they may use.
export function navFor(deny: readonly string[] | undefined, mainOwner: boolean): { title: string; items: NavItem[] }[] {
  const groups = CATERER_NAV_GROUPS.map((g) => ({
    title: g.title,
    items: (g.items as NavItem[]).map((i) => ({ ...i, href: [i.href, ...i.also].find((h) => canOpen(deny, h)) ?? "" })).filter((i) => i.href),
  }));
  const first = settingsTabsFor(deny, mainOwner)[0];
  return [...groups, ...(first ? [{ title: "Setup", items: [{ href: first.href, icon: Settings, label: "Settings", also: [], settings: true }] }] : [])].filter((g) => g.items.length > 0);
}

export const CATERER_NAV = CATERER_NAV_GROUPS.flatMap((g) => g.items);

const isActive = (pathname: string, href: string, also: string[] = [], settings = false) =>
  settings ? inSettings(pathname) : [href, ...also].some((h) => pathname === h || pathname.startsWith(h + "/"));

export function CatererSidebar({ pendingEnquiries = 0, logoUrl, name, deny, mainOwner = true }: { pendingEnquiries?: number; logoUrl?: string | null; name?: string; deny?: string[]; mainOwner?: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3 gap-0.5 overflow-y-auto">
      <div className="px-4 mb-3 flex items-center gap-2.5">
        {logoUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white object-contain p-0.5" />
          : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"><UtensilsCrossed className="h-4 w-4" /></span>}
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-zinc-900 dark:text-zinc-50">{name || "Catering Books"}</span>
          <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">Catering Books</span>
        </span>
      </div>
      <CatererQuickFind variant="sidebar" />
      <CatererNewMenu variant="sidebar" deny={deny} />
      {navFor(deny, mainOwner).map((group) => (
        <div key={group.title} className="pb-1.5">
          <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{group.title}</div>
          {group.items.map(({ href, icon: Icon, label, also, settings }) => {
            const active = isActive(pathname, href, also, settings);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "mx-2 flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-amber-700 dark:text-amber-400")} />
                <span className="flex-1">{label}</span>
                {href === "/caterer/orders" && pendingEnquiries > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-zinc-900">{pendingEnquiries}</span>
                )}
                {active && <ChevronRight className="h-3 w-3 text-amber-400 shrink-0" />}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

export function CatererTopTabs({ pendingEnquiries = 0, deny, mainOwner = true }: { pendingEnquiries?: number; deny?: string[]; mainOwner?: boolean }) {
  const pathname = usePathname();
  // keep the current tab in view when the row is wider than the phone
  useEffect(() => { document.querySelector("[data-caterer-tab-active]")?.scrollIntoView({ inline: "center", block: "nearest" }); }, [pathname]);
  return (
    <nav className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto">
      <div className="flex min-w-max px-2">
        <CatererQuickFind variant="icon" />
        {navFor(deny, mainOwner).flatMap((g) => g.items).map(({ href, icon: Icon, label, also, settings }) => {
          const active = isActive(pathname, href, also, settings);
          return (
            <Link
              key={href}
              href={href}
              data-caterer-tab-active={active ? "" : undefined}
              className={cn(
                "flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap",
                active
                  ? "border-amber-500 text-amber-700 dark:text-amber-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {href === "/caterer/orders" && pendingEnquiries > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-zinc-900">{pendingEnquiries}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Hides the menu on the first-time setup page, where there is nothing to navigate to yet.
export function CatererShell({ children, pendingEnquiries, logoUrl, name, upiId, templates, deny, mainOwner = true }: { children: React.ReactNode; pendingEnquiries: number; logoUrl?: string | null; name?: string; upiId?: string | null; templates?: Partial<Templates>; deny?: string[]; mainOwner?: boolean }) {
  const pathname = usePathname();
  // the buttons that open WhatsApp build their message from these
  useEffect(() => { setActiveTemplates(templates ?? {}); setActiveBusiness({ name: name ?? "", upiId: upiId ?? null }); }, [templates, name, upiId]);
  if (pathname.startsWith("/caterer/onboarding")) return <>{children}</>;
  return (
    <ToastProvider>
      <AccessProvider deny={deny}>
      <div className="caterer-app flex min-h-[calc(100vh-56px)]">
        <CatererSidebar pendingEnquiries={pendingEnquiries} logoUrl={logoUrl} name={name} deny={deny} mainOwner={mainOwner} />
        <div className="flex-1 flex flex-col min-w-0">
          <CatererTopTabs pendingEnquiries={pendingEnquiries} deny={deny} mainOwner={mainOwner} />
          <CatererSettingsTabs deny={deny} mainOwner={mainOwner} />
          <div className="flex-1">{children}</div>
        </div>
      </div>
      <CatererNewMenu variant="fab" deny={deny} />
      </AccessProvider>
    </ToastProvider>
  );
}

// The row of set-up pages, shown on top of each of them
export function CatererSettingsTabs({ deny, mainOwner = true }: { deny?: string[]; mainOwner?: boolean }) {
  const pathname = usePathname();
  if (!inSettings(pathname)) return null;
  const tabs = settingsTabsFor(deny, mainOwner);
  if (tabs.length < 2) return null;
  return (
    <nav aria-label="Settings" className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 overflow-x-auto">
      <div className="mx-auto flex min-w-max max-w-6xl gap-1.5 px-4 py-2.5">
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
              className={cn("whitespace-nowrap rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors", active ? "bg-amber-500 text-zinc-900" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800")}>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
