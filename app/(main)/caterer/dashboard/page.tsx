import { WriteOnly } from "@/components/access-context";
import { ShowS as Show } from "@/components/show-server";
import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock, Phone, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getCatererForSession } from "@/lib/caterer-session";
import { balanceSheet, billedInRange, currentMonthValue, expensesInRange, paymentsInRange, periodRange, yearByMonth } from "@/lib/caterer-finance";
import { formatTime, rs } from "@/lib/caterer-orders";
import { CatererBars } from "@/components/caterer-bars";
import { SetupChecklist } from "@/components/setup-checklist";
import { catererSetupSteps } from "@/lib/setup-steps";
import { CatererMonthNav } from "@/components/caterer-month-nav";
import { cn } from "@/lib/utils";

function Kpi({ label, value, hint, tone = "plain", href }: { label: string; value: string; hint?: string; tone?: "plain" | "good" | "bad" | "warn"; href?: string }) {
  const tones = {
    plain: "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900",
    good: "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20",
    bad: "border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20",
    warn: "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20",
  };
  const body = (
    <>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</div>}
    </>
  );
  // A card with a link opens the page behind the number, already filtered
  return href ? (
    <Link href={href} className={cn("block rounded-2xl border p-4 transition-shadow hover:shadow-md hover:-translate-y-0.5 transition-transform", tones[tone])}>{body}</Link>
  ) : (
    <div className={cn("rounded-2xl border p-4", tones[tone])}>{body}</div>
  );
}

export default async function CatererDashboard({ searchParams }: { searchParams: Promise<{ tab?: string; month?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "CATERER") redirect("/login");
  const sp = await searchParams;
  if (sp.tab === "enquiries") redirect("/caterer/enquiries");
  if (sp.tab === "service") redirect("/caterer/profile");

  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const { caterer } = ctx;
  const orgId = caterer.orgId!;

  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : currentMonthValue();
  const { from, to, label } = periodRange("month", month);
  const year = parseInt(month.slice(0, 4));
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00.000Z");
  const weekEnd = new Date(today.getTime() + 7 * 86400000);
  // only the main owner sets the business up
  const setupSteps = session.tm ? [] : await catererSetupSteps(caterer);

  const [billed, payments, expenses, sheet, chart, orderCounts, upcoming] = await Promise.all([
    billedInRange(caterer.id, from, to),
    paymentsInRange(caterer.id, from, to),
    expensesInRange(orgId, from, to, caterer.id),
    balanceSheet(caterer.id, orgId),
    yearByMonth(caterer.id, orgId, year),
    db.catererOrder.groupBy({ by: ["status"], where: { catererId: caterer.id, date: { gte: from, lte: to } }, _count: true }),
    db.catererOrder.findMany({
      where: { catererId: caterer.id, status: "CONFIRMED", date: { gte: today, lte: weekEnd } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: { customer: { select: { name: true, phone: true } }, servings: { orderBy: { time: "asc" } } },
      take: 12,
    }),
  ]);

  const receivedMonth = payments.reduce((s, p) => s + p.amountPaise, 0);
  const count = (s: string) => orderCounts.find((c) => c.status === s)?._count ?? 0;
  const profit = billed.total - expenses.total;
  const cashProfit = receivedMonth - expenses.paidTotal;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {setupSteps.length > 0 && <SetupChecklist steps={setupSteps} storageKey={`virunnu.setup.caterer.${caterer.id}`} />}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{caterer.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CatererMonthNav basePath="/caterer/dashboard" value={month} label={label} />
          <WriteOnly page="orders"><Link href="/caterer/orders/new" className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> New order</Link></WriteOnly>
        </div>
      </div>

      {!caterer.approved && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-800 dark:text-amber-300 font-medium">
          Your public profile is under review. Our team will approve it within 24–48 hours. Your orders and accounts work as usual in the meantime.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi href="/caterer/orders" label="Orders" value={String(count("CONFIRMED") + count("COMPLETED") + count("CANCELLED"))} hint={`${count("CONFIRMED")} upcoming · ${count("COMPLETED")} completed${count("CANCELLED") ? ` · ${count("CANCELLED")} cancelled` : ""}`} />
        <Kpi href="/caterer/orders" label="Billed" value={rs(billed.total)} hint={`Food ${rs(billed.food)} · Service ${rs(billed.service)}`} />
        <Kpi href={`/caterer/daybook?kind=RECEIPT&month=${month}`} label="Received" value={rs(receivedMonth)} hint={`${payments.length} payment${payments.length === 1 ? "" : "s"} this month`} tone="good" />
        <Kpi href={`/caterer/expenses?year=${month.slice(0, 4)}&month=${Number(month.slice(5))}`} label="Expenses" value={rs(expenses.total)} hint={expenses.byCategory[0] ? `Most on ${expenses.byCategory[0].category}` : "Nothing recorded"} />
        <Show what="profit"><Kpi href={`/caterer/reports?tab=pl&month=${month}`} label="Profit" value={rs(profit)} hint={`Billed − expenses · cash in hand ${rs(cashProfit)}`} tone={profit < 0 ? "bad" : "plain"} /></Show>
        <Kpi href="/caterer/orders?status=DUES" label="Balance due" value={rs(sheet.receivables)} hint={`${sheet.dues.length} customer${sheet.dues.length === 1 ? "" : "s"} owe you`} tone={sheet.receivables > 0 ? "warn" : "plain"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Next 7 days</h2>
            <Link href="/caterer/calendar" className="text-xs font-semibold text-amber-600 hover:underline inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Calendar</Link>
          </div>
          {upcoming.length === 0 ? <p className="text-sm text-zinc-400">No functions in the next 7 days.</p> : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {upcoming.map((o) => (
                <li key={o.id}>
                  <Link href={`/caterer/orders/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 -mx-2 px-2 rounded-lg">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{o.customer.name}</span>
                      <span className="block text-xs text-zinc-500 truncate">{o.place ?? o.eventType ?? "Function"}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-sm text-zinc-700 dark:text-zinc-300">{o.date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</span>
                      {o.servings[0] && <span className="inline-flex items-center gap-1 text-xs text-zinc-500"><Clock className="h-3 w-3" />{formatTime(o.servings[0].time)}{o.servings.length > 1 ? ` +${o.servings.length - 1}` : ""}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Who owes you</h2>
            <Link href="/caterer/customers?due=1" className="text-xs font-semibold text-amber-600 hover:underline">All</Link>
          </div>
          {sheet.dues.length === 0 ? <p className="text-sm text-zinc-400">Nobody owes you anything right now.</p> : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sheet.dues.slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/caterer/customers/${c.id}`} className="min-w-0 hover:text-amber-600">
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{c.name}</span>
                    <span className="block text-xs text-zinc-500">{c.invoices} open invoice{c.invoices === 1 ? "" : "s"}</span>
                  </Link>
                  <span className="flex items-center gap-3 shrink-0">
                    <a href={`tel:${c.phone}`} aria-label={`Call ${c.name}`} className="text-zinc-400 hover:text-amber-600"><Phone className="h-4 w-4" /></a>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">{rs(c.balancePaise)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Billed vs expenses · {year}</h2>
        <CatererBars data={chart} />
      </section>
    </div>
  );
}
