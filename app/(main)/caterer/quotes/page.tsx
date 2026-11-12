import { ShowS as Show } from "@/components/show-server";
import { WriteOnly } from "@/components/access-context";
import { EmptyState } from "@/components/empty-state";
import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { quoteLabel, quoteState } from "@/lib/caterer-quotes";
import { formatInvoiceDate, rs } from "@/lib/caterer-orders";
import { parsePaging } from "@/lib/paging";
import { CatererSectionTabs, orderTabs } from "@/components/caterer-section-tabs";
import { UrlPagination } from "@/components/url-pagination";
import { cn } from "@/lib/utils";

const STATE_STYLE = {
  OPEN: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400",
  EXPIRED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  ACCEPTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  DECLINED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
} as const;
const STATE_LABEL = { OPEN: "Waiting", EXPIRED: "Expired", ACCEPTED: "Accepted", DECLINED: "Declined" } as const;

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ page?: string; pageSize?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const sp = await searchParams;
  const paging = parsePaging(sp, 25);
  const where = { catererId: ctx.caterer.id };
  const [pending, total] = await Promise.all([db.cateringEnquiry.count({ where: { ...where, status: "PENDING" } }), db.catererQuote.count({ where })]);
  const totalPages = Math.max(1, Math.ceil(total / paging.pageSize));
  const page = Math.min(paging.page, totalPages);
  const rows = await db.catererQuote.findMany({
    where, orderBy: { createdAt: "desc" }, skip: (page - 1) * paging.pageSize, take: paging.pageSize,
    include: { customer: { select: { name: true, phone: true } } },
  });
  const openValue = (await db.catererQuote.findMany({ where: { ...where, status: "OPEN" }, select: { totalPaise: true, validUntil: true, status: true } }))
    .filter((q) => quoteState(q) === "OPEN").reduce((s, q) => s + q.totalPaise, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4">
      <CatererSectionTabs tabs={orderTabs(pending)} active="quotes" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Quotations</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total === 0 ? "Send a price before the customer confirms" : `${total} quotation${total === 1 ? "" : "s"}${openValue > 0 ? ` · ${rs(openValue)} waiting for a reply` : ""}`}</p>
        </div>
        <WriteOnly page="orders"><Link href="/caterer/quotes/new" className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors">
          <Plus className="h-4 w-4" /> New quotation
        </Link></WriteOnly>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
        {rows.length === 0 ? (
          <EmptyState icon={FileText} title="No quotations yet" hint="Send a price before the customer confirms. When they say yes, turn it into an order with one tap." actions={[{ href: "/caterer/quotes/new", label: "New quotation" }]} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>{["Quotation", "Customer", "Function", "Total", "Valid until", "Status"].map((h) => <th key={h} className={cn("px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide whitespace-nowrap", h === "Total" ? "text-right" : "text-left")}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((q) => {
                  const state = quoteState(q);
                  return (
                    <tr key={q.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="p-0 whitespace-nowrap"><Link href={`/caterer/quotes/${q.id}`} className="block px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50 hover:bg-amber-50/60 dark:hover:bg-amber-950/10">{quoteLabel(q.number)}<span className="block text-xs font-normal text-zinc-400">{formatInvoiceDate(q.createdAt)}</span></Link></td>
                      <td className="px-4 py-3">{q.customer.name}<Show what="phones"><a href={`tel:${q.customer.phone}`} className="block text-xs text-zinc-500 hover:text-amber-600">{q.customer.phone}</a></Show></td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{formatInvoiceDate(q.date)}</td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{rs(q.totalPaise)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{q.validUntil ? formatInvoiceDate(q.validUntil) : "—"}</td>
                      <td className="px-4 py-3"><span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", STATE_STYLE[state])}>{STATE_LABEL[state]}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {total > 25 && <UrlPagination basePath="/caterer/quotes" query={{}} defaultSize={25} page={page} totalPages={totalPages} total={total} pageSize={paging.pageSize} />}
      </div>
    </div>
  );
}
