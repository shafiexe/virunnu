import { ShowS as Show } from "@/components/show-server";
import { EmptyState } from "@/components/empty-state";
import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { Phone, Users2 } from "lucide-react";
import { getCatererForSession } from "@/lib/caterer-session";
import { currentMonthValue, periodRange } from "@/lib/caterer-finance";
import { staffMonth } from "@/lib/caterer-staff-server";
import { PAY_LABEL } from "@/lib/caterer-staff";
import { rs } from "@/lib/caterer-orders";
import { CatererSectionTabs, partyTabs } from "@/components/caterer-section-tabs";
import { CatererMonthNav } from "@/components/caterer-month-nav";
import { AddStaffButton, PayStaffButton, QuickAttendance } from "@/components/caterer-staff-ui";
import { UrlPagination } from "@/components/url-pagination";
import { paginate, parsePaging, queryOf } from "@/lib/paging";
import { cn } from "@/lib/utils";

export default async function CatererStaffPage({ searchParams }: { searchParams: Promise<{ month?: string; page?: string; pageSize?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : currentMonthValue();
  const { label } = periodRange("month", month);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const isThisMonth = month === today.slice(0, 7);

  const staff = await staffMonth(ctx.caterer.id, ctx.caterer.orgId!, month);
  const paged = paginate(staff, parsePaging(sp));
  const toPay = staff.reduce((s, p) => s + p.toPayPaise, 0);
  const paid = staff.reduce((s, p) => s + p.paidPaise, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-5">
      <CatererSectionTabs tabs={partyTabs()} active="staff" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Staff</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Monthly salaries and daily wages</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CatererMonthNav basePath="/caterer/staff" value={month} label={label} />
          <AddStaffButton roles={[...new Set(staff.map((p) => p.role))]} />
        </div>
      </div>

      <Show what="salaries">
      {staff.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-4"><div className="text-xs text-emerald-700 dark:text-emerald-400">Paid in {label}</div><div className="text-xl font-bold text-emerald-800 dark:text-emerald-300">{rs(paid)}</div></div>
          <div className={cn("rounded-2xl border p-4", toPay > 0 ? "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900")}><div className="text-xs text-zinc-500">Still to pay</div><div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{toPay > 0 ? rs(toPay) : "Nil"}</div></div>
        </div>
      )}
      </Show>

      {staff.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
          <EmptyState icon={Users2} title="No team members yet" hint="Add your cooks, helpers and serving boys with Add team member above, and say whether each is paid monthly or by the day. Then pick them on each order." />
        </div>
      ) : (
        <ul className="space-y-2">
          {paged.rows.map((p) => (
            <li key={p.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Link href={`/caterer/staff/${p.id}?month=${month}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{p.name}</span>
                    <span className="rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">{p.role}</span>
                  </div>
                  <Show what="salaries"><div className="mt-0.5 text-xs text-zinc-500">{PAY_LABEL[p.payType]} · {rs(p.ratePaise)}{p.payType === "DAILY" ? " a day" : " a month"}</div></Show>
                </Link>
                {p.phone && <a href={`tel:${p.phone}`} aria-label={`Call ${p.name}`} className="text-zinc-400 hover:text-amber-600"><Phone className="h-4 w-4" /></a>}
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Show what="salaries"><div className="text-xs text-zinc-500 space-x-3">
                  {p.payType === "DAILY" && <span>{p.days} day{p.days === 1 ? "" : "s"} worked</span>}
                  <span>Earned <span className="font-semibold text-zinc-800 dark:text-zinc-200">{rs(p.earnedPaise)}</span></span>
                  <span>Paid <span className="font-semibold text-emerald-600">{rs(p.paidPaise)}</span></span>
                  <span>To pay <span className={cn("font-semibold", p.toPayPaise > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-400")}>{p.toPayPaise > 0 ? rs(p.toPayPaise) : "Nil"}</span></span>
                </div></Show>
                <div className="flex items-center gap-2">
                  {p.payType === "DAILY" && isThisMonth && <QuickAttendance id={p.id} date={today} units={p.todayUnits} />}
                  <PayStaffButton id={p.id} name={p.name} payType={p.payType} toPayPaise={p.toPayPaise} compact />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {staff.length > 25 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden -mt-2 empty:hidden">
          <UrlPagination basePath="/caterer/staff" query={queryOf({ month })} page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={paged.pageSize} />
        </div>
      )}
    </div>
  );
}
