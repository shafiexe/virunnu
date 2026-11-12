import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// What to show where a list would be: what goes here, and the next thing to do about it.
export function EmptyState({ icon: Icon, title, hint, actions = [], className, inTable }: {
  icon: LucideIcon; title: string; hint?: string; actions?: { href: string; label: string; primary?: boolean }[]; className?: string;
  // inside a table that is wider than a phone: stay within the visible width instead of centring on the whole table
  inTable?: boolean;
}) {
  return (
    <div className={cn("px-6 py-12 text-center", inTable && "sticky left-0 w-[calc(100vw-3.5rem)] md:w-auto", className)}>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"><Icon className="h-6 w-6" /></span>
      <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">{hint}</p>}
      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actions.map((a) => (
            <Link key={a.href + a.label} href={a.href} className={cn("inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors", a.primary === false ? "border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800" : "bg-amber-500 hover:bg-amber-600 text-zinc-900")}>{a.label}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
