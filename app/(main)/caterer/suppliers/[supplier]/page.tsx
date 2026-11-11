import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { syncSuppliers } from "@/lib/caterer-suppliers-server";
import { CYCLE_DAYS, CYCLE_LABEL, type SupplierCycleKey } from "@/lib/caterer-suppliers";
import { rs } from "@/lib/caterer-orders";
import { BackToList } from "@/components/back-to-list";
import { EditSupplierButton, SettleButton } from "@/components/caterer-supplier-ui";
import { PayButton } from "@/components/caterer-purchase-actions";
import { UrlPagination } from "@/components/url-pagination";
import { paginate, parsePaging } from "@/lib/paging";
import { cn } from "@/lib/utils";

const METHOD: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card", BANK: "Bank" };

export default async function SupplierLedgerPage({ params, searchParams }: { params: Promise<{ supplier: string }>; searchParams: Promise<{ page?: string; pageSize?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const key = decodeURIComponent((await params).supplier);
  const sp = await searchParams;
  await syncSuppliers(ctx.caterer.id);

  // the page link carries the supplier's id; older links carry the name
  const supplier = await db.catererSupplier.findFirst({
    where: { catererId: ctx.caterer.id, OR: [{ id: key }, { name: { equals: key, mode: "insensitive" } }] },
    include: {
      purchases: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: { payments: { orderBy: { paidOn: "asc" } }, employee: { select: { name: true } } },
      },
    },
  });
  if (!supplier) notFound();
  if (supplier.id !== key) redirect(`/caterer/suppliers/${supplier.id}`);

  const paged = paginate(supplier.purchases, parsePaging(sp, 25));
  const total = supplier.purchases.reduce((s, p) => s + p.totalPaise, 0);
  const paid = supplier.purchases.reduce((s, p) => s + p.paidPaise, 0);
  const due = total - paid;
  const cycle = supplier.cycle as SupplierCycleKey;
  const unpaid = supplier.purchases.filter((p) => p.totalPaise > p.paidPaise);
  const oldest = unpaid.length ? unpaid.reduce((a, p) => (p.date < a ? p.date : a), unpaid[0].date) : null;
  const waitDays = oldest ? Math.floor((Date.now() - oldest.getTime()) / 86400000) : 0;
  const overdue = due > 0 && CYCLE_DAYS[cycle] > 0 && waitDays > CYCLE_DAYS[cycle];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      <BackToList href="/caterer/suppliers" label="Back to suppliers" />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs text-zinc-500">Supplier ledger</div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{supplier.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
            <span className="rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">{supplier.category}</span>
            <span>{CYCLE_LABEL[cycle]}</span>
            {supplier.phone && <a href={`tel:${supplier.phone}`} className="inline-flex items-center gap-1 text-amber-600 hover:underline"><Phone className="h-3.5 w-3.5" />{supplier.phone}</a>}
          </div>
          {supplier.notes && <p className="mt-1 text-xs text-zinc-400">{supplier.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <EditSupplierButton supplier={{ id: supplier.id, name: supplier.name, phone: supplier.phone, category: supplier.category, cycle, notes: supplier.notes }} />
          {due > 0 && <SettleButton supplierId={supplier.id} name={supplier.name} duePaise={due} />}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3"><div className="text-[11px] text-zinc-500">Total bought</div><div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{rs(total)}</div></div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-3"><div className="text-[11px] text-emerald-700 dark:text-emerald-400">Paid</div><div className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{rs(paid)}</div></div>
        <div className={cn("rounded-xl border p-3", due > 0 ? "border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900")}>
          <div className="text-[11px] text-zinc-500">You owe</div>
          <div className={cn("text-lg font-bold", due > 0 ? "text-red-700 dark:text-red-300" : "text-zinc-400")}>{due > 0 ? rs(due) : "Nil"}</div>
          {overdue && <div className="text-[11px] font-semibold text-red-600">Overdue · oldest bill {waitDays} days</div>}
        </div>
      </div>

      {supplier.purchases.length === 0 ? <p className="text-sm text-zinc-500">No bills yet. Record a purchase from this supplier and it will appear here.</p> : (
        <div className="space-y-3">
          {paged.rows.map((p) => {
            const d = p.totalPaise - p.paidPaise;
            return (
              <section key={p.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <Link href={`/caterer/purchases/${p.id}`} className="hover:text-amber-600">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">{p.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</span>
                    <span className="block text-xs text-zinc-500">{p.category}{p.billNo ? ` · Bill ${p.billNo}` : ""}{p.employee ? ` · bought by ${p.employee.name}` : ""}</span>
                  </Link>
                  <div className="text-right text-sm">
                    <span className="font-semibold">{rs(p.totalPaise)}</span>
                    {d > 0 ? <span className="ml-3 inline-flex items-center gap-2"><span className="font-semibold text-red-600">Due {rs(d)}</span><PayButton purchaseId={p.id} duePaise={d} /></span> : <span className="ml-3 text-xs text-emerald-600">Paid</span>}
                  </div>
                </div>
                {p.payments.length > 0 && (
                  <div className="text-xs text-zinc-500 space-y-0.5 border-t border-zinc-100 dark:border-zinc-800 pt-2">
                    {p.payments.map((x) => <div key={x.id} className="flex justify-between"><span>Paid {x.paidOn.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })} · {METHOD[x.method] ?? x.method}{x.note && x.note !== "Paid at purchase" ? ` · ${x.note}` : ""}</span><span className="text-zinc-700 dark:text-zinc-300">{rs(x.amountPaise)}</span></div>)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      {supplier.purchases.length > 25 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"><UrlPagination basePath={`/caterer/suppliers/${supplier.id}`} query={{}} defaultSize={25} page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={paged.pageSize} /></div>
      )}
    </div>
  );
}
