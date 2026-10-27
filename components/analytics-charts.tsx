"use client";

import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
  PieChart, Pie,
} from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, CalendarCheck, IndianRupee, BarChart3, Receipt } from "lucide-react";

interface MonthData {
  month: string;
  confirmed: number;
  advancePaid: number;
  cancelled: number;
  pending: number;
  expired: number;
  revenuePaise: number;
  collectedPaise: number;
  refundedPaise: number;
  cashCount: number;
}

interface Insights {
  totalBookings: number;
  totalConfirmed: number;
  totalCancelled: number;
  cancellationRate: number;
  totalRevenuePaise: number;
  yearExpensePaise: number;
  bestMonth: string | null;
  trendDirection: "up" | "down" | "stable";
  trendPct: number | null;
  nowMonth: number;
  totalCash: number;
  totalOnline: number;
}

interface Props {
  year: number;
  availableYears: number[];
  monthData: MonthData[];
  expenseMonthData: { month: string; totalPaise: number }[];
  insights: Insights;
}

const MONTHS_LONG = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// Linear regression forecast
function forecast(values: number[], ahead: number): number[] {
  const n = values.length;
  if (n < 2) return Array(ahead).fill(Math.max(0, values[0] ?? 0));
  const sumX = values.reduce((_, __, i) => i, 0) * n * (n - 1) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((s, v, i) => s + i * v, 0);
  const sumXX = values.reduce((s, _, i) => s + i * i, 0);
  const denom = n * sumXX - (n * (n - 1) / 2) ** 2;
  if (!denom) return Array(ahead).fill(Math.max(0, Math.round(sumY / n)));
  const slope = (n * sumXY - (n * (n - 1) / 2) * sumY) / denom;
  const intercept = (sumY - slope * (n * (n - 1) / 2)) / n;
  return Array.from({ length: ahead }, (_, i) => Math.max(0, Math.round(intercept + slope * (n + i))));
}

