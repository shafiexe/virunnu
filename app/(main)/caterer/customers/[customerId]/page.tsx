import { ShowS as Show } from "@/components/show-server";
import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ExternalLink, Phone, Plus } from "lucide-react";
import { getCatererForSession } from "@/lib/caterer-session";
import { loadStatement } from "@/lib/caterer-bills";
import { BILL_LABEL, billMoney, formatInvoiceDate, rs, STATE_LABEL } from "@/lib/caterer-orders";
import { BackToList } from "@/components/back-to-list";
import { CatererStatementShare } from "@/components/caterer-statement-share";
import { UrlPagination } from "@/components/url-pagination";
import { paginate, parsePaging } from "@/lib/paging";
import { QuickPay } from "@/components/caterer-quick-pay";
import { SendReminder } from "@/components/caterer-send-reminder";
import { cn } from "@/lib/utils";
import { WriteOnly, ReadOnlyShield } from "@/components/access-context";

const STATE_STYLE = {
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  PARTLY: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  UNPAID: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
} as const;

export default async function CatererCustomerPage({ params, searchParams }: { params: Promise<{ customerId: string }>; searchParams: Promise<{ page?: string; pageSize?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const { customerId } = await params;
  const sp = await searchParams;
  const customer = await loadStatement({ id: customerId, catererId: ctx.caterer.id });
  if (!customer) notFound();

  const rows = customer.orders
    .flatMap((o) => o.bills.map((b) => ({ ...b, orderId: o.id, functionDate: o.date, cancelled: o.status === "CANCELLED" })))
    .sort((a, b) => b.number - a.number);
  const live = rows.filter((r) => !r.cancelled);
  const totals = live.reduce((a, r) => { const m = billMoney(r); return { billed: a.billed + m.netPaise, received: a.received + r.receivedPaise, due: a.due + m.balancePaise }; }, { billed: 0, received: 0, due: 0 });
  const open = live.filter((r) => billMoney(r).balancePaise > 0);
  const closedCount = live.length - open.length;
  const closed = paginate(live.filter((r) => billMoney(r).balancePaise === 0), parsePaging(sp, 25));

  const table = (list: typeof rows, title: string, dim = false) =>
    list.length > 0 && (
      <section className="space-y-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{title} · {list.length}</h2>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 text-left">Invoice</th><th className="px-4 py-2.5 text-left">Function</th>
                <th className="px-4 py-2.5 text-right">Total</th><th className="px-4 py-2.5 text-right">Received</th>
                <th className="px-4 py-2.5 text-right">Balance</th><th className="px-4 py-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {list.map((r) => {
                const m = billMoney(r);
                return (
                  <tr key={r.id} className={cn("hover:bg-zinc-50 dark:hover:bg-zinc-800/40", dim && "opacity-80")}>
                    <td className="p-0">
                      <Link href={`/caterer/orders/${r.orderId}`} className="block px-4 py-2.5 hover:bg-amber-50/60 dark:hover:bg-amber-950/10">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-50">#{r.number}</span>
                        <span className="block text-xs text-zinc-500">{BILL_LABEL[r.type]} · {formatInvoiceDate(r.createdAt)}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{r.functionDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</td>
                    <td className="px-4 py-2.5 text-right">{rs(m.netPaise)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400">{rs(r.receivedPaise)}</td>
                    <td className={cn("px-4 py-2.5 text-right font-semibold", m.balancePaise > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-400")}>{m.balancePaise > 0 ? rs(m.balancePaise) : "—"}</td>
                    <td className="px-4 py-2.5"><div className="flex items-center gap-2"><span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATE_STYLE[m.state])}>{STATE_LABEL[m.state]}</span>{m.balancePaise > 0 && <><QuickPay compact customer={customer.name} bills={[{ id: r.id, number: r.number, type: r.type, balancePaise: m.balancePaise }]} /><Show what="phones"><SendReminder compact customerId={customer.id} customerName={customer.name} phone={customer.phone} balancePaise={m.balancePaise} invoices={`Invoice ${r.number}`} date={r.functionDate.toISOString()} path={`/b/${r.shareToken}`} /></Show></>}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      <BackToList href="/caterer/customers" label="Back to customers" />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{customer.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 text-sm text-zinc-500">
            <Show what="phones"><a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline"><Phone className="h-3.5 w-3.5" />{customer.phone}</a></Show>
            {customer.address && <span>{customer.address}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <WriteOnly page="orders"><Link href={`/caterer/orders/new?customer=${customer.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> New order
        </Link></WriteOnly>
          <WriteOnly page="orders"><Link href={`/caterer/quotes/new?customer=${customer.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800" >New quotation</Link></WriteOnly>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3"><div className="text-[11px] text-zinc-500">Total billed</div><div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{rs(totals.billed)}</div></div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-3"><div className="text-[11px] text-emerald-700 dark:text-emerald-400">Received</div><div className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{rs(totals.received)}</div></div>
        <div className={cn("rounded-xl border p-3", totals.due > 0 ? "border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900")}>
          <div className={cn("text-[11px]", totals.due > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-500")}>Balance due</div>
          <div className={cn("text-lg font-bold", totals.due > 0 ? "text-red-700 dark:text-red-300" : "text-zinc-400")}>{totals.due > 0 ? rs(totals.due) : "Nil"}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Show what="phones"><CatererStatementShare
          token={customer.shareToken} phone={customer.phone} catererName={ctx.caterer.name} customerName={customer.name}
          billedPaise={totals.billed} receivedPaise={totals.received} balancePaise={totals.due}
        />
</Show>        <Link href={`/s/${customer.shareToken}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          <ExternalLink className="h-4 w-4" /> View statement
        </Link>
        <span className="text-xs text-zinc-400">{live.length} invoice{live.length === 1 ? "" : "s"} · {closedCount} closed · {open.length} with balance</span>
      </div>

      {table(open, "Open invoices (balance due)")}
      {table(closed.rows, `Closed invoices`, true)}
      {closed.total > 25 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden -mt-3"><UrlPagination basePath={`/caterer/customers/${customer.id}`} query={{}} defaultSize={25} page={closed.page} totalPages={closed.totalPages} total={closed.total} pageSize={closed.pageSize} /></div>
      )}
      {rows.some((r) => r.cancelled) && table(rows.filter((r) => r.cancelled), "Cancelled functions", true)}
      {rows.length === 0 && <p className="text-sm text-zinc-500">No invoices yet.</p>}
    </div>
  );
}
