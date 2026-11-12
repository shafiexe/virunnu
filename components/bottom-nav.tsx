"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, Shield, CalendarDays, Users2, CalendarCheck, Inbox, Settings } from "lucide-react";
import { inSettings, settingsTabsFor } from "@/components/owner-sidebar";
import { inSettings as catererInSettings, settingsTabsFor as catererSettingsTabsFor } from "@/components/caterer-sidebar";
import { canOpen } from "@/lib/caterer-access";
import { canOpenOwner } from "@/lib/owner-access";
import { cn } from "@/lib/utils";

type Session = { role: string; deny?: string[] } | null;

export function BottomNav() {
  const [session, setSession] = useState<Session | undefined>(undefined);
  const pathname = usePathname();
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSession)
      .catch(() => setSession(null));
  }, []);

  // the count on Enquiries is refreshed on every page change, so approving a request clears it
  const isOwner = session?.role === "OWNER";
  useEffect(() => {
    if (!isOwner) return;
    fetch("/api/owner/waiting").then((r) => r.json()).then((d) => setWaiting(d.count ?? 0)).catch(() => {});
  }, [isOwner, pathname]);

  if (session === undefined) return null;

  const role = session?.role;

  // Guests, customers and admins use the top header — no bottom nav needed.
  if (!role || role === "CUSTOMER" || role === "ADMIN") return null;

  const links: { href: string; icon: typeof Users2; label: string; settings?: boolean }[] =
    role === "OWNER"
      ? [
          { href: "/owner/dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { href: "/owner/calendar", icon: CalendarDays, label: "Calendar" },
          { href: "/owner/enquiries", icon: Inbox, label: "Enquiries" },
          { href: "/owner/bookings", icon: CalendarCheck, label: "Bookings" },
          // Settings opens on the first set-up page this person may use
          { href: settingsTabsFor(session?.deny, !(session as { tm?: boolean } | null)?.tm)[0]?.href ?? "/owner/venues", icon: Settings, label: "Settings", settings: true },
        ]
      : role === "CATERER"
      ? [
          { href: "/caterer/dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { href: "/caterer/calendar", icon: CalendarDays, label: "Calendar" },
          { href: "/caterer/orders", icon: UtensilsCrossed, label: "Orders" },
          { href: "/caterer/customers", icon: Users2, label: "Parties" },
          // Settings opens on the first set-up page this person may use
          { href: catererSettingsTabsFor(session?.deny, !(session as { tm?: boolean } | null)?.tm)[0]?.href ?? "/caterer/profile", icon: Settings, label: "Settings", settings: true },
        ]
      : role === "ADMIN"
      ? [
          { href: "/admin", icon: Shield, label: "Admin" },
        ]
      : [];
  const shown = links.filter((l) => (role === "CATERER" ? (l.settings ? catererSettingsTabsFor(session?.deny, !(session as { tm?: boolean } | null)?.tm).length > 0 : canOpen(session?.deny, l.href)) : role === "OWNER" ? (l.settings ? settingsTabsFor(session?.deny, !(session as { tm?: boolean } | null)?.tm).length > 0 : canOpenOwner(session?.deny, l.href)) : true));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-zinc-100 dark:border-zinc-800 bg-white/98 dark:bg-zinc-900/98 backdrop-blur-md md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-stretch h-16">
        {shown.map(({ href, icon: Icon, label, settings }) => {
          const active = settings ? (role === "CATERER" ? catererInSettings(pathname) : inSettings(pathname)) : pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all relative",
                active
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-amber-500" />
              )}
              <div className={cn(
                "flex items-center justify-center w-10 h-7 rounded-xl transition-all",
                active ? "bg-amber-50 dark:bg-amber-950/40" : ""
              )}>
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
                {href === "/owner/enquiries" && waiting > 0 && <span className="absolute top-1.5 left-1/2 ml-2 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[9px] font-bold leading-4 text-white">{waiting}</span>}
              </div>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
