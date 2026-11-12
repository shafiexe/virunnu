import { EmptyState } from "@/components/empty-state";
import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ShoppingCart } from "lucide-react";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { currentMonthValue, periodRange } from "@/lib/caterer-finance";
import { spendByPerson } from "@/lib/caterer-books";
import { rs } from "@/lib/caterer-orders";
import { CatererMonthNav } from "@/components/caterer-month-nav";
import { PayButton } from "@/components/caterer-purchase-actions";
import { UrlPagination } from "@/components/url-pagination";
import { parsePaging, queryOf } from "@/lib/paging";
import { cn } from "@/lib/utils";
import { WriteOnly } from "@/components/access-context";

export default async function CatererPurchasesPage({ searchParams }: { searchParams: Promise<{ month?: string; person?: string; page?: string; pageSize?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : currentMonthValue();
  const { from, to, label } = periodRange("month", month);
  const person = sp.person ?? "";

  const where = { catererId: ctx.caterer.id, date: { gte: from, lte: to }, ...(person === "none" ? { employeeId: null } : person ? { employeeId: person } : {}) };
  const paging = parsePaging(sp);
  const [totals, count, byPerson] = await Promise.all([
    db.catererPurchase.aggregate({ where, _sum: { totalPaise: true, paidPaise: true } }),
    db.catererPurchase.count({ where }),
    spendByPerson(ctx.caterer.id, from, to),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / paging.pageSize));
  const page = Math.min(paging.page, totalPages);
  const purchases = await db.catererPurchase.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * paging.pageSize, take: paging.pageSize,
    include: { employee: { select: { name: true } }, order: { select: { id: true, date: true, customer: { select: { name: true } } } } },
  });

  const total = totals._sum.totalPaise ?? 0;
  const paid = totals._sum.paidPaise ?? 0;
  const link = (extra: string) => `/caterer/purchases?month=${month}${extra}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Purchases</h1>
          <p className="text-sm text-zinc-500 mt-0.5">What the team has bought, and who bought it</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CatererMonthNav basePath="/caterer/purchases" value={month} label={label} extra={person ? `&person=${person}` : ""} />
          <WriteOnly page="purchases"><Link href="/caterer/purchases/new" className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> New purchase</Link></WriteOnly>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"><div className="text-xs text-zinc-500">Purchased</div><div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{rs(total)}</div></div>
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-4"><div className="text-xs text-emerald-700 dark:text-emerald-400">Paid</div><div className="text-xl font-bold text-emerald-800 dark:text-emerald-300">{rs(paid)}</div></div>
        <div className={cn("rounded-2xl border p-4", total - paid > 0 ? "border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900")}><div className="text-xs text-zinc-500">Still to pay</div><div className={cn("text-xl font-bold", total - paid > 0 ? "text-red-700 dark:text-red-300" : "text-zinc-400")}>{total - paid > 0 ? rs(total - paid) : "Nil"}</div></div>
      </div>

      {byPerson.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Spent by each person · {label}</h2>
          <div className="flex flex-wrap gap-2">
            <Link href={link("")} className={cn("rounded-full border px-3 py-1 text-xs font-medium", !person ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>Everyone</Link>
            {byPerson.map((p) => (
              <Link key={p.id ?? "none"} href={link(`&person=${p.id ?? "none"}`)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", person === (p.id ?? "none") ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>
                {p.name} · {rs(p.totalPaise)} <span className="opacity-70">({p.count})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs uppercase tracking-wide text-zinc-500">
              <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Supplier</th><th className="px-4 py-3 text-left">Bought by</th><th className="px-4 py-3 text-left">For function</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Due</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {count === 0 && <tr><td colSpan={6}><EmptyState inTable icon={ShoppingCart} title={`No purchases in ${label}`} hint="Record what the team buys for the kitchen: who bought it, from which supplier, and whether it is paid. Tie it to a function to see that function's profit." actions={[{ href: "/caterer/purchases/new", label: "Record purchase" }]} /></td></tr>}
              {purchases.map((p) => {
                const due = p.totalPaise - p.paidPaise;
                return (
                  <tr key={p.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="p-0 whitespace-nowrap">
                      <Link href={`/caterer/purchases/${p.id}`} className="block px-4 py-3 hover:bg-amber-50/60 dark:hover:bg-amber-950/10">{p.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</Link>
                    </td>
                    <td className="px-4 py-3"><Link href={`/caterer/suppliers/${p.supplierId ?? encodeURIComponent(p.supplier)}`} className="font-medium text-zinc-900 dark:text-zinc-50 hover:text-amber-600">{p.supplier}</Link><span className="block text-xs text-zinc-400">{p.category}{p.billNo ? ` · Bill ${p.billNo}` : ""}</span></td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.employee?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{p.order ? <Link href={`/caterer/orders/${p.order.id}`} className="text-amber-600 hover:underline">{p.order.customer.name}</Link> : <span className="text-zinc-400">General</span>}</td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{rs(p.totalPaise)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{due > 0 ? <span className="inline-flex items-center gap-2"><span className="font-semibold text-red-600 dark:text-red-400">{rs(due)}</span><PayButton purchaseId={p.id} duePaise={due} /></span> : <span className="text-xs text-emerald-600">Paid</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <UrlPagination basePath="/caterer/purchases" query={queryOf({ month, person: person || undefined })} page={page} totalPages={totalPages} total={count} pageSize={paging.pageSize} />
      </div>
    </div>
  );
}
