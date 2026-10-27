import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { TrendingUp, CalendarCheck, Clock, Hash, CalendarDays } from "lucide-react";
import { AnalyticsCharts } from "@/components/analytics-charts";
import { PendingRequests } from "@/components/pending-requests";

type Props = { searchParams: Promise<Record<string, string>> };

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function OwnerDashboard({ searchParams }: Props) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");

  const venueCount = await db.venue.count({ where: { orgId: session.orgId! } });
  if (venueCount === 0) redirect("/owner/onboarding");

  const sp = await searchParams;
  const now = new Date();
  const currentYear = now.getFullYear();
  const year = parseInt(sp.year ?? String(currentYear)) || currentYear;
  // For current year: cap chart/table at current month so "future" months aren't shown as empty
  // For past/future years: show all 12 months
  const nowMonth = year === currentYear ? now.getMonth() : 11;

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [allYearBookings, earliest, latestSlot, monthExpenses, yearExpenses, pendingBookings] = await Promise.all([
    db.booking.findMany({
      where: { orgId: session.orgId!, hallSlot: { date: { gte: yearStart, lt: yearEnd } } },
      select: { status: true, totalPaise: true, advancePaise: true, discountPaise: true, refundPaise: true, paymentMethod: true, createdAt: true, hallSlot: { select: { date: true } } },
    }),
    db.booking.findFirst({
      where: { orgId: session.orgId! },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db.hallSlot.findFirst({
      where: { hall: { venue: { orgId: session.orgId! } }, bookings: { some: {} } },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    db.expense.findMany({
      where: { orgId: session.orgId!, date: { gte: thisMonthStart, lte: thisMonthEnd } },
      select: { category: true, amountPaise: true },
    }),
    db.expense.findMany({
      where: { orgId: session.orgId!, date: { gte: yearStart, lt: yearEnd } },
      select: { amountPaise: true, date: true },
    }),
    db.booking.findMany({
      where: { orgId: session.orgId!, status: "PENDING" },
      include: {
        hallSlot: {
          include: {
            template: true,
            hall: { include: { venue: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const firstYear = earliest ? earliest.createdAt.getFullYear() : currentYear;
  const lastBookingYear = latestSlot ? latestSlot.date.getFullYear() : currentYear;
  const maxYear = Math.max(currentYear, lastBookingYear);
  const availableYears = Array.from({ length: maxYear - firstYear + 1 }, (_, i) => maxYear - i);

  // --- Monthly aggregation for charts ---
  const monthData = MONTHS.map((month) => ({
    month, confirmed: 0, advancePaid: 0, cancelled: 0, pending: 0, expired: 0,
    revenuePaise: 0, collectedPaise: 0, refundedPaise: 0, cashCount: 0,
  }));

  for (const b of allYearBookings) {
    const m = new Date(b.hallSlot.date).getMonth();
    const d = monthData[m];
    if (b.status === "CONFIRMED") {
      d.confirmed++;
      const net = b.totalPaise - (b.discountPaise ?? 0);
      d.revenuePaise += net;
      d.collectedPaise += net;
    } else if (b.status === "ADVANCE_PAID") {
      d.advancePaid++;
      d.collectedPaise += b.advancePaise ?? 0;
    } else if (b.status === "CANCELLED") {
      d.cancelled++;
      const adv = b.advancePaise ?? 0;
      const ref = b.refundPaise ?? 0;
      if (adv > 0) d.collectedPaise += adv;
      if (ref > 0) { d.collectedPaise -= ref; d.refundedPaise += ref; }
    } else if (b.status === "PENDING" || b.status === "APPROVED") {
      d.pending++;
    } else if (b.status === "EXPIRED") {
      d.expired++;
    }
    if (b.paymentMethod === "CASH") d.cashCount++;
  }

  // --- Stat card data (selected year) ---
  const totalRevenuePaise = allYearBookings.reduce((sum, b) => {
    if (b.status === "CONFIRMED") return sum + b.totalPaise - (b.discountPaise ?? 0);
    if (b.status === "ADVANCE_PAID") return sum + (b.advancePaise ?? 0);
    if (b.status === "CANCELLED") return sum + Math.max(0, (b.advancePaise ?? 0) - (b.refundPaise ?? 0));
    return sum;
  }, 0);

  const counts = allYearBookings.reduce(
    (acc, b) => { acc[b.status] = (acc[b.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  // --- Insights props for AnalyticsCharts ---
  const totalConfirmed = monthData.reduce((s, m) => s + m.confirmed, 0);
  const totalCancelled = monthData.reduce((s, m) => s + m.cancelled, 0);
  const totalCash = monthData.reduce((s, m) => s + m.cashCount, 0);
  const totalOnline = Math.max(0,
    (totalConfirmed + monthData.reduce((s, m) => s + m.advancePaid, 0)) - totalCash
  );
  const bestMonthData = monthData.reduce((best, m, i) => m.confirmed > monthData[best].confirmed ? i : best, 0);
  const bestMonthChart = monthData[bestMonthData].confirmed > 0 ? MONTHS[bestMonthData] : null;

  const recent3 = monthData.slice(Math.max(0, nowMonth - 2), nowMonth + 1).reduce((s, m) => s + m.confirmed + m.advancePaid, 0);
  const prev3Chart = monthData.slice(Math.max(0, nowMonth - 5), nowMonth - 2).reduce((s, m) => s + m.confirmed + m.advancePaid, 0);
  const trendPct = prev3Chart > 0 ? Math.round(((recent3 - prev3Chart) / prev3Chart) * 100) : null;
  const trendDirection: "up" | "down" | "stable" = trendPct === null ? "stable" : trendPct > 5 ? "up" : trendPct < -5 ? "down" : "stable";

  const yearTotal = allYearBookings.length;
  const yearCancelled = allYearBookings.filter((b) => b.status === "CANCELLED").length;
  const cancellationRate = yearTotal > 0 ? Math.round((yearCancelled / yearTotal) * 100) : 0;

  const monthExpensePaise = monthExpenses.reduce((s: number, e) => s + e.amountPaise, 0);

  // Year expense monthly breakdown for analytics charts
  const yearExpenseByMonth = Array(12).fill(0) as number[];
  for (const e of yearExpenses) { yearExpenseByMonth[e.date.getMonth()] += e.amountPaise; }
  const expenseMonthData = MONTHS.map((month, i) => ({ month, totalPaise: yearExpenseByMonth[i] }));
  const yearExpensePaise = yearExpenses.reduce((s, e) => s + e.amountPaise, 0);

  // Top expense categories this month
  const expenseByCat = monthExpenses.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amountPaise;
    return acc;
  }, {} as Record<string, number>);
  const topExpenses: [string, number][] = Object.entries(expenseByCat)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 4) as [string, number][];

  const stats = [
    { label: `Revenue ${year}`, value: `₹${(totalRevenuePaise / 100).toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Confirmed", value: counts.CONFIRMED ?? 0, icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Advance paid", value: counts.ADVANCE_PAID ?? 0, icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Total bookings", value: allYearBookings.length, icon: Hash, color: "text-zinc-700 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Overview of your venues and bookings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Live</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/owner/calendar"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Pending booking requests */}
      <PendingRequests
        bookings={pendingBookings.map((b) => ({
          id: b.id,
          guestName: b.guestName,
          guestPhone: b.guestPhone,
          guestEmail: b.guestEmail,
          totalPaise: b.totalPaise,
          createdAt: b.createdAt.toISOString(),
          heldUntil: b.hallSlot.heldUntil?.toISOString() ?? null,
          hallSlot: {
            date: b.hallSlot.date.toISOString().slice(0, 10),
            template: { name: b.hallSlot.template.name, startTime: b.hallSlot.template.startTime, endTime: b.hallSlot.template.endTime },
            hall: { name: b.hallSlot.hall.name, venue: { name: b.hallSlot.hall.venue.name } },
          },
        }))}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
            <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium">{stat.label}</div>
              <div className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Expense summary */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">Expenses this month</span>
            <span className="ml-2 text-xs text-zinc-400">
              {now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </span>
          </div>
          <Link href="/owner/expenses" className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
            Manage →
          </Link>
        </div>
        {monthExpenses.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-zinc-400">No expenses recorded this month.</p>
            <Link href="/owner/expenses" className="mt-2 inline-block text-xs text-amber-600 font-medium hover:underline">
              + Add expense
            </Link>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                ₹{(monthExpensePaise / 100).toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-zinc-400">{monthExpenses.length} entries</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {topExpenses.map(([cat, paise]) => {
                const pct = monthExpensePaise > 0 ? Math.round((paise / monthExpensePaise) * 100) : 0;
                return (
                  <div key={cat} className="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-3 space-y-1.5">
                    <div className="text-xs font-semibold text-zinc-500 truncate">{cat}</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">
                      ₹{(paise / 100).toLocaleString("en-IN")}
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] text-zinc-400">{pct}% of total</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Analytics charts */}
      <AnalyticsCharts
        year={year}
        availableYears={availableYears}
        monthData={monthData}
        expenseMonthData={expenseMonthData}
        insights={{
          totalBookings: allYearBookings.length,
          totalConfirmed,
          totalCancelled,
          cancellationRate,
          totalRevenuePaise,
          yearExpensePaise,
          bestMonth: bestMonthChart,
          trendDirection,
          trendPct,
          nowMonth,
          totalCash,
          totalOnline,
        }}
      />
    </div>
  );
}
