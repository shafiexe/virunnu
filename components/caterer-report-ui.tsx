import { cn } from "@/lib/utils";

export function Row({ label, value, strong, tone, sub }: { label: string; value: string; strong?: boolean; tone?: "good" | "bad"; sub?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2 text-sm", strong && "font-bold text-base border-t border-zinc-200 dark:border-zinc-700 mt-1 pt-3")}>
      <span className="text-zinc-600 dark:text-zinc-400">{label}{sub && <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">{sub}</span>}</span>
      <span className={cn("shrink-0 text-zinc-900 dark:text-zinc-50", tone === "good" && "text-emerald-600 dark:text-emerald-400", tone === "bad" && "text-red-600 dark:text-red-400")}>{value}</span>
    </div>
  );
}

export function Panel({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">{title}</h2>
      {hint && <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-1 mb-2">{hint}</p>}
      {children}
    </section>
  );
}

export function Bar({ pct, tone = "amber" }: { pct: number; tone?: "amber" | "emerald" | "sky" | "rose" | "violet" }) {
  const c = { amber: "bg-amber-400", emerald: "bg-emerald-400", sky: "bg-sky-400", rose: "bg-rose-400", violet: "bg-violet-400" }[tone];
  return <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden"><div className={cn("h-full rounded-full", c)} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} /></div>;
}

// A headline number, optionally with how it moved against the previous period.
export function Stat({ label, value, sub, delta, goodWhenUp = true, tone }: { label: string; value: string; sub?: string; delta?: number | null; goodWhenUp?: boolean; tone?: "good" | "bad" | "warn" }) {
  const toneCls = { good: "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20", bad: "border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20", warn: "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20" };
  const up = (delta ?? 0) >= 0;
  const good = delta === null || delta === undefined ? null : up === goodWhenUp;
  return (
    <div className={cn("rounded-2xl border p-4", tone ? toneCls[tone] : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900")}>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">{value}</div>
      <div className="mt-0.5 flex items-center gap-2 text-xs">
        {delta !== null && delta !== undefined && (
          <span className={cn("rounded-full px-1.5 py-0.5 font-semibold", good ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400")}>{up ? "▲" : "▼"} {Math.abs(delta)}%</span>
        )}
        {sub && <span className="text-zinc-500 dark:text-zinc-400">{sub}</span>}
      </div>
    </div>
  );
}
