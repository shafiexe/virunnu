"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FileText, Plus, Receipt, ShoppingCart, X } from "lucide-react";
import { canOpen } from "@/lib/caterer-access";
import { cn } from "@/lib/utils";

// Everything you create, one tap from any catering page.
const ENTRIES = [
  { href: "/caterer/orders/new", page: "orders", icon: ClipboardList, label: "New order", hint: "A confirmed function" },
  { href: "/caterer/quotes/new", page: "orders", icon: FileText, label: "New quotation", hint: "A price to send first" },
  { href: "/caterer/purchases/new", page: "purchases", icon: ShoppingCart, label: "Record purchase", hint: "Bought for the kitchen" },
  { href: "/caterer/expenses?add=1", page: "expenses", icon: Receipt, label: "Add expense", hint: "Gas, rent, transport…" },
];

// Pages that already end in a Save bar, where a floating button would sit on top of it
const hidesFab = (p: string) => /\/(new|edit|onboarding)(\/|$)/.test(p) || /\/invoice$/.test(p);

export type NewEntry = { href: string; icon: React.ComponentType<{ className?: string }>; label: string; hint: string };

export function CatererNewMenu({ variant, deny }: { variant: "sidebar" | "fab"; deny?: string[] }) {
  const entries = ENTRIES.filter((e) => canOpen(deny, e.href) && !deny?.includes(`ro.${e.page}`));
  return <NewMenu variant={variant} entries={entries} fabClass="bottom-[4.75rem]" />;
}

// The "+ New" button and its list; each side decides which entries a person may see.
export function NewMenu({ variant, entries, fabClass }: { variant: "sidebar" | "fab"; entries: NewEntry[]; fabClass: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- the list closes when the page changes
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (entries.length === 0 || (variant === "fab" && hidesFab(pathname))) return null;

  const list = (
    <div className={cn("rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-1.5", variant === "fab" ? "absolute bottom-16 right-0 w-64" : "absolute left-3 right-3 top-full mt-1.5 z-40")}>
      {entries.map(({ href, icon: Icon, label, hint }) => (
        <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/20">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"><Icon className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{label}</span><span className="block text-[11px] text-zinc-500 dark:text-zinc-400">{hint}</span></span>
        </Link>
      ))}
    </div>
  );

  if (variant === "sidebar") {
    return (
      <div ref={ref} className="relative px-3 mb-2">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-2.5 text-sm font-semibold text-zinc-900 transition-colors">
          <Plus className="h-4 w-4" /> New
        </button>
        {open && list}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("md:hidden fixed right-4 z-40", fabClass)} style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      {open && list}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close" : "New"} aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 text-zinc-900 shadow-lg shadow-amber-500/30 transition-transform active:scale-95">
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
