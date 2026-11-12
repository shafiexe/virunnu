import { WriteOnly } from "@/components/access-context";
import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { currentMonthValue, periodRange } from "@/lib/caterer-finance";
import { formatTime, rs, billMoney } from "@/lib/caterer-orders";
import { CatererMonthNav } from "@/components/caterer-month-nav";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CHIP = {
  CONFIRMED: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  CANCELLED: "bg-zinc-100 text-zinc-400 line-through dark:bg-zinc-800 dark:text-zinc-500",
} as const;

export default async function CatererCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; day?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const sp = await searchParams;

  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : currentMonthValue();
  const { from, to, label } = periodRange("month", month);
  const [y, m] = month.split("-").map(Number);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const day = sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) && sp.day.startsWith(month) ? sp.day : null;

  const orders = await db.catererOrder.findMany({
    where: { catererId: ctx.caterer.id, date: { gte: from, lte: to } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      customer: { select: { name: true, phone: true } },
      servings: { orderBy: { time: "asc" } },
      bills: { select: { subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true } },
    },
  });
  const byDay = new Map<string, typeof orders>();
  for (const o of orders) {
    const k = o.date.toISOString().slice(0, 10);
    byDay.set(k, [...(byDay.get(k) ?? []), o]);
  }

  // Monday-first grid
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);

  const dayOrders = day ? byDay.get(day) ?? [] : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Calendar</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{orders.filter((o) => o.status !== "CANCELLED").length} function{orders.filter((o) => o.status !== "CANCELLED").length === 1 ? "" : "s"} in {label}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CatererMonthNav basePath="/caterer/calendar" value={month} label={label} />
          <WriteOnly page="orders"><Link href={`/caterer/orders/new${day ? `?date=${day}` : ""}`} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> New order</Link></WriteOnly>
        </div>
      </div>

      {!day && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Select a date</span> to see its orders or add a new one.
        </div>
      )}

      {day && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 flex-wrap">
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{new Date(day + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</h2>
              <p className="text-xs text-zinc-400">{dayOrders.length} order{dayOrders.length === 1 ? "" : "s"}</p>
            </div>
            <WriteOnly page="orders"><Link href={`/caterer/orders/new?date=${day}`} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5" /> New order</Link></WriteOnly>
          </div>
          {dayOrders.length === 0 ? <p className="p-6 text-center text-sm text-zinc-400">Nothing booked on this day.</p> : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {dayOrders.map((o) => {
                const balance = o.bills.reduce((s, b) => s + billMoney(b).balancePaise, 0);
                return (
                  <li key={o.id}>
                    <Link href={`/caterer/orders/${o.id}`} className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">{o.customer.name}</span>
                        <span className="block text-xs text-zinc-500">{o.eventType ?? "Function"}{o.place ? ` · ${o.place}` : ""}</span>
                        <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-zinc-600 dark:text-zinc-400">
                          {o.servings.length === 0 ? <span className="text-zinc-400">No serve time set</span> : o.servings.map((s) => <span key={s.id}>{s.label} {formatTime(s.time)}{s.guests ? ` · ${s.guests}` : ""}</span>)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-xs">
                        <span className={cn("rounded-full px-2 py-0.5 font-medium", CHIP[o.status])}>{o.status === "CONFIRMED" ? "Upcoming" : o.status === "COMPLETED" ? "Completed" : "Cancelled"}</span>
                        {o.status !== "CANCELLED" && o.bills.length > 0 && <span className={cn("mt-1 block font-semibold", balance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600")}>{balance > 0 ? `Due ${rs(balance)}` : "Closed"}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800">
          {WEEKDAYS.map((d) => <div key={d} className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-400">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="min-h-20 sm:min-h-28 border-b border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30" />;
            const list = byDay.get(date) ?? [];
            const isToday = date === today;
            const isSel = date === day;
            return (
              <div key={date} className={cn("relative min-h-20 sm:min-h-28 border-b border-r border-zinc-100 dark:border-zinc-800 p-1 sm:p-1.5 space-y-1 transition-colors hover:bg-amber-50/60 dark:hover:bg-amber-950/10", isSel && "bg-amber-50/70 dark:bg-amber-950/10 ring-1 ring-inset ring-amber-400")}>
                {/* the whole box selects the date; chips and links sit above it */}
                <Link href={`/caterer/calendar?month=${month}&day=${date}`} scroll={false} aria-label={`Select ${date}`} className="absolute inset-0 z-0" />
                <span className={cn("pointer-events-none relative z-10 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium", isToday ? "bg-amber-500 text-white" : "text-zinc-600 dark:text-zinc-400")}>
                  {Number(date.slice(8))}
                </span>
                {list.slice(0, 3).map((o) => (
                  <Link key={o.id} href={`/caterer/orders/${o.id}`} title={`${o.customer.name}${o.place ? " · " + o.place : ""}`} className={cn("relative z-10 block truncate rounded px-1 py-0.5 text-[10px] sm:text-[11px] font-medium", CHIP[o.status])}>
                    {o.servings[0] ? `${formatTime(o.servings[0].time)} ` : ""}{o.customer.name}
                  </Link>
                ))}
                {list.length > 3 && <Link href={`/caterer/calendar?month=${month}&day=${date}`} className="relative z-10 block text-[10px] text-zinc-500 hover:text-amber-600">+{list.length - 3} more</Link>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-300" /> Upcoming</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-300" /> Completed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-zinc-300" /> Cancelled</span>
      </div>

    </div>
  );
}
