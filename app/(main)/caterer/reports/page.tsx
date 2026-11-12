import { canOpen } from "@/lib/caterer-access";
import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { cashBook, METHOD_LABEL } from "@/lib/caterer-books";
import { balanceSheet, billedInRange, expensesInRange, paymentsInRange } from "@/lib/caterer-finance";
import { rs } from "@/lib/caterer-orders";
import { Bar, Panel, Row } from "@/components/caterer-report-ui";
import { QuickPay } from "@/components/caterer-quick-pay";
import { SendReminder } from "@/components/caterer-send-reminder";
import { ReportPager, pageOf, type ReportPaging } from "@/components/caterer-report-pager";
import { parsePaging } from "@/lib/paging";
import { AgingTab, CostsTab, CustomersTab, FunctionsTab, OverviewTab, SalesTab, StaffTab } from "./insight-tabs";
import { staffMonth } from "@/lib/caterer-staff-server";
import { CatererRangePicker } from "@/components/caterer-range-picker";
import { parseRange } from "@/lib/caterer-report-range";
import { analyticsInRange, balancesInRange, supplierDuesInRange } from "@/lib/caterer-analytics";
import { GROUP_LABEL, type ItemGroupKey } from "@/lib/caterer-items";
import { BILL_LABEL, formatInvoiceDate } from "@/lib/caterer-orders";
import { cn } from "@/lib/utils";

// Reports are grouped the way an owner asks questions: how is it going, what sells, what does it cost, where is the money.
const ALL_GROUPS = [
  { key: "overview", label: "Overview", tabs: [{ key: "overview", label: "Scorecard" }] },
  { key: "sales", label: "Sales", tabs: [{ key: "trend", label: "Sales trend" }, { key: "customers", label: "Customers" }, { key: "items", label: "Items & analytics" }, { key: "functions", label: "Functions & profit" }] },
  { key: "costs", label: "Costs", tabs: [{ key: "costs", label: "Costs & suppliers" }, { key: "staff", label: "Staff cost" }] },
  { key: "money", label: "Money", tabs: [{ key: "pl", label: "Profit & Loss" }, { key: "balances", label: "Balances" }, { key: "aging", label: "Aging" }, { key: "balance", label: "Balance Sheet" }, { key: "cash", label: "Cash & Bank" }] },
] as const;
// these two are "as of today", so they have no date range
const NO_RANGE = ["balance", "aging"];

// which Excel file belongs to which report
const EXPORT_FOR: Record<string, string | undefined> = { balances: "balances", items: "items", pl: "sales", cash: "daybook", functions: "functions", customers: "customers", costs: "purchases", trend: "sales" };

