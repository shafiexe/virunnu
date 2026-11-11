"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FileText, Plus, Receipt, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Everything you create, one tap from any catering page.
const ENTRIES = [
  { href: "/caterer/orders/new", icon: ClipboardList, label: "New order", hint: "A confirmed function" },
  { href: "/caterer/quotes/new", icon: FileText, label: "New quotation", hint: "A price to send first" },
  { href: "/caterer/purchases/new", icon: ShoppingCart, label: "Record purchase", hint: "Bought for the kitchen" },
  { href: "/caterer/expenses?add=1", icon: Receipt, label: "Add expense", hint: "Gas, rent, transport…" },
];

// Pages that already end in a Save bar, where a floating button would sit on top of it
const hidesFab = (p: string) => /\/(new|edit|onboarding)(\/|$)/.test(p) || /\/invoice$/.test(p);

export function CatererNewMenu({ variant }: { variant: "sidebar" | "fab" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (variant === "fab" && hidesFab(pathname)) return null;

  const list = (
    <div className={cn("rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-1.5", variant === "fab" ? "absolute bottom-16 right-0 w-64" : "absolute left-3 right-3 top-full mt-1.5 z-40")}>
      {ENTRIES.map(({ href, icon: Icon, label, hint }) => (
        <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/20">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"><Icon className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{label}</span><span className="block text-[11px] text-zinc-400">{hint}</span></span>
        </Link>
      ))}
    </div>
  );

  if (variant === "sidebar") {
    return (
      <div ref={ref} className="relative px-3 mb-2">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors">
          <Plus className="h-4 w-4" /> New
        </button>
        {open && list}
      </div>
    );
  }

  return (
    <div ref={ref} className="md:hidden fixed right-4 bottom-[4.75rem] z-40" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      {open && list}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close" : "New"} aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 transition-transform active:scale-95">
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
