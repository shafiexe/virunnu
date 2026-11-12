import { ShowS as Show } from "@/components/show-server";
import { connection } from "next/server";
export const instant = false;
import { redirect, notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { currentMonthValue, periodRange } from "@/lib/caterer-finance";
import { staffMonth } from "@/lib/caterer-staff-server";
import { KIND_NAME, PAY_LABEL, type PayKind } from "@/lib/caterer-staff";
import { rs } from "@/lib/caterer-orders";
import { BackToList } from "@/components/back-to-list";
import { CatererMonthNav } from "@/components/caterer-month-nav";
import Link from "next/link";
import { AttendanceGrid, EditStaffButton, PayStaffButton, PaymentActions } from "@/components/caterer-staff-ui";
import { cn } from "@/lib/utils";

const METHOD: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card", BANK: "Bank" };

export default async function CatererStaffDetailPage({ params, searchParams }: { params: Promise<{ employeeId: string }>; searchParams: Promise<{ month?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const { employeeId } = await params;
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : currentMonthValue();
  const { from, to, label } = periodRange("month", month);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const [row] = (await staffMonth(ctx.caterer.id, ctx.caterer.orgId!, month)).filter((p) => p.id === employeeId);
  if (!row) notFound();
  const [payments, marks, jobs] = await Promise.all([
    db.catererStaffPayment.findMany({ where: { catererId: ctx.caterer.id, employeeId, date: { gte: from, lte: to } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    db.catererAttendance.findMany({ where: { catererId: ctx.caterer.id, employeeId, date: { gte: from, lte: to } } }),
    db.catererOrderStaff.findMany({
      where: { employeeId, order: { catererId: ctx.caterer.id, status: { not: "CANCELLED" }, date: { gte: from, lte: to } } },
      orderBy: { order: { date: "desc" } },
      select: { amountPaise: true, order: { select: { id: true, date: true, place: true, customer: { select: { name: true } } } } },
    }),
  ]);
  const markMap = Object.fromEntries(marks.map((m) => [m.date.toISOString().slice(0, 10), m.units]));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 [&>*]:max-w-3xl space-y-5">
      <BackToList href={`/caterer/staff?month=${month}`} label="Back to staff" />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{row.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-zinc-500">
            <span className="rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">{row.role}</span>
            <Show what="salaries"><span>{PAY_LABEL[row.payType]} · {rs(row.ratePaise)}{row.payType === "DAILY" ? " a day" : " a month"}</span></Show>
            {row.phone && <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-500 hover:underline"><Phone className="h-3.5 w-3.5" />{row.phone}</a>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditStaffButton roles={[]} staff={{ id: row.id, name: row.name, phone: row.phone, role: row.role, payType: row.payType, ratePaise: row.ratePaise }} />
          <PayStaffButton id={row.id} name={row.name} payType={row.payType} toPayPaise={row.toPayPaise} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <CatererMonthNav basePath={`/caterer/staff/${row.id}`} value={month} label={label} />
      </div>

      <Show what="salaries">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3"><div className="text-[11px] text-zinc-500">Earned</div><div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{rs(row.earnedPaise)}</div>{row.payType === "DAILY" && <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{row.days} day{row.days === 1 ? "" : "s"}</div>}</div>
        <a href="#payments" className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-3 block hover:shadow-sm transition-shadow"><div className="text-[11px] text-emerald-700 dark:text-emerald-400">Paid · see payments</div><div className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{rs(row.paidPaise)}</div></a>
        <div className={cn("rounded-xl border p-3", row.toPayPaise > 0 ? "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900")}><div className="text-[11px] text-zinc-500">To pay</div><div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{row.toPayPaise > 0 ? rs(row.toPayPaise) : "Nil"}</div></div>
      </div>
      </Show>

      <section id="payments" className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Payments · {label}</h2>
        {payments.length === 0 ? <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing paid in {label} yet.</p> : (
          <>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Recorded a payment by mistake? Use <span className="font-medium">Edit</span> to correct the amount or date, or <span className="font-medium">Undo</span> to take it back.</p>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{KIND_NAME[p.kind as PayKind] ?? p.kind}</span>
                  <span className="block text-xs text-zinc-500">{p.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })} · {METHOD[p.method] ?? p.method}{p.note ? ` · ${p.note}` : ""}</span>
                </span>
                <span className="flex items-center gap-3 shrink-0 flex-wrap justify-end"><Show what="salaries"><span className="font-semibold">{rs(p.amountPaise)}</span></Show><PaymentActions payment={{ id: p.id, amountPaise: p.amountPaise, kind: p.kind, method: p.method, note: p.note, date: p.date.toISOString() }} employeeId={employeeId} /></span>
              </li>
            ))}
          </ul>
          </>
        )}
      </section>

      {row.payType === "DAILY" && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Days worked · {label}</h2>
          <AttendanceGrid key={month} id={row.id} month={month} marks={markMap} today={today} />
        </section>
      )}

      {jobs.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Functions worked · {label}</h2>
          {(
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {jobs.map((j) => (
                <li key={j.order.id}>
                  <Link href={`/caterer/orders/${j.order.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-amber-600">
                    <span className="min-w-0 truncate">{j.order.customer.name}<span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{j.order.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}{j.order.place ? ` · ${j.order.place}` : ""}</span></span>
                    <Show what="salaries"><span className="shrink-0 font-medium">{rs(j.amountPaise)}</span></Show>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

    </div>
  );
}