export default async function CatererReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string; period?: string; month?: string; year?: string; from?: string; to?: string; page?: string; pageSize?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const { caterer } = ctx;
  const orgId = caterer.orgId!;
  const sp = await searchParams;

  // reports the owner hid from this person are left out; with no tab chosen they land on the first one they can open
  const open = (t: string) => canOpen(ctx.session.deny, `/caterer/reports?tab=${t}`);
  const GROUPS = ALL_GROUPS.map((g) => ({ ...g, tabs: g.tabs.filter((t) => open(t.key)) })).filter((g) => g.tabs.length > 0);
  const ALL_TABS = GROUPS.flatMap((g) => g.tabs.map((t) => t.key as string));
  if (ALL_TABS.length === 0) redirect("/caterer/no-access");
  const tab = ALL_TABS.includes(sp.tab ?? "") ? (sp.tab as string) : ALL_TABS[0];
  const group = GROUPS.find((g) => g.tabs.some((t) => t.key === tab)) ?? GROUPS[0];
  const range = parseRange(sp);
  const href = (t: string) => `/caterer/reports?tab=${t}${NO_RANGE.includes(t) ? "" : `&${range.qs}`}`;
  const paging = parsePaging(sp, 25);
  const pg: ReportPaging = { query: { tab, ...Object.fromEntries(new URLSearchParams(range.qs)) }, page: paging.page, pageSize: paging.pageSize };
  const rng = { catererId: caterer.id, orgId, from: range.from, to: range.to, label: range.label, pg };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Reports</h1>
        <p className="text-sm text-zinc-500 mt-0.5">How the business is going. Pick any start and end date.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <Link key={g.key} href={href(g.tabs[0].key)} className={cn("rounded-xl border px-4 py-2 text-sm font-semibold transition-colors", group.key === g.key ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>{g.label}</Link>
        ))}
      </div>
      {group.tabs.length > 1 && (
        <div className="inline-flex flex-wrap rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
          {group.tabs.map((t) => (
            <Link key={t.key} href={href(t.key)} className={cn("px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors", tab === t.key ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}>{t.label}</Link>
          ))}
        </div>
      )}

      {!NO_RANGE.includes(tab) && <CatererRangePicker tab={tab} range={range} exportType={EXPORT_FOR[tab]} />}

      {tab === "overview" && <OverviewTab {...rng} />}
      {tab === "trend" && <SalesTab {...rng} />}
      {tab === "customers" && <CustomersTab {...rng} />}
      {tab === "items" && <AnalyticsTab catererId={caterer.id} from={range.from} to={range.to} label={range.label} pg={pg} />}
      {tab === "functions" && <FunctionsTab {...rng} />}
      {tab === "costs" && <CostsTab {...rng} />}
      {tab === "staff" && <StaffTab {...rng} />}
      {tab === "pl" && <ProfitTab catererId={caterer.id} orgId={orgId} from={range.from} to={range.to} label={range.label} month={range.kind === "month" ? range.fromKey.slice(0, 7) : undefined} />}
      {tab === "balances" && <BalancesTab catererId={caterer.id} from={range.from} to={range.to} label={range.label} pg={pg} />}
      {tab === "aging" && <AgingTab catererId={caterer.id} pg={pg} />}
      {tab === "balance" && <BalanceTab catererId={caterer.id} orgId={orgId} />}
      {tab === "cash" && <CashTab catererId={caterer.id} orgId={orgId} from={range.from} to={range.to} label={range.label} />}
    </div>
  );
}

