import Link from "next/link";
import { GROUP_LABEL, type ItemGroupKey } from "@/lib/caterer-items";
import { BILL_LABEL, formatInvoiceDate, rs } from "@/lib/caterer-orders";
import { PAY_LABEL, type PayTypeKey } from "@/lib/caterer-staff";
import { agingReport, costReport, customerInsights, functionsReport, overviewData, pct, salesTrend, staffReport } from "@/lib/caterer-insights";
import { CatererBars } from "@/components/caterer-bars";
import { Bar, Panel, Stat } from "@/components/caterer-report-ui";
import { ReportPager, pageOf, type ReportPaging } from "@/components/caterer-report-pager";
import { cn } from "@/lib/utils";

type Rng = { catererId: string; orgId: string; from: Date; to: Date; label: string; pg?: ReportPaging };

const TONE = {
  good: "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200",
  warn: "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200",
  info: "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300",
};
const ICON = { good: "✓", warn: "!", info: "i" };

export async function OverviewTab({ catererId, orgId, from, to, label }: Rng) {
  const o = await overviewData(catererId, orgId, from, to);
  const n = o.now;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Billed" value={rs(n.billed)} delta={o.delta.billed} sub={`Food ${rs(n.food)} · Service ${rs(n.service)}`} />
        <Stat label="Functions" value={String(n.functions)} delta={o.delta.functions} sub={`avg ${rs(n.avgPerFunction)}`} />
        <Stat label="Money collected" value={rs(n.collected)} delta={o.delta.collected} sub={`${n.collectionRate}% of billed received`} tone="good" />
        <Stat label="Balance due" value={n.balance > 0 ? rs(n.balance) : "Nil"} sub="on these invoices" tone={n.balance > 0 ? "warn" : undefined} />
        <Stat label="Costs" value={rs(n.costs)} delta={o.delta.costs} goodWhenUp={false} sub="expenses, purchases, staff" />
        <Stat label="Profit" value={rs(n.profit)} delta={o.delta.profit} sub={n.billed > 0 ? `${n.margin}% margin` : undefined} tone={n.profit < 0 ? "bad" : undefined} />
        <Stat label="Paid out" value={rs(n.paidOut)} sub="cash that has gone out" />
        <Stat label="Cash profit" value={rs(n.collected - n.paidOut)} sub="collected − paid out" tone={n.collected - n.paidOut < 0 ? "bad" : undefined} />
      </div>

      <Panel title={`How it is going · ${label}`} hint={`Compared with the ${o.prev.days} days just before.`}>
        {o.insights.length === 0 ? <p className="text-sm text-zinc-400 py-2">Not enough activity in this period to say much yet.</p> : (
          <ul className="space-y-2">
            {o.insights.map((i, k) => (
              <li key={k} className={cn("flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm", TONE[i.tone])}>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-[11px] font-bold">{ICON[i.tone]}</span>
                <span>{i.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Last 12 months: billed vs costs"><CatererBars data={o.trend} /></Panel>
    </div>
  );
}

export async function SalesTab({ catererId, from, to, label }: Omit<Rng, "orgId">) {
  const s = await salesTrend(catererId, from, to);
  if (s.functions === 0) return <Panel title={`Sales · ${label}`}><p className="text-sm text-zinc-400 py-2">No functions in this period.</p></Panel>;
  const maxM = Math.max(1, ...s.months.map((m) => m.billedPaise));
  const maxT = Math.max(1, ...s.types.map((t) => t.billedPaise));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Functions" value={String(s.functions)} />
        <Stat label="Billed" value={rs(s.billedPaise)} />
        <Stat label="Guests served" value={s.guests ? s.guests.toLocaleString("en-IN") : "—"} sub={s.guests ? `${Math.round(s.guests / s.functions)} per function` : "add guest counts to see this"} />
        <Stat label="Billed per guest" value={s.perGuestPaise ? rs(s.perGuestPaise) : "—"} />
      </div>
      <Panel title="Month by month">
        <div className="space-y-2.5">
          {s.months.map((m) => (
            <div key={m.label} className="flex items-center gap-3 text-sm">
              <span className="w-20 text-zinc-500 shrink-0">{m.label}</span>
              <div className="flex-1"><Bar pct={(m.billedPaise / maxM) * 100} /></div>
              <span className="w-24 text-right font-medium">{rs(m.billedPaise)}</span>
              <span className="w-20 text-right text-xs text-zinc-400">{m.functions} function{m.functions === 1 ? "" : "s"}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="By type of event">
          <div className="space-y-3">
            {s.types.map((t) => (
              <div key={t.type} className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-zinc-700 dark:text-zinc-300">{t.type}</span><span className="font-semibold">{rs(t.billedPaise)}<span className="ml-2 text-xs font-normal text-zinc-400">{pct(t.billedPaise, s.billedPaise)}%</span></span></div>
                <Bar pct={(t.billedPaise / maxT) * 100} tone="violet" />
                <div className="text-[11px] text-zinc-400">{t.functions} function{t.functions === 1 ? "" : "s"} · average {rs(Math.round(t.billedPaise / t.functions))}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Where your functions are">
          {s.places.length === 0 ? <p className="text-sm text-zinc-400 py-2">Add the place on an order to see this.</p> : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {s.places.map((p) => (
                <div key={p.place} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="truncate text-zinc-800 dark:text-zinc-200">{p.place}<span className="ml-2 text-xs text-zinc-400">{p.functions} function{p.functions === 1 ? "" : "s"}</span></span><span className="font-medium shrink-0">{rs(p.billedPaise)}</span></div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

export async function CustomersTab({ catererId, from, to, label, pg }: Omit<Rng, "orgId">) {
  const c = await customerInsights(catererId, from, to);
  const paged = pg ? pageOf(c.customers, pg) : null;
  const custRows = paged ? paged.rows : c.customers;
  if (c.count === 0) return <Panel title={`Customers · ${label}`}><p className="text-sm text-zinc-400 py-2">No functions in this period.</p></Panel>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Customers served" value={String(c.count)} sub={`${c.avgFunctions} functions each on average`} />
        <Stat label="New customers" value={String(c.newCount)} sub="first function in this period" tone="good" />
        <Stat label="Returning customers" value={String(c.returningCount)} sub="had a function before" />
        <Stat label="Top 5 customers" value={`${c.top5Share}%`} sub="of billing in this period" tone={c.top5Share > 60 ? "warn" : undefined} />
      </div>
      <Panel title={`Customers by billing · ${label}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500"><tr><th className="py-2 text-left">Customer</th><th className="py-2 text-right">Functions</th><th className="py-2 text-right">Billed</th><th className="py-2 text-right">Share</th><th className="py-2 text-right">Balance</th></tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {custRows.map((x) => (
                <tr key={x.id}>
                  <td className="py-2"><Link href={`/caterer/customers/${x.id}`} className="font-medium text-zinc-900 dark:text-zinc-50 hover:text-amber-600">{x.name}</Link>{x.repeat && <span className="ml-2 rounded-full bg-sky-100 dark:bg-sky-950/40 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400">returning</span>}<a href={`tel:${x.phone}`} className="block text-xs text-zinc-400 hover:text-amber-600">{x.phone}</a></td>
                  <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{x.functions}</td>
                  <td className="py-2 text-right font-medium">{rs(x.billedPaise)}</td>
                  <td className="py-2 text-right text-xs text-zinc-400">{pct(x.billedPaise, c.total)}%</td>
                  <td className="py-2 text-right">{x.balancePaise > 0 ? <span className="font-semibold text-red-600 dark:text-red-400">{rs(x.balancePaise)}</span> : <span className="text-xs text-zinc-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pg && paged && <ReportPager pg={pg} paged={paged} />}
        <p className="mt-3 text-xs text-zinc-400">Returning means the customer had a function with you before this period. Repeat customers brought in {rs(c.repeatBilledPaise)} ({pct(c.repeatBilledPaise, c.total)}% of billing).</p>
      </Panel>
    </div>
  );
}

export async function FunctionsTab({ catererId, from, to, label, pg }: Omit<Rng, "orgId">) {
  const rows = await functionsReport(catererId, from, to);
  const paged = pg ? pageOf(rows, pg) : null;
  if (rows.length === 0) return <Panel title={`Functions · ${label}`}><p className="text-sm text-zinc-400 py-2">No functions in this period.</p></Panel>;
  const tracked = rows.filter((r) => r.tracked);
  const billed = rows.reduce((s, r) => s + r.billedPaise, 0);
  const costs = tracked.reduce((s, r) => s + r.costPaise, 0);
  const trackedBilled = tracked.reduce((s, r) => s + r.billedPaise, 0);
  const best = [...tracked].sort((a, b) => b.profitPaise - a.profitPaise)[0];
  const worst = [...tracked].sort((a, b) => a.profitPaise - b.profitPaise)[0];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Functions" value={String(rows.length)} sub={`${tracked.length} with costs recorded`} />
        <Stat label="Billed" value={rs(billed)} />
        <Stat label="Profit on tracked functions" value={tracked.length ? rs(trackedBilled - costs) : "—"} sub={tracked.length ? `${pct(trackedBilled - costs, trackedBilled)}% margin` : "tie purchases and team pay to functions"} tone={tracked.length && trackedBilled - costs < 0 ? "bad" : undefined} />
        <Stat label="Best / weakest" value={best ? `${pct(best.profitPaise, best.billedPaise)}%` : "—"} sub={worst && worst !== best ? `weakest ${pct(worst.profitPaise, worst.billedPaise)}%` : undefined} />
      </div>
      <Panel title={`Every function · ${label}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500"><tr><th className="py-2 text-left">Function</th><th className="py-2 text-right">Guests</th><th className="py-2 text-right">Billed</th><th className="py-2 text-right">Costs</th><th className="py-2 text-right">Profit</th><th className="py-2 text-right">Balance</th></tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(paged ? paged.rows : rows).map((r) => (
                <tr key={r.id}>
                  <td className="py-2"><Link href={`/caterer/orders/${r.id}`} className="font-medium text-zinc-900 dark:text-zinc-50 hover:text-amber-600">{r.customer}</Link><span className="block text-xs text-zinc-400">{formatInvoiceDate(r.date)}{r.eventType ? ` · ${r.eventType}` : ""}{r.place ? ` · ${r.place}` : ""}</span></td>
                  <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{r.guests || "—"}</td>
                  <td className="py-2 text-right font-medium">{rs(r.billedPaise)}</td>
                  <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{r.tracked ? rs(r.costPaise) : <span className="text-xs text-zinc-300">not tracked</span>}</td>
                  <td className="py-2 text-right">{r.tracked ? <span className={cn("font-semibold", r.profitPaise < 0 ? "text-red-600" : "text-emerald-600")}>{rs(r.profitPaise)}<span className="block text-[11px] font-normal text-zinc-400">{r.marginPct}%</span></span> : "—"}</td>
                  <td className="py-2 text-right">{r.balancePaise > 0 ? <span className="font-semibold text-red-600 dark:text-red-400">{rs(r.balancePaise)}</span> : <span className="text-xs text-zinc-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pg && paged && <ReportPager pg={pg} paged={paged} />}
        <p className="mt-3 text-xs text-zinc-400">Costs are purchases tied to the function plus the pay you set for its team. Functions without any show &ldquo;not tracked&rdquo; so a missing cost never looks like free profit.</p>
      </Panel>
    </div>
  );
}

export async function CostsTab({ catererId, orgId, from, to, label }: Rng) {
  const c = await costReport(catererId, orgId, from, to);
  if (c.total === 0) return <Panel title={`Costs · ${label}`}><p className="text-sm text-zinc-400 py-2">No expenses, purchases or staff pay recorded in this period.</p></Panel>;
  const maxCat = Math.max(1, ...c.byCategory.map((x) => x.totalPaise));
  const maxSup = Math.max(1, ...c.suppliers.map((x) => x.totalPaise));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total costs" value={rs(c.total)} sub={`${c.costPct}% of billing`} />
        <Stat label="Purchases" value={rs(c.purchaseTotal)} sub="from suppliers" />
        <Stat label="Food ingredients" value={c.foodBilledPaise > 0 ? `${c.foodCostPct}%` : "—"} sub={c.foodBilledPaise > 0 ? `of food billing (${rs(c.foodCostPaise)})` : "no food billing"} tone={c.foodCostPct > 45 ? "warn" : undefined} />
        <Stat label="Cost per guest" value={c.perGuestPaise ? rs(c.perGuestPaise) : "—"} sub={c.guests ? `${c.guests.toLocaleString("en-IN")} guests` : "add guest counts"} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Where the money went">
          <div className="space-y-3">
            {c.byCategory.map((x) => (
              <div key={x.category} className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-zinc-700 dark:text-zinc-300">{x.category}</span><span className="font-semibold">{rs(x.totalPaise)}<span className="ml-2 text-xs font-normal text-zinc-400">{pct(x.totalPaise, c.total)}%</span></span></div>
                <Bar pct={(x.totalPaise / maxCat) * 100} tone="rose" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Suppliers, biggest first">
          {c.suppliers.length === 0 ? <p className="text-sm text-zinc-400 py-2">No purchases in this period.</p> : (
            <div className="space-y-3">
              {c.suppliers.slice(0, 10).map((s) => (
                <div key={s.name} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="truncate text-zinc-700 dark:text-zinc-300">{s.name}<span className="ml-2 text-xs text-zinc-400">{s.category} · {s.bills} bill{s.bills === 1 ? "" : "s"}</span></span><span className="font-semibold shrink-0">{rs(s.totalPaise)}</span></div>
                  <Bar pct={(s.totalPaise / maxSup) * 100} tone="violet" />
                  {s.totalPaise > s.paidPaise && <div className="text-[11px] text-red-500">{rs(s.totalPaise - s.paidPaise)} still to pay</div>}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <p className="text-xs text-zinc-400">Costs include everyday expenses ({rs(c.expenseTotal)}), purchases ({rs(c.purchaseTotal)}) and staff pay ({rs(c.staffTotal)}). Ingredient cost counts meat, fish, chicken, vegetables and groceries.</p>
    </div>
  );
}

export async function StaffTab({ catererId, orgId, from, to, label }: Rng) {
  const s = await staffReport(catererId, orgId, from, to);
  if (s.rows.length === 0) return <Panel title={`Staff · ${label}`}><p className="text-sm text-zinc-400 py-2">No staff pay recorded and nobody on a function in this period.</p></Panel>;
  const max = Math.max(1, ...s.rows.map((r) => r.paidPaise));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Paid to staff" value={rs(s.paidPaise)} sub={`${s.rows.filter((r) => r.paidPaise > 0).length} people`} />
        <Stat label="Share of billing" value={s.billedPaise > 0 ? `${s.shareOfBilling}%` : "—"} sub="staff pay ÷ billed" tone={s.shareOfBilling > 35 ? "warn" : undefined} />
        {s.byType.filter((t) => t.paidPaise > 0).map((t) => <Stat key={t.type} label={PAY_LABEL[t.type as PayTypeKey]} value={rs(t.paidPaise)} sub={`${t.people} ${t.people === 1 ? "person" : "people"}`} />)}
      </div>
      <Panel title={`Pay by person · ${label}`}>
        <div className="space-y-3">
          {s.rows.map((r) => (
            <div key={r.id} className="space-y-1">
              <div className="flex justify-between text-sm gap-3">
                <Link href={`/caterer/staff/${r.id}`} className="min-w-0 truncate hover:text-amber-600"><span className="font-medium text-zinc-900 dark:text-zinc-50">{r.name}</span><span className="ml-2 text-xs text-zinc-400">{r.role} · {PAY_LABEL[r.payType as PayTypeKey]}</span></Link>
                <span className="font-semibold shrink-0">{rs(r.paidPaise)}</span>
              </div>
              <Bar pct={(r.paidPaise / max) * 100} tone="emerald" />
              <div className="text-[11px] text-zinc-400">{r.functions > 0 ? `${r.functions} function${r.functions === 1 ? "" : "s"} · agreed ${rs(r.agreedPaise)}` : ""}{r.advancePaise > 0 ? `${r.functions > 0 ? " · " : ""}advances ${rs(r.advancePaise)}` : ""}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export async function AgingTab({ catererId, pg }: { catererId: string; pg?: ReportPaging }) {
  const a = await agingReport(catererId);
  const paged = pg ? pageOf(a.owing, pg) : null;
  const maxR = Math.max(1, ...a.receivable.map((b) => b.paise));
  const maxP = Math.max(1, ...a.payable.map((b) => b.paise));
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">As of today. Shows how long money has been waiting, counted from the function date for customers and from the bill date for suppliers.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Customers owe you">
          <div className="space-y-3">
            {a.receivable.map((b) => (
              <div key={b.key} className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-zinc-700 dark:text-zinc-300">{b.label}<span className="ml-2 text-xs text-zinc-400">{b.count} invoice{b.count === 1 ? "" : "s"}</span></span><span className={cn("font-semibold", b.paise > 0 && (b.key === "d61_90" || b.key === "d90") && "text-red-600 dark:text-red-400")}>{rs(b.paise)}</span></div>
                <Bar pct={(b.paise / maxR) * 100} tone={b.key === "d61_90" || b.key === "d90" ? "rose" : "amber"} />
              </div>
            ))}
            <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm font-bold"><span>Total</span><span>{rs(a.receivableTotal)}</span></div>
          </div>
        </Panel>
        <Panel title="You owe suppliers">
          <div className="space-y-3">
            {a.payable.map((b) => (
              <div key={b.key} className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-zinc-700 dark:text-zinc-300">{b.label}<span className="ml-2 text-xs text-zinc-400">{b.count} bill{b.count === 1 ? "" : "s"}</span></span><span className={cn("font-semibold", b.paise > 0 && (b.key === "d61_90" || b.key === "d90") && "text-red-600 dark:text-red-400")}>{rs(b.paise)}</span></div>
                <Bar pct={(b.paise / maxP) * 100} tone={b.key === "d61_90" || b.key === "d90" ? "rose" : "violet"} />
              </div>
            ))}
            <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm font-bold"><span>Total</span><span>{rs(a.payableTotal)}</span></div>
          </div>
        </Panel>
      </div>

      {a.owed.length > 0 && (
        <Panel title="Oldest unpaid supplier bills first">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {a.owed.slice(0, 25).map((p) => (
              <Link key={p.id} href={`/caterer/purchases/${p.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-amber-600">
                <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-50">{p.supplier}<span className="ml-2 text-xs font-normal text-zinc-400">{formatInvoiceDate(p.date)}</span></span>
                <span className="flex items-center gap-3 shrink-0"><span className={cn("text-xs", p.days > 60 ? "font-semibold text-red-600" : "text-zinc-500")}>{p.days} days</span><span className="font-semibold text-red-600 dark:text-red-400">{rs(p.duePaise)}</span></span>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      {a.owing.length > 0 && (
        <Panel title="Oldest unpaid invoices first">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500"><tr><th className="py-2 text-left">Invoice</th><th className="py-2 text-left">Customer</th><th className="py-2 text-left">Function</th><th className="py-2 text-right">Waiting</th><th className="py-2 text-right">Balance</th></tr></thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(paged ? paged.rows : a.owing.slice(0, 25)).map((r) => (
                  <tr key={`${r.orderId}-${r.number}`}>
                    <td className="py-2 whitespace-nowrap"><Link href={`/caterer/orders/${r.orderId}`} className="font-medium hover:text-amber-600">#{r.number}</Link><span className="block text-xs text-zinc-400">{BILL_LABEL[r.type as "FOOD" | "SERVICE"]}</span></td>
                    <td className="py-2"><Link href={`/caterer/customers/${r.customer.id}`} className="hover:text-amber-600">{r.customer.name}</Link><a href={`tel:${r.customer.phone}`} className="block text-xs text-zinc-400 hover:text-amber-600">{r.customer.phone}</a></td>
                    <td className="py-2 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{formatInvoiceDate(r.functionDate)}</td>
                    <td className="py-2 text-right whitespace-nowrap">{r.days < 0 ? <span className="text-xs text-zinc-400">in {-r.days} days</span> : <span className={cn(r.days > 60 && "font-semibold text-red-600")}>{r.days} days</span>}</td>
                    <td className="py-2 text-right font-semibold text-red-600 dark:text-red-400">{rs(r.balancePaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pg && paged && <ReportPager pg={pg} paged={paged} />}
        </Panel>
      )}
    </div>
  );
}

export { GROUP_LABEL, type ItemGroupKey };
