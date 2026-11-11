"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, ClipboardList, Users2, Package, Receipt,
  UtensilsCrossed, ChevronRight, Wallet, BarChart3, BookOpen, ShoppingCart, Truck, ShieldCheck, MessageSquare,
} from "lucide-react";
import { canOpen } from "@/lib/caterer-access";
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
      { href: "/caterer/profile", icon: UtensilsCrossed, label: "Service Profile", also: [] as string[] },
      { href: "/caterer/messages", icon: MessageSquare, label: "Messages", also: [] as string[] },
    ],
  },
];

// What this person sees in the menu: items hidden from them are left out, and only the main owner gets Team logins
export function navFor(deny: readonly string[] | undefined, mainOwner: boolean) {
  return CATERER_NAV_GROUPS.map((g) => ({
    ...g,
    items: [...g.items, ...(g.title === "Lists" && mainOwner ? [{ href: "/caterer/team", icon: ShieldCheck, label: "Team logins", also: [] as string[] }] : [])]
      .map((i) => ({ ...i, href: [i.href, ...i.also].find((h) => canOpen(deny, h)) ?? "" }))
      .filter((i) => i.href),
  })).filter((g) => g.items.length > 0);
}

export const CATERER_NAV = CATERER_NAV_GROUPS.flatMap((g) => g.items);

const isActive = (pathname: string, href: string, also: string[] = []) =>
  [href, ...also].some((h) => pathname === h || pathname.startsWith(h + "/"));

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
          <span className="block text-[10px] text-zinc-400">Catering Books</span>
        </span>
      </div>
      <CatererQuickFind variant="sidebar" />
      <CatererNewMenu variant="sidebar" deny={deny} />
      {navFor(deny, mainOwner).map((group) => (
        <div key={group.title} className="pb-1.5">
          <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{group.title}</div>
          {group.items.map(({ href, icon: Icon, label, also }) => {
            const active = isActive(pathname, href, also);
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
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-amber-600 dark:text-amber-400")} />
                <span className="flex-1">{label}</span>
                {href === "/caterer/orders" && pendingEnquiries > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">{pendingEnquiries}</span>
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
  return (
    <nav className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto">
      <div className="flex min-w-max px-2">
        <CatererQuickFind variant="icon" />
        {navFor(deny, mainOwner).flatMap((g) => g.items).map(({ href, icon: Icon, label, also }) => {
          const active = isActive(pathname, href, also);
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
              {href === "/caterer/orders" && pendingEnquiries > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">{pendingEnquiries}</span>
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
      <div className="caterer-app flex min-h-[calc(100vh-56px)]">
        <CatererSidebar pendingEnquiries={pendingEnquiries} logoUrl={logoUrl} name={name} deny={deny} mainOwner={mainOwner} />
        <div className="flex-1 flex flex-col min-w-0">
          <CatererTopTabs pendingEnquiries={pendingEnquiries} deny={deny} mainOwner={mainOwner} />
          <div className="flex-1">{children}</div>
        </div>
      </div>
      <CatererNewMenu variant="fab" deny={deny} />
    </ToastProvider>
  );
}