async function BalanceTab({ catererId, orgId }: { catererId: string; orgId: string }) {
  const s = await balanceSheet(catererId, orgId);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="What you have">
          <Row label="Cash in hand" sub="Money received from customers minus expenses paid" value={rs(s.cashInHand)} tone={s.cashInHand < 0 ? "bad" : undefined} />
          <Row label="Customers owe you" sub={`${s.dues.length} customer${s.dues.length === 1 ? "" : "s"} with a balance`} value={rs(s.receivables)} />
          <Row label="You owe suppliers" sub={`${s.supplierDues.length} supplier${s.supplierDues.length === 1 ? "" : "s"} to pay`} value={`−${rs(s.payables)}`} />
          <Row label="Net position" value={rs(s.position)} strong tone={s.position < 0 ? "bad" : "good"} />
        </Panel>
        <Panel title="How it came about">
          <Row label="Total billed" sub="All invoices after discounts, not counting cancelled functions" value={rs(s.billedAll)} />
          <Row label="Received so far" value={rs(s.received)} tone="good" />
          <Row label="Expenses paid" value={`−${rs(s.expenseCost)}`} />
          <Row label="Paid to suppliers" value={`−${rs(s.paidToSuppliers)}`} />
          <Row label="Paid to staff" value={`−${rs(s.paidToStaff)}`} />
          <Row label="Still to collect" value={rs(s.receivables)} strong />
        </Panel>
      </div>

      <Panel title="Customer dues">
        {s.dues.length === 0 ? <p className="text-sm text-zinc-400 py-2">Nobody owes you anything.</p> : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {s.dues.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/caterer/customers/${c.id}`} className="min-w-0 hover:text-amber-600">
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{c.name}</span>
                  <span className="block text-xs text-zinc-500">{c.invoices} open invoice{c.invoices === 1 ? "" : "s"}</span>
                </Link>
                <span className="flex items-center gap-3 shrink-0">
                  <a href={`tel:${c.phone}`} className="text-xs text-amber-600 hover:underline">{c.phone}</a>
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">{rs(c.balancePaise)}</span>
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-3 text-sm font-bold"><span>Total due</span><span className="text-red-600 dark:text-red-400">{rs(s.receivables)}</span></div>
          </div>
        )}
      </Panel>
      <Panel title="You owe suppliers">
        {s.supplierDues.length === 0 ? <p className="text-sm text-zinc-400 py-2">You don&apos;t owe any supplier.</p> : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {s.supplierDues.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <Link href={`/caterer/suppliers/${encodeURIComponent(c.name)}`} className="font-medium text-zinc-900 dark:text-zinc-50 hover:text-amber-600 truncate">{c.name}</Link>
                <span className="font-semibold text-red-600 dark:text-red-400">{rs(c.balancePaise)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 text-sm font-bold"><span>Total payable</span><span className="text-red-600 dark:text-red-400">{rs(s.payables)}</span></div>
          </div>
        )}
      </Panel>
      <p className="text-xs text-zinc-400">A simple balance sheet for a catering team: money in, money out, money customers owe you and money you owe suppliers. Record every purchase and expense to keep it accurate.</p>
    </div>
  );
}

async function ProfitTab({ catererId, orgId, from, to, label, month }: { catererId: string; orgId: string; from: Date; to: Date; label: string; month?: string }) {
  const staffOwed = month ? (await staffMonth(catererId, orgId, month)).reduce((s, p) => s + p.toPayPaise, 0) : 0;
  const [billed, expenses, payments] = await Promise.all([billedInRange(catererId, from, to), expensesInRange(orgId, from, to, catererId), paymentsInRange(catererId, from, to)]);
  const received = payments.reduce((s, p) => s + p.amountPaise, 0);
  const profit = billed.total - expenses.total;
  const cashProfit = received - expenses.paidTotal;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title={`Income · ${label}`}>
          <Row label="Food bills" value={rs(billed.food)} />
          <Row label="Service & Settings bills" value={rs(billed.service)} />
          <Row label="Total billed" sub={`${billed.count} invoice${billed.count === 1 ? "" : "s"}`} value={rs(billed.total)} strong />
        </Panel>
        <Panel title={`Expenses · ${label}`}>
          {expenses.byCategory.length === 0 ? <p className="text-sm text-zinc-400 py-2">No expenses or purchases recorded.</p> : expenses.byCategory.map((c) => <Row key={c.category} label={c.category} value={rs(c.totalPaise)} />)}
          <Row label="Total costs" sub={`Expenses ${rs(expenses.expenseTotal)} · Purchases ${rs(expenses.purchaseTotal)} · Staff ${rs(expenses.staffTotal)}`} value={rs(expenses.total)} strong />
        </Panel>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Profit (on bills)">
          <Row label="Billed" value={rs(billed.total)} />
          <Row label="Costs (expenses and purchases)" value={`−${rs(expenses.total)}`} />
          <Row label="Profit" value={rs(profit)} strong tone={profit < 0 ? "bad" : "good"} />
        </Panel>
        <Panel title="Cash in hand (money actually received)">
          <Row label="Received" value={rs(received)} />
          <Row label="Paid out (expenses, suppliers and staff)" value={`−${rs(expenses.paidTotal)}`} />
          <Row label="Cash profit" value={rs(cashProfit)} strong tone={cashProfit < 0 ? "bad" : "good"} />
        </Panel>
      </div>
      {staffOwed > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <span className="font-semibold">{rs(staffOwed)} of staff pay for {label} is still to be paid.</span> It is not in the costs above yet, because salary counts as a cost when you pay it. <Link href={`/caterer/staff?month=${month}`} className="font-semibold underline">See who is owed</Link>.
        </div>
      )}
      <p className="text-xs text-zinc-400">Profit counts what you billed for functions in this period. Cash profit counts what customers actually paid in this period, so the two differ while balances are pending.</p>
    </div>
  );
}

async function BalancesTab({ catererId, from, to, label, pg }: { catererId: string; from: Date; to: Date; label: string; pg: ReportPaging }) {
  const [b, suppliers] = await Promise.all([balancesInRange(catererId, from, to), supplierDuesInRange(catererId, from, to)]);
  const paged = pageOf(b.open, pg);
  const supplierDue = suppliers.reduce((s, x) => s + x.duePaise, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"><div className="text-xs text-zinc-500">Billed</div><div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{rs(b.totals.billedPaise)}</div><div className="text-xs text-zinc-400">{b.totals.invoices} invoice{b.totals.invoices === 1 ? "" : "s"}</div></div>
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-4"><div className="text-xs text-emerald-700 dark:text-emerald-400">Received</div><div className="text-xl font-bold text-emerald-800 dark:text-emerald-300">{rs(b.totals.receivedPaise)}</div></div>
        <div className={cn("rounded-2xl border p-4", b.totals.balancePaise > 0 ? "border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900")}><div className="text-xs text-zinc-500">Balance due from customers</div><div className={cn("text-xl font-bold", b.totals.balancePaise > 0 ? "text-red-700 dark:text-red-300" : "text-zinc-400")}>{b.totals.balancePaise > 0 ? rs(b.totals.balancePaise) : "Nil"}</div><div className="text-xs text-zinc-400">{b.open.length} open · {b.totals.closed} closed</div></div>
        <div className={cn("rounded-2xl border p-4", supplierDue > 0 ? "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900")}><div className="text-xs text-zinc-500">Still to pay suppliers</div><div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{supplierDue > 0 ? rs(supplierDue) : "Nil"}</div><div className="text-xs text-zinc-400">bills in {label}</div></div>
      </div>

      <Panel title={`Open invoices · ${label}`}>
        {b.open.length === 0 ? <p className="text-sm text-zinc-400 py-2">No balance is due on functions in this period.</p> : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr><th className="py-2 text-left">Invoice</th><th className="py-2 text-left">Customer</th><th className="py-2 text-left">Function</th><th className="py-2 text-right">Total</th><th className="py-2 text-right">Received</th><th className="py-2 text-right">Balance</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {paged.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 whitespace-nowrap"><Link href={`/caterer/orders/${r.orderId}`} className="font-medium text-zinc-900 dark:text-zinc-50 hover:text-amber-600">#{r.number}</Link><span className="block text-xs text-zinc-400">{BILL_LABEL[r.type as "FOOD" | "SERVICE"]}</span></td>
                    <td className="py-2"><Link href={`/caterer/customers/${r.customer.id}`} className="hover:text-amber-600">{r.customer.name}</Link><a href={`tel:${r.customer.phone}`} className="block text-xs text-zinc-400 hover:text-amber-600">{r.customer.phone}</a></td>
                    <td className="py-2 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{formatInvoiceDate(r.functionDate)}{r.daysSince > 0 && <span className="block text-xs text-zinc-400">{r.daysSince} days ago</span>}</td>
                    <td className="py-2 text-right">{rs(r.netPaise)}</td>
                    <td className="py-2 text-right text-emerald-600 dark:text-emerald-400">{rs(r.receivedPaise)}</td>
                    <td className="py-2 text-right font-semibold text-red-600 dark:text-red-400"><div className="flex items-center justify-end gap-2">{rs(r.balancePaise)}<QuickPay compact customer={r.customer.name} bills={[{ id: r.id, number: r.number, type: r.type as "FOOD" | "SERVICE", balancePaise: r.balancePaise }]} /><SendReminder compact customerId={r.customer.id} customerName={r.customer.name} phone={r.customer.phone} balancePaise={r.balancePaise} invoices={`Invoice ${r.number}`} date={r.functionDate.toISOString()} path={`/b/${r.shareToken}`} /></div></td>
                  </tr>
                ))}
                <tr className="font-bold"><td className="py-2" colSpan={5}>Total balance due (all {b.open.length})</td><td className="py-2 text-right text-red-600 dark:text-red-400">{rs(b.totals.balancePaise)}</td></tr>
              </tbody>
            </table>
          </div>
          <ReportPager pg={pg} paged={paged} />
          </>
        )}
      </Panel>

      {b.customers.length > 1 && (
        <Panel title="By customer">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {b.customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/caterer/customers/${c.id}`} className="min-w-0 hover:text-amber-600"><span className="font-medium text-zinc-900 dark:text-zinc-50">{c.name}</span><span className="ml-2 text-xs text-zinc-400">{c.invoices} invoice{c.invoices === 1 ? "" : "s"}</span></Link>
                <span className="font-semibold text-red-600 dark:text-red-400">{rs(c.balancePaise)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {suppliers.length > 0 && (
        <Panel title="Supplier bills not fully paid">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {suppliers.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/caterer/purchases/${p.id}`} className="min-w-0 hover:text-amber-600"><span className="font-medium text-zinc-900 dark:text-zinc-50">{p.supplier}</span><span className="ml-2 text-xs text-zinc-400">{p.category} · {formatInvoiceDate(p.date)}</span></Link>
                <span className="font-semibold text-red-600 dark:text-red-400">{rs(p.duePaise)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

async function AnalyticsTab({ catererId, from, to, label, pg }: { catererId: string; from: Date; to: Date; label: string; pg: ReportPaging }) {
  const a = await analyticsInRange(catererId, from, to);
  if (a.functions === 0) return <Panel title={`Items & analytics · ${label}`}><p className="text-sm text-zinc-400 py-2">No functions in this period.</p></Panel>;

  const byRevenue = [...a.items].sort((x, y) => y.amountPaise - x.amountPaise);
  const itemsPage = pageOf(byRevenue, pg);
  const byUse = [...a.items].sort((x, y) => y.functions - x.functions || y.amountPaise - x.amountPaise).slice(0, 8);
  const maxGroup = Math.max(1, ...a.groups.map((g) => g.amountPaise));
  const maxDay = Math.max(1, ...a.weekdays.map((d) => d.billedPaise));
  const sortedProfit = [...a.functionsProfit].sort((x, y) => y.profitPaise - x.profitPaise);
  const withCost = sortedProfit.filter((f) => f.costPaise > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ["Functions", String(a.functions)],
          ["Billed", rs(a.billedPaise)],
          ["Average per function", rs(a.avgPerFunctionPaise)],
          ["Guests served", a.guests > 0 ? a.guests.toLocaleString("en-IN") : "—"],
          ["Different items used", String(a.distinctItems)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"><div className="text-xs text-zinc-500">{k}</div><div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{v}</div></div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Where the billing came from">
          <div className="space-y-3">
            {a.groups.map((g) => (
              <div key={g.group} className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-zinc-700 dark:text-zinc-300">{GROUP_LABEL[g.group as ItemGroupKey] ?? g.group}</span><span><span className="font-semibold text-zinc-900 dark:text-zinc-50">{rs(g.amountPaise)}</span><span className="ml-2 text-xs text-zinc-400">{Math.round((g.amountPaise / Math.max(1, a.billedPaise)) * 100)}%</span></span></div>
                <Bar pct={(g.amountPaise / maxGroup) * 100} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Busiest days of the week">
          <div className="space-y-2.5">
            {a.weekdays.map((d) => (
              <div key={d.day} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-zinc-500">{d.day}</span>
                <div className="flex-1"><Bar pct={(d.billedPaise / maxDay) * 100} tone="sky" /></div>
                <span className="w-24 text-right text-xs text-zinc-500">{d.count} function{d.count === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title={`Items used · ${label}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500">
              <tr><th className="py-2 text-left">Item</th><th className="py-2 text-right">Quantity</th><th className="py-2 text-right">Used in</th><th className="py-2 text-right">Avg rate</th><th className="py-2 text-right">Billed</th><th className="py-2 text-right">Share</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {itemsPage.rows.map((r) => (
                <tr key={`${r.name}|${r.unit}`}>
                  <td className="py-2">{r.name}<span className="ml-2 text-xs text-zinc-400">{GROUP_LABEL[r.group as ItemGroupKey]?.toLowerCase() ?? r.group}</span></td>
                  <td className="py-2 text-right text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{r.quantity.toLocaleString("en-IN")} {r.unit}</td>
                  <td className="py-2 text-right text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{r.functions} of {a.functions}</td>
                  <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{rs(r.avgRatePaise)}</td>
                  <td className="py-2 text-right font-medium">{rs(r.amountPaise)}</td>
                  <td className="py-2 text-right text-xs text-zinc-400">{Math.round((r.amountPaise / Math.max(1, a.billedPaise)) * 100)}%</td>
                </tr>
              ))}
              <tr className="font-bold"><td className="py-2" colSpan={4}>Total · {a.distinctItems} items · {a.lineCount} lines</td><td className="py-2 text-right">{rs(byRevenue.reduce((s, r) => s + r.amountPaise, 0))}</td><td /></tr>
            </tbody>
          </table>
        </div>
        <ReportPager pg={pg} paged={itemsPage} />
        <p className="mt-3 text-xs text-zinc-400">Item amounts include any discount you gave, so they add up to what you actually billed. Quantities stay in each item&apos;s own unit.</p>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Most often used">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {byUse.map((r) => (
              <div key={`${r.name}|${r.unit}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="truncate text-zinc-800 dark:text-zinc-200">{r.name}</span>
                <span className="shrink-0 text-xs text-zinc-500">in {r.functions} of {a.functions} function{a.functions === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Best customers">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {a.customers.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/caterer/customers/${c.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-amber-600">
                <span className="truncate text-zinc-800 dark:text-zinc-200">{c.name}<span className="ml-2 text-xs text-zinc-400">{c.functions} function{c.functions === 1 ? "" : "s"}</span></span>
                <span className="shrink-0 font-medium">{rs(c.billedPaise)}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {withCost.length > 0 && (
        <Panel title="Profit by function (billed − purchases and team pay tied to it)">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {withCost.slice(0, 10).map((f) => (
              <Link key={f.id} href={`/caterer/orders/${f.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-amber-600">
                <span className="min-w-0 truncate">{f.customer}<span className="ml-2 text-xs text-zinc-400">{formatInvoiceDate(f.date)} · billed {rs(f.billedPaise)} · costs {rs(f.costPaise)}</span></span>
                <span className={cn("shrink-0 font-semibold", f.profitPaise < 0 ? "text-red-600" : "text-emerald-600")}>{rs(f.profitPaise)}</span>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-400">Only functions with purchases or team pay tied to them are shown. Choose the function when you record a purchase, and add the team on the order, to include them.</p>
        </Panel>
      )}
    </div>
  );
}

async function CashTab({ catererId, orgId, from, to, label }: { catererId: string; orgId: string; from: Date; to: Date; label: string }) {
  const rows = await cashBook(catererId, orgId, from, to);
  const sum = (k: "openingPaise" | "inPaise" | "outPaise" | "closingPaise") => rows.reduce((s, r) => s + r[k], 0);
  return (
    <Panel title={`Cash & Bank book · ${label}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr><th className="py-2 text-left">Account</th><th className="py-2 text-right">Opening</th><th className="py-2 text-right">Money in</th><th className="py-2 text-right">Money out</th><th className="py-2 text-right">Closing</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.method}>
                <td className="py-2 font-medium">{METHOD_LABEL[r.method]}</td>
                <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{rs(r.openingPaise)}</td>
                <td className="py-2 text-right text-emerald-600 dark:text-emerald-400">{rs(r.inPaise)}</td>
                <td className="py-2 text-right text-rose-600 dark:text-rose-400">{rs(r.outPaise)}</td>
                <td className={cn("py-2 text-right font-semibold", r.closingPaise < 0 && "text-red-600")}>{rs(r.closingPaise)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-2">Total</td><td className="py-2 text-right">{rs(sum("openingPaise"))}</td><td className="py-2 text-right">{rs(sum("inPaise"))}</td><td className="py-2 text-right">{rs(sum("outPaise"))}</td><td className="py-2 text-right">{rs(sum("closingPaise"))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-zinc-400">Receipts from customers, payments to suppliers and staff pay use the way they were paid. Everyday expenses don&apos;t record how they were paid, so they are taken from cash.</p>
    </Panel>
  );
}
