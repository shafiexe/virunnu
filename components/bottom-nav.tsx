"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, Shield, CalendarDays, Users2, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Session = { role: string } | null;

export function BottomNav() {
  const [session, setSession] = useState<Session | undefined>(undefined);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSession)
      .catch(() => setSession(null));
  }, []);

  if (session === undefined) return null;

  const role = session?.role;

  // Guests, customers and admins use the top header — no bottom nav needed.
  if (!role || role === "CUSTOMER" || role === "ADMIN") return null;

  const links =
    role === "OWNER"
      ? [
          { href: "/owner/dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { href: "/owner/calendar", icon: CalendarDays, label: "Schedule" },
          { href: "/owner/bookings", icon: CalendarCheck, label: "Bookings" },
          { href: "/owner/customers", icon: Users2, label: "Customers" },
        ]
      : role === "CATERER"
      ? [
          { href: "/caterer/dashboard", icon: UtensilsCrossed, label: "Dashboard" },
        ]
      : role === "ADMIN"
      ? [
          { href: "/admin", icon: Shield, label: "Admin" },
        ]
      : [];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-zinc-100 dark:border-zinc-800 bg-white/98 dark:bg-zinc-900/98 backdrop-blur-md md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-stretch h-16">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
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
              </div>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
