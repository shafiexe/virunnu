import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { getSession } from "@/lib/session";
import { payoutBalances } from "@/lib/commission";
import { db } from "@/lib/db";
import { monthReport, parseMonth, shiftMonth } from "@/lib/owner-month-report";
import { formatRupees } from "@/lib/gst";
import { PrintButton } from "@/components/print-button";
import { cn } from "@/lib/utils";

const rs = (p: number) => (p < 0 ? `−₹${formatRupees(-p)}` : `₹${formatRupees(p)}`);
const dmy = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const TH = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 whitespace-nowrap";
const TD = "px-3 py-2 whitespace-nowrap";
const NUM = "text-right tabular-nums";

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", tone === "good" && "text-emerald-600 dark:text-emerald-400", tone === "bad" && "text-red-600 dark:text-red-400", !tone && "text-zinc-900 dark:text-zinc-50")}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{sub}</p>}
    </div>
  );
}

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="space-y-2 break-inside-avoid">
    <div><h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>{hint && <p className="text-xs text-zinc-500">{hint}</p>}</div>
    {children}
  </section>
);
const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><table className="w-full text-sm">{children}</table></div>
);

export default async function OwnerReportsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");

  const r = await monthReport(session.orgId, parseMonth((await searchParams).month).key);
  const [bal, payouts] = await Promise.all([payoutBalances([session.orgId]), db.payout.findMany({ where: { orgId: session.orgId }, orderBy: { paidOn: "desc" }, take: 6 })]);
  const money = bal.get(session.orgId) ?? { onlinePaise: 0, commissionPaise: 0, paidOutPaise: 0, owedPaise: 0 };
  const { period: p, summary: s } = r;
  const prev = shiftMonth(p.key, -1);
  const next = shiftMonth(p.key, 1);
  const yearTotal = r.year.reduce((t, y) => ({ billed: t.billed + y.billedPaise, gst: t.gst + y.gstPaise, received: t.received + y.receivedPaise, expenses: t.expenses + y.expensesPaise, profit: t.profit + y.profitPaise }), { billed: 0, gst: 0, received: 0, expenses: 0, profit: 0 });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <style>{`@media print { header, aside, footer, nav, .no-print { display: none !important; } body > div, main { padding: 0 !important; } }`}</style>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Reports</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Month-end summary for your accountant. Every figure is added up from your bookings, recorded payments and expenses.</p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            <Link href={`/owner/reports?month=${prev}`} aria-label="Previous month" className="p-2.5 text-zinc-500 hover:text-zinc-900"><ChevronLeft className="h-4 w-4" /></Link>
            <span className="min-w-32 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">{p.label}</span>
            <Link href={`/owner/reports?month=${next}`} aria-label="Next month" className="p-2.5 text-zinc-500 hover:text-zinc-900"><ChevronRight className="h-4 w-4" /></Link>
          </div>
          <a href={`/api/owner/reports/export?month=${p.key}`} download className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-semibold text-zinc-900"><FileSpreadsheet className="h-4 w-4" /> Excel</a>
          <PrintButton />
        </div>
      </div>

      <div className="hidden print:block text-sm text-zinc-600">Report for {p.label}</div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card label="Billed (after discount)" value={rs(s.billedPaise)} sub={`${s.count} booking${s.count === 1 ? "" : "s"} for events this month`} />
        <Card label={r.gstOn ? "GST inside it" : "GST"} value={r.gstOn ? rs(s.gstPaise) : "Not charged"} sub={r.gstOn ? `CGST ${rs(s.cgstPaise)} · SGST ${rs(s.sgstPaise)}` : "GST is switched off for your venue"} />
        <Card label="Received" value={rs(s.receivedPaise)} sub={s.refundsPaise ? `after ${rs(s.refundsPaise)} refunded` : "payments recorded this month"} />
        <Card label="Expenses" value={rs(s.expensesPaise)} sub={`${r.expenses.length} entr${r.expenses.length === 1 ? "y" : "ies"}`} />
        <Card label="Profit (received − expenses)" value={rs(s.profitCashPaise)} tone={s.profitCashPaise >= 0 ? "good" : "bad"} sub={`Billed before GST − expenses: ${rs(s.basePaise - s.expensesPaise)}`} />
      </div>

      <Section title={`Month by month, ${p.year}`} hint="Billed is for events held that month; received and expenses are by the date they were recorded.">
        <Table>
          <thead className="bg-zinc-50 dark:bg-zinc-800/50"><tr><th className={TH}>Month</th><th className={`${TH} ${NUM}`}>Billed</th>{r.gstOn && <th className={`${TH} ${NUM}`}>GST</th>}<th className={`${TH} ${NUM}`}>Received</th><th className={`${TH} ${NUM}`}>Expenses</th><th className={`${TH} ${NUM}`}>Profit</th></tr></thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {r.year.map((y) => (
              <tr key={y.month} className={cn(y.month === p.month && "bg-amber-50/70 dark:bg-amber-950/20 font-semibold")}>
                <td className={TD}><Link href={`/owner/reports?month=${p.year}-${String(y.month).padStart(2, "0")}`} className="hover:text-amber-600">{y.label}</Link></td>
                <td className={`${TD} ${NUM}`}>{rs(y.billedPaise)}</td>{r.gstOn && <td className={`${TD} ${NUM}`}>{rs(y.gstPaise)}</td>}
                <td className={`${TD} ${NUM}`}>{rs(y.receivedPaise)}</td><td className={`${TD} ${NUM}`}>{rs(y.expensesPaise)}</td>
                <td className={`${TD} ${NUM} ${y.profitPaise < 0 ? "text-red-600" : ""}`}>{rs(y.profitPaise)}</td>
              </tr>
            ))}
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 font-bold"><td className={TD}>Year</td><td className={`${TD} ${NUM}`}>{rs(yearTotal.billed)}</td>{r.gstOn && <td className={`${TD} ${NUM}`}>{rs(yearTotal.gst)}</td>}<td className={`${TD} ${NUM}`}>{rs(yearTotal.received)}</td><td className={`${TD} ${NUM}`}>{rs(yearTotal.expenses)}</td><td className={`${TD} ${NUM}`}>{rs(yearTotal.profit)}</td></tr>
          </tbody>
        </Table>
      </Section>

      <Section title="Sales" hint={`Bookings for events held in ${p.label}, not cancelled. Amounts include GST.`}>
        {r.sales.length === 0 ? <p className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center text-sm text-zinc-500">No bookings for events in {p.label}.</p> : (
          <Table>
            <thead className="bg-zinc-50 dark:bg-zinc-800/50"><tr><th className={TH}>Event date</th><th className={TH}>Customer</th><th className={TH}>Hall / slot</th><th className={`${TH} ${NUM}`}>Total</th><th className={`${TH} ${NUM}`}>Discount</th><th className={`${TH} ${NUM}`}>Billed</th>{r.gstOn && <><th className={`${TH} ${NUM}`}>Before GST</th><th className={`${TH} ${NUM}`}>CGST</th><th className={`${TH} ${NUM}`}>SGST</th></>}<th className={`${TH} ${NUM}`}>Received</th><th className={`${TH} ${NUM}`}>Balance</th></tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {r.sales.map((x) => (
                <tr key={x.bookingId}>
                  <td className={TD}>{dmy(x.eventDate)}</td>
                  <td className={TD}><Link href={`/owner/bookings/${x.bookingId}`} className="hover:text-amber-600">{x.customer}</Link></td>
                  <td className={`${TD} text-zinc-500`}>{x.hall} · {x.slot}</td>
                  <td className={`${TD} ${NUM}`}>{rs(x.grossPaise)}</td><td className={`${TD} ${NUM}`}>{x.discountPaise ? rs(x.discountPaise) : "—"}</td><td className={`${TD} ${NUM} font-semibold`}>{rs(x.netPaise)}</td>
                  {r.gstOn && <><td className={`${TD} ${NUM}`}>{rs(x.basePaise)}</td><td className={`${TD} ${NUM}`}>{rs(x.cgstPaise)}</td><td className={`${TD} ${NUM}`}>{rs(x.sgstPaise)}</td></>}
                  <td className={`${TD} ${NUM}`}>{rs(x.receivedPaise)}</td><td className={`${TD} ${NUM} ${x.balancePaise > 0 ? "text-red-600" : ""}`}>{x.balancePaise > 0 ? rs(x.balancePaise) : "Nil"}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 font-bold"><td className={TD} colSpan={3}>Total</td><td className={`${TD} ${NUM}`}>{rs(r.sales.reduce((t, x) => t + x.grossPaise, 0))}</td><td className={`${TD} ${NUM}`}>{rs(s.discountPaise)}</td><td className={`${TD} ${NUM}`}>{rs(s.billedPaise)}</td>{r.gstOn && <><td className={`${TD} ${NUM}`}>{rs(s.basePaise)}</td><td className={`${TD} ${NUM}`}>{rs(s.cgstPaise)}</td><td className={`${TD} ${NUM}`}>{rs(s.sgstPaise)}</td></>}<td className={`${TD} ${NUM}`}>{rs(r.sales.reduce((t, x) => t + x.receivedPaise, 0))}</td><td className={`${TD} ${NUM}`}>{rs(s.balancePaise)}</td></tr>
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="Money received" hint={`Payments recorded in ${p.label}, for any event.`}>
        {r.receipts.length === 0 ? <p className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center text-sm text-zinc-500">No payments recorded in {p.label}.</p> : (
          <>
            <div className="flex flex-wrap gap-2">{r.methods.map((m) => <span key={m.method} className="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm"><span className="text-zinc-500">{m.method}</span> <strong className="tabular-nums">{rs(m.amountPaise)}</strong></span>)}{s.refundsPaise > 0 && <span className="rounded-xl bg-red-50 dark:bg-red-950/20 px-3 py-1.5 text-sm text-red-700 dark:text-red-400">Refunded <strong className="tabular-nums">−{rs(s.refundsPaise)}</strong></span>}</div>
            <Table>
              <thead className="bg-zinc-50 dark:bg-zinc-800/50"><tr><th className={TH}>Date</th><th className={TH}>Customer</th><th className={TH}>Mode</th><th className={TH}>Note</th><th className={`${TH} ${NUM}`}>Amount</th></tr></thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{r.receipts.map((x, i) => <tr key={i}><td className={TD}>{dmy(x.date)}</td><td className={TD}>{x.customer}</td><td className={TD}>{x.method}</td><td className={`${TD} text-zinc-500`}>{x.note ?? ""}</td><td className={`${TD} ${NUM}`}>{rs(x.amountPaise)}</td></tr>)}</tbody>
            </Table>
          </>
        )}
      </Section>

      {(money.onlinePaise > 0 || payouts.length > 0) && (
        <Section title="Online payments and payouts" hint="Customers who pay on the website pay Virunnu, which keeps 1% and sends you the rest. All time, not just this month.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card label="Paid online" value={rs(money.onlinePaise)} />
            <Card label="Virunnu's 1%" value={rs(money.commissionPaise)} />
            <Card label="Sent to you" value={rs(money.paidOutPaise)} />
            <Card label="Still to come" value={rs(money.owedPaise)} tone={money.owedPaise > 0 ? "good" : undefined} />
          </div>
          {payouts.length > 0 && (
            <Table><thead><tr><th className={TH}>Date</th><th className={TH}>Reference</th><th className={cn(TH, "text-right")}>Amount</th></tr></thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{payouts.map((x) => (
                <tr key={x.id}><td className={TD}>{dmy(x.paidOn.toISOString().slice(0, 10))}</td><td className={TD}>{x.reference ?? ""}</td><td className={cn(TD, NUM)}>{rs(x.amountPaise)}</td></tr>
              ))}</tbody></Table>
          )}
        </Section>
      )}

      <Section title="Expenses" hint={`Everything recorded as an expense in ${p.label}, including salaries.`}>
        {r.expenses.length === 0 ? <p className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center text-sm text-zinc-500">No expenses recorded in {p.label}.</p> : (
          <>
            <div className="flex flex-wrap gap-2">{r.categories.map((c) => <span key={c.category} className="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm"><span className="text-zinc-500">{c.category}</span> <strong className="tabular-nums">{rs(c.amountPaise)}</strong></span>)}</div>
            <Table>
              <thead className="bg-zinc-50 dark:bg-zinc-800/50"><tr><th className={TH}>Date</th><th className={TH}>Category</th><th className={TH}>Name</th><th className={TH}>Notes</th><th className={`${TH} ${NUM}`}>Amount</th></tr></thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{r.expenses.map((x, i) => <tr key={i}><td className={TD}>{dmy(x.date)}</td><td className={TD}>{x.category}</td><td className={TD}>{x.label}</td><td className={`${TD} text-zinc-500`}>{x.notes ?? ""}</td><td className={`${TD} ${NUM}`}>{rs(x.amountPaise)}</td></tr>)}</tbody>
            </Table>
          </>
        )}
      </Section>
    </div>
  );
}