// Custom tooltip for revenue/expenses overlay
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const colorMap: Record<string, string> = {
    Revenue: "text-amber-600", Forecast: "text-amber-400", Expenses: "text-rose-500",
  };
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-3 text-sm">
      <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">{label}</p>
      {payload.map((p) => p.value > 0 && (
        <p key={p.name} className={colorMap[p.name] ?? "text-zinc-500"}>
          {p.name}: ₹{(p.value / 100).toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
}

function BookingTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-3 text-sm">
      <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">{label}</p>
      {payload.map((p) => p.value > 0 && (
        <p key={p.name} style={{ color: p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

export function AnalyticsCharts({ year, availableYears, monthData, expenseMonthData, insights }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const {
    totalBookings, totalConfirmed, totalCancelled, cancellationRate,
    totalRevenuePaise, yearExpensePaise, bestMonth, trendDirection, trendPct, nowMonth,
    totalCash, totalOnline,
  } = insights;

  const netProfitPaise = totalRevenuePaise - yearExpensePaise;

  const avgMonthlyRevenue = totalConfirmed > 0
    ? Math.round(totalRevenuePaise / Math.max(1, monthData.slice(0, nowMonth + 1).filter(m => m.revenuePaise > 0).length))
    : 0;

  // Build chart data — actual months + 3-month forecast
  const confirmedHistory = monthData.slice(0, nowMonth + 1).map(m => m.confirmed + m.advancePaid);
  const forecastVals = forecast(confirmedHistory.filter(v => v > 0).length > 0 ? confirmedHistory : [0], Math.min(3, 11 - nowMonth));
  const nextMonthName = MONTHS_LONG[(nowMonth + 1) % 12] ?? "";
  const nextMonthForecast = forecastVals[0] ?? 0;

  const revenueHistory = monthData.slice(0, nowMonth + 1).map(m => m.revenuePaise);
  const revForecast = forecast(revenueHistory.filter(v => v > 0).length > 0 ? revenueHistory : [0], Math.min(3, 11 - nowMonth));

  const revenueChartData = useMemo(() => {
    const actual = monthData.slice(0, nowMonth + 1).map((m, i) => ({
      month: m.month,
      Revenue: m.revenuePaise,
      Refunds: m.refundedPaise > 0 ? -m.refundedPaise : 0,
      Expenses: expenseMonthData[i]?.totalPaise ?? 0,
      Forecast: null as number | null,
    }));
    // Last actual point is shared with forecast start
    const forecastData = forecastVals.map((v, i) => ({
      month: MONTHS_LONG[(nowMonth + 1 + i) % 12]?.slice(0, 3) ?? "",
      Revenue: i === 0 ? (actual[actual.length - 1]?.Revenue ?? 0) : null,
      Refunds: 0,
      Expenses: null as number | null,
      Forecast: v,
    }));
    return [...actual, ...forecastData];
  }, [monthData, nowMonth, forecastVals, expenseMonthData]);

  const bookingChartData = useMemo(() =>
    monthData.map((m, i) => ({
      month: m.month,
      Confirmed: i <= nowMonth ? m.confirmed : 0,
      "Advance paid": i <= nowMonth ? m.advancePaid : 0,
      Cancelled: i <= nowMonth ? m.cancelled : 0,
    })),
  [monthData, nowMonth]);

  const insightBullets = useMemo(() => {
    const items: { icon: string; text: string; color: string }[] = [];
    if (trendPct !== null && trendDirection !== "stable") {
      items.push({
        icon: trendDirection === "up" ? "↑" : "↓",
        text: `Bookings trending ${trendDirection} ${Math.abs(trendPct)}% vs previous 3 months`,
        color: trendDirection === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500",
      });
    }
    if (cancellationRate >= 20) {
      items.push({
        icon: "⚠",
        text: `High cancellation rate (${cancellationRate}%) — consider a deposit policy`,
        color: "text-amber-600 dark:text-amber-400",
      });
    }
    if (bestMonth) {
      items.push({
        icon: "★",
        text: `${bestMonth} is your busiest month — consider premium pricing`,
        color: "text-amber-600 dark:text-amber-400",
      });
    }
    if (nextMonthForecast > 0) {
      items.push({
        icon: "◎",
        text: `Predicted ~${nextMonthForecast} booking${nextMonthForecast !== 1 ? "s" : ""} in ${nextMonthName}`,
        color: "text-blue-600 dark:text-blue-400",
      });
    }
    if (items.length === 0) {
      items.push({ icon: "◎", text: "Add more bookings to see trend insights", color: "text-zinc-400" });
    }
    return items;
  }, [trendPct, trendDirection, cancellationRate, bestMonth, nextMonthForecast, nextMonthName]);

  return (
    <>
      {/* Year selector */}
      <div className="flex justify-end">
        <select
          value={year}
          onChange={(e) => router.push(`${pathname}?year=${e.target.value}`)}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={<BarChart3 className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />}
          bg="bg-zinc-100 dark:bg-zinc-800"
          label="Total bookings"
          value={totalBookings}
        />
        <KpiCard
          icon={<CalendarCheck className="h-5 w-5 text-emerald-600" />}
          bg="bg-emerald-50 dark:bg-emerald-950/30"
          label="Confirmed"
          value={String(totalConfirmed)}
          sub={totalBookings > 0 ? `${Math.round((totalConfirmed / totalBookings) * 100)}% of total` : undefined}
          valueColor="text-emerald-600"
        />
        <KpiCard
          icon={<IndianRupee className="h-5 w-5 text-amber-600" />}
          bg="bg-amber-50 dark:bg-amber-950/30"
          label="Revenue"
          value={`₹${(totalRevenuePaise / 100).toLocaleString("en-IN")}`}
          sub={avgMonthlyRevenue > 0 ? `~₹${(avgMonthlyRevenue / 100).toLocaleString("en-IN")}/mo` : undefined}
          valueColor="text-amber-600"
          small
        />
        <KpiCard
          icon={cancellationRate >= 20
            ? <AlertTriangle className="h-5 w-5 text-red-500" />
            : <TrendingUp className="h-5 w-5 text-blue-600" />}
          bg={cancellationRate >= 20 ? "bg-red-50 dark:bg-red-950/20" : "bg-blue-50 dark:bg-blue-950/30"}
          label="Cancellation rate"
          value={`${cancellationRate}%`}
          sub={`${totalCancelled} cancelled`}
          valueColor={cancellationRate >= 20 ? "text-red-500" : "text-blue-600"}
        />
      </div>

      {/* Expense KPI cards */}
      {yearExpensePaise > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={<Receipt className="h-5 w-5 text-rose-500" />}
            bg="bg-rose-50 dark:bg-rose-950/20"
            label={`Expenses ${year}`}
            value={`₹${(yearExpensePaise / 100).toLocaleString("en-IN")}`}
            valueColor="text-rose-500"
            small
          />
          <KpiCard
            icon={<TrendingUp className={`h-5 w-5 ${netProfitPaise >= 0 ? "text-emerald-600" : "text-red-500"}`} />}
            bg={netProfitPaise >= 0 ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-red-50 dark:bg-red-950/20"}
            label={`Net profit ${year}`}
            value={`${netProfitPaise < 0 ? "−" : ""}₹${(Math.abs(netProfitPaise) / 100).toLocaleString("en-IN")}`}
            sub={totalRevenuePaise > 0 ? `${Math.round(((totalRevenuePaise - yearExpensePaise) / totalRevenuePaise) * 100)}% margin` : undefined}
            valueColor={netProfitPaise >= 0 ? "text-emerald-600" : "text-red-500"}
            small
          />
        </div>
      )}

      {/* Revenue area chart */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Revenue vs Expenses</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Monthly revenue (amber) · expenses (rose) · dashed = forecast</p>
          </div>
          {trendDirection !== "stable" && trendPct !== null && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
              trendDirection === "up"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
            }`}>
              {trendDirection === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trendPct > 0 ? "+" : ""}{trendPct}% vs prev 3 months
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="refundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 100 ? `₹${(v / 100).toFixed(0)}` : "₹0"}
              tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} width={60}
            />
            <Tooltip content={<RevenueTooltip />} />
            <Area
              type="monotone" dataKey="Revenue" stroke="#f59e0b" strokeWidth={2.5}
              fill="url(#revGrad)" dot={{ r: 3, fill: "#f59e0b", stroke: "white", strokeWidth: 2 }}
              activeDot={{ r: 5 }} connectNulls
            />
            {yearExpensePaise > 0 && (
              <Area
                type="monotone" dataKey="Expenses" stroke="#f43f5e" strokeWidth={2}
                fill="url(#expGrad)" dot={{ r: 3, fill: "#f43f5e", stroke: "white", strokeWidth: 2 }}
                activeDot={{ r: 5 }} connectNulls
              />
            )}
            {revenueChartData.some((d) => (d.Refunds ?? 0) < 0) && (
              <Area
                type="monotone" dataKey="Refunds" stroke="#3b82f6" strokeWidth={2}
                fill="url(#refundGrad)" dot={{ r: 3, fill: "#3b82f6", stroke: "white", strokeWidth: 2 }}
                activeDot={{ r: 5 }} connectNulls
              />
            )}
            <Area
              type="monotone" dataKey="Forecast" stroke="#f59e0b" strokeWidth={2}
              strokeDasharray="5 4" fill="url(#forecastGrad)"
              dot={{ r: 3, fill: "white", stroke: "#f59e0b", strokeWidth: 2 }}
              opacity={0.7} connectNulls
            />
            {revenueChartData.length > nowMonth + 1 && (
              <ReferenceLine
                x={revenueChartData[nowMonth]?.month}
                stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4}
                label={{ value: "now", fill: "#f59e0b", fontSize: 10 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Grouped bar chart */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="mb-5">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Bookings by month</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Confirmed · Advance paid · Cancelled</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={bookingChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="30%" barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} width={24} />
            <Tooltip content={<BookingTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              formatter={(value) => <span className="text-zinc-500 dark:text-zinc-400">{value}</span>}
            />
            <Bar dataKey="Confirmed" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {bookingChartData.map((_, i) => (
                <Cell key={i} fill={monthData[i]?.month === bestMonth ? "#d97706" : "#f59e0b"} />
              ))}
            </Bar>
            <Bar dataKey="Advance paid" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Cancelled" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Payment method split */}
      {(totalCash + totalOnline) > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Payment method</h2>
          <p className="text-xs text-zinc-400 mb-5">Cash vs online breakdown</p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="shrink-0">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Online", value: totalOnline, fill: "#f59e0b" },
                      { name: "Cash", value: totalCash, fill: "#10b981" },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={52} outerRadius={80}
                    paddingAngle={3} dataKey="value"
                  >
                    <Cell fill="#f59e0b" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [`${v} bookings`, name]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3 w-full">
              <PaymentBar label="Online" count={totalOnline} total={totalCash + totalOnline} color="bg-amber-400" />
              <PaymentBar label="Cash" count={totalCash} total={totalCash + totalOnline} color="bg-emerald-500" />
            </div>
          </div>
        </div>
      )}

      {/* Monthly table - full width */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 overflow-auto">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Monthly summary</h2>
        <table className="w-full text-xs min-w-[520px]">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="pb-2 text-left font-medium text-zinc-400">Month</th>
              <th className="pb-2 text-right font-medium text-amber-500">Confirmed</th>
              <th className="pb-2 text-right font-medium text-blue-500">Advance paid</th>
              <th className="pb-2 text-right font-medium text-red-400">Cancelled</th>
              <th className="pb-2 text-right font-medium text-amber-600">Revenue</th>
              {yearExpensePaise > 0 && <th className="pb-2 text-right font-medium text-rose-500">Expenses</th>}
              {yearExpensePaise > 0 && <th className="pb-2 text-right font-medium text-emerald-600">Net</th>}
              <th className="pb-2 text-right font-medium text-zinc-400">Cash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {monthData.map((m, i) => {
              const isFuture = i > nowMonth;
              const isBest = m.month === bestMonth;
              const monthExp = expenseMonthData[i]?.totalPaise ?? 0;
              const netRevenue = m.revenuePaise - m.refundedPaise;
              const net = netRevenue - monthExp;
              const hasData = m.confirmed || m.advancePaid || m.cancelled || netRevenue !== 0 || monthExp > 0 || m.cashCount;
              if (isFuture && !hasData) return null;
              return (
                <tr key={m.month} className={`${isBest ? "bg-amber-50/50 dark:bg-amber-950/10" : ""} ${isFuture ? "opacity-60" : ""}`}>
                  <td className="py-2 font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="flex items-center gap-1">
                      {m.month}{isBest && <span className="text-amber-500 text-[10px]">★ best</span>}
                    </span>
                  </td>
                  <td className="py-2 text-right text-emerald-600">{m.confirmed || "—"}</td>
                  <td className="py-2 text-right text-blue-500">{m.advancePaid || "—"}</td>
                  <td className="py-2 text-right text-red-400">{m.cancelled || "—"}</td>
                  <td className="py-2 text-right text-amber-600 font-medium">
                    {netRevenue !== 0 ? (
                      <span className={netRevenue < 0 ? "text-red-500" : ""}>
                        {netRevenue < 0 ? "−" : ""}₹{Math.round(Math.abs(netRevenue) / 100).toLocaleString("en-IN")}
                        {m.refundedPaise > 0 && <span className="text-[10px] text-blue-500 ml-1">(−₹{Math.round(m.refundedPaise / 100).toLocaleString("en-IN")} refund)</span>}
                      </span>
                    ) : "—"}
                  </td>
                  {yearExpensePaise > 0 && (
                    <td className="py-2 text-right text-rose-500">
                      {monthExp > 0 ? `₹${Math.round(monthExp / 100).toLocaleString("en-IN")}` : "—"}
                    </td>
                  )}
                  {yearExpensePaise > 0 && (
                    <td className={`py-2 text-right font-semibold ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {netRevenue !== 0 || monthExp > 0
                        ? `${net < 0 ? "−" : ""}₹${Math.round(Math.abs(net) / 100).toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                  )}
                  <td className="py-2 text-right text-zinc-400">{m.cashCount || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PaymentBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-400 font-medium">{label}</span>
        <span className="text-zinc-900 dark:text-zinc-50 font-semibold">{count} <span className="text-zinc-400 font-normal text-xs">({pct}%)</span></span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KpiCard({
  icon, bg, label, value, sub, valueColor, small,
}: {
  icon: React.ReactNode; bg: string; label: string;
  value: string | number; sub?: string; valueColor?: string; small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
      <div>
        <div className="text-xs text-zinc-500 font-medium">{label}</div>
        <div className={`${small ? "text-xl" : "text-2xl"} font-bold mt-0.5 ${valueColor ?? "text-zinc-700 dark:text-zinc-300"}`}>{value}</div>
        {sub && <div className="text-[10px] text-zinc-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
