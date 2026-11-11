import { EmptyState } from "@/components/empty-state";
import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { Phone, Truck } from "lucide-react";
import { getCatererForSession } from "@/lib/caterer-session";
import { supplierOverview } from "@/lib/caterer-suppliers-server";
import { CYCLE_LABEL, SUPPLIER_CATEGORIES } from "@/lib/caterer-suppliers";
import { rs } from "@/lib/caterer-orders";
import { CatererSectionTabs, partyTabs } from "@/components/caterer-section-tabs";
import { AddSupplierButton, SettleButton } from "@/components/caterer-supplier-ui";
import { UrlPagination } from "@/components/url-pagination";
import { paginate, parsePaging, queryOf } from "@/lib/paging";
import { cn } from "@/lib/utils";

export default async function CatererSuppliersPage({ searchParams }: { searchParams: Promise<{ category?: string; page?: string; pageSize?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const sp = await searchParams;
  const all = (await supplierOverview(ctx.caterer.id)).filter((s) => s.active);
  const category = SUPPLIER_CATEGORIES.includes(sp.category as (typeof SUPPLIER_CATEGORIES)[number]) ? sp.category! : "";
  const filtered = (category ? all.filter((s) => s.category === category) : all).sort((a, b) => b.duePaise - a.duePaise || a.name.localeCompare(b.name));
  const paged = paginate(filtered, parsePaging(sp, 25));
  const list = paged.rows;
  const owed = all.reduce((s, x) => s + x.duePaise, 0);
  const used = SUPPLIER_CATEGORIES.filter((c) => all.some((s) => s.category === c));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
      <CatererSectionTabs tabs={partyTabs()} active="suppliers" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Suppliers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{all.length} supplier{all.length === 1 ? "" : "s"}{owed > 0 && <> · <span className="text-red-600 dark:text-red-400 font-medium">{rs(owed)} to pay</span></>}</p>
        </div>
        <AddSupplierButton />
      </div>

      {used.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Link href="/caterer/suppliers" className={cn("rounded-full border px-3 py-1 text-xs font-medium", !category ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400")}>All</Link>
          {used.map((c) => (
            <Link key={c} href={`/caterer/suppliers?category=${encodeURIComponent(c)}`} className={cn("rounded-full border px-3 py-1 text-xs font-medium", category === c ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>{c}</Link>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
          <EmptyState icon={Truck} title={category ? "No suppliers in this group" : "No suppliers yet"} hint="Suppliers are the people you buy from: the vegetable market, fish stall, chicken shop. Record a purchase and the supplier is added for you, or use Add supplier above." actions={[{ href: "/caterer/purchases/new", label: "Record a purchase" }]} />
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-300 dark:hover:border-amber-700/50 transition-colors">
              <div className="flex items-center gap-3 p-4">
                <Link href={`/caterer/suppliers/${s.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{s.name}</span>
                    <span className="rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">{s.category}</span>
                    {s.overdue && <span className="rounded-full bg-red-100 dark:bg-red-950/40 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-400">Overdue · {s.waitDays} days</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">{CYCLE_LABEL[s.cycle]} · {s.billCount} bill{s.billCount === 1 ? "" : "s"} · bought {rs(s.totalPaise)}</div>
                </Link>
                {s.phone && <a href={`tel:${s.phone}`} aria-label={`Call ${s.name}`} className="text-zinc-400 hover:text-amber-600"><Phone className="h-4 w-4" /></a>}
                <div className="text-right shrink-0">
                  {s.duePaise > 0 ? (
                    <div className="flex items-center gap-3">
                      <div><div className="text-[11px] text-zinc-500">You owe</div><div className="font-bold text-red-600 dark:text-red-400">{rs(s.duePaise)}</div></div>
                      <SettleButton supplierId={s.id} name={s.name} duePaise={s.duePaise} compact />
                    </div>
                  ) : <span className="text-xs text-emerald-600">{s.billCount ? "All paid" : "No bills yet"}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {filtered.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden -mt-2 empty:hidden">
          <UrlPagination basePath="/caterer/suppliers" query={queryOf({ category: category || undefined })} defaultSize={25} page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={paged.pageSize} />
        </div>
      )}
    </div>
  );
}
