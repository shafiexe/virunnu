import { EmptyState } from "@/components/empty-state";
import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Download } from "lucide-react";
import { getCatererForSession } from "@/lib/caterer-session";
import { currentMonthValue, periodRange } from "@/lib/caterer-finance";
import { dayBook, KIND_HINT, KIND_LABEL, METHOD_LABEL, type EntryKind } from "@/lib/caterer-books";
import { rs } from "@/lib/caterer-orders";
import { CatererMonthNav } from "@/components/caterer-month-nav";
import { UrlPagination } from "@/components/url-pagination";
import { paginate, parsePaging, queryOf } from "@/lib/paging";
import { cn } from "@/lib/utils";

const KINDS: EntryKind[] = ["SALE", "RECEIPT", "PURCHASE", "PAYMENT", "SALARY", "EXPENSE"];
const KIND_STYLE: Record<EntryKind, string> = {
  SALE: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  RECEIPT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  PURCHASE: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  PAYMENT: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  SALARY: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
  EXPENSE: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
};

export default async function DayBookPage({ searchParams }: { searchParams: Promise<{ month?: string; kind?: string; page?: string; pageSize?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : currentMonthValue();
  const { from, to, label } = periodRange("month", month);
  const kind = KINDS.includes(sp.kind as EntryKind) ? (sp.kind as EntryKind) : null;

  const all = await dayBook(ctx.caterer.id, ctx.caterer.orgId!, from, to);
  const filtered = kind ? all.filter((e) => e.kind === kind) : all;
  const paged = paginate(filtered, parsePaging(sp));
  const entries = paged.rows;
  const moneyIn = all.reduce((s, e) => s + e.inPaise, 0);
  const moneyOut = all.reduce((s, e) => s + e.outPaise, 0);
  const link = (k: string) => `/caterer/daybook?month=${month}${k ? `&kind=${k}` : ""}`;
  const baseQuery = queryOf({ month, kind: kind ?? undefined });

  // When looking at money received or paid, show the total for each way of paying (cash, UPI …)
  const byMode = new Map<string, number>();
  if (kind === "RECEIPT" || kind === "PAYMENT" || kind === "SALARY") for (const e of entries) byMode.set(e.method ?? "CASH", (byMode.get(e.method ?? "CASH") ?? 0) + e.amountPaise);

  // group by date for a day-by-day read
  const days = [...new Set(entries.map((e) => e.date))];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Day Book</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Every bill and every rupee, day by day</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CatererMonthNav basePath="/caterer/daybook" value={month} label={label} extra={kind ? `&kind=${kind}` : ""} />
          <a href={`/api/caterer/export?type=daybook&month=${month}`} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"><Download className="h-4 w-4" /> Excel (CSV)</a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-4"><div className="text-xs text-emerald-700 dark:text-emerald-400">Money in</div><div className="text-xl font-bold text-emerald-800 dark:text-emerald-300">{rs(moneyIn)}</div></div>
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-4"><div className="text-xs text-rose-700 dark:text-rose-400">Money out</div><div className="text-xl font-bold text-rose-800 dark:text-rose-300">{rs(moneyOut)}</div></div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"><div className="text-xs text-zinc-500">Net for {label}</div><div className={cn("text-xl font-bold", moneyIn - moneyOut < 0 ? "text-red-600" : "text-zinc-900 dark:text-zinc-50")}>{rs(moneyIn - moneyOut)}</div></div>
      </div>

      {byMode.size > 0 && (
        <div className="flex flex-wrap gap-3">
          {[...byMode.entries()].map(([m, v]) => (
            <div key={m} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5">
              <div className="text-xs text-zinc-500">{METHOD_LABEL[m] ?? m}</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{rs(v)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Link href={link("")} className={cn("rounded-full border px-3 py-1 text-xs font-medium", !kind ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400")}>All</Link>
        {KINDS.map((k) => (
          <Link key={k} href={link(k)} title={KIND_HINT[k]} className={cn("rounded-full border px-3 py-1 text-xs font-medium", kind === k ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>{KIND_LABEL[k]}</Link>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {filtered.length === 0 ? <EmptyState icon={BookOpen} title={`Nothing recorded in ${label}`} hint="Every invoice, payment, purchase and expense shows up here day by day as you add them." actions={[{ href: "/caterer/orders/new", label: "New order" }, { href: "/caterer/purchases/new", label: "Record purchase", primary: false }]} /> : days.map((d) => {
          const list = entries.filter((e) => e.date === d);
          return (
            <div key={d}>
              <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                {new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
              </div>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {list.map((e, i) => (
                  <li key={i}>
                    <Link href={e.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <span className={cn("w-[4.5rem] shrink-0 text-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold", KIND_STYLE[e.kind])} title={KIND_HINT[e.kind]}>{KIND_LABEL[e.kind]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{e.party}</span>
                        <span className="block text-xs text-zinc-500 truncate">{e.ref}{e.method ? ` · ${METHOD_LABEL[e.method] ?? e.method}` : ""}</span>
                      </span>
                      <span className={cn("shrink-0 text-sm font-semibold", e.inPaise ? "text-emerald-600 dark:text-emerald-400" : e.outPaise ? "text-rose-600 dark:text-rose-400" : "text-zinc-700 dark:text-zinc-300")}>
                        {e.inPaise ? "+" : e.outPaise ? "−" : ""}{rs(e.amountPaise)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <UrlPagination basePath="/caterer/daybook" query={baseQuery} page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={paged.pageSize} />
      </div>
      <p className="text-xs text-zinc-400">Sales and purchases are bills on credit. Receipts, payments and expenses are the money that actually moved.</p>
    </div>
  );
}
