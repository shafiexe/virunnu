import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CheckCircle2 } from "lucide-react";
import { getCatererForSession } from "@/lib/caterer-session";
import { followUpList, REST_DAYS } from "@/lib/caterer-followup";
import { formatInvoiceDate, rs } from "@/lib/caterer-orders";
import { CatererSectionTabs, partyTabs } from "@/components/caterer-section-tabs";
import { EmptyState } from "@/components/empty-state";
import { QuickPay } from "@/components/caterer-quick-pay";
import { SendReminder } from "@/components/caterer-send-reminder";
import { CallLink, RemindAfterPicker, SnoozeButton } from "@/components/caterer-followup-controls";
import { cn } from "@/lib/utils";

type Row = Awaited<ReturnType<typeof followUpList>>["toCall"][number];

function Person({ r, dim }: { r: Row; dim?: boolean }) {
  return (
    <li className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3", dim && "opacity-70")}>
      <div className="min-w-0 flex-1 basis-48">
        <Link href={`/caterer/customers/${r.id}`} className="font-semibold text-zinc-900 dark:text-zinc-50 hover:text-amber-600">{r.name}</Link>
        <div className="text-xs text-zinc-500">{r.phone} · function on {formatInvoiceDate(r.oldest)} · <span className="font-medium text-red-600 dark:text-red-400">{r.days} days ago</span>{r.lastRemindedAt && <> · reminded {formatInvoiceDate(r.lastRemindedAt)}</>}</div>
      </div>
      <div className="text-right">
        <div className="font-bold text-red-600 dark:text-red-400">{rs(r.balancePaise)}</div>
        <div className="text-[11px] text-zinc-400">{r.bills.length} invoice{r.bills.length === 1 ? "" : "s"}</div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <CallLink phone={r.phone} />
        <SendReminder compact customerId={r.id} customerName={r.name} phone={r.phone} balancePaise={r.balancePaise} date={r.oldest.toISOString()} path={`/s/${r.shareToken}`}
          invoices={r.bills.length === 1 ? `Invoice ${r.bills[0].number}` : "your account"} label="WhatsApp" />
        <QuickPay compact customer={r.name} bills={r.bills} />
        {!dim && <SnoozeButton customerId={r.id} name={r.name} />}
      </div>
    </li>
  );
}

export default async function FollowUpPage() {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const days = ctx.caterer.remindAfterDays;
  const { toCall, resting, totalPaise } = await followUpList(ctx.caterer.id, days);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <CatererSectionTabs tabs={partyTabs()} active="followup" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Follow-up</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{toCall.length + resting.length === 0 ? "Customers to call about money still owed" : `${toCall.length + resting.length} customer${toCall.length + resting.length === 1 ? "" : "s"} owe ${rs(totalPaise)} for functions ${days}+ days old`}</p>
        </div>
        <RemindAfterPicker value={days} />
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {toCall.length === 0 ? (
          <EmptyState icon={resting.length > 0 ? BellRing : CheckCircle2} title={resting.length > 0 ? "Everyone has been reminded recently" : "Nobody to chase"}
            hint={resting.length > 0 ? `They come back to this list ${REST_DAYS} days after a reminder if they still owe.` : `No customer has owed money for more than ${days} days. Reminders you send from any unpaid invoice also appear here.`}
            actions={[{ href: "/caterer/orders?status=DUES", label: "See all unpaid orders", primary: false }]} />
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">{toCall.map((r) => <Person key={r.id} r={r} />)}</ul>
        )}
      </div>

      {resting.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Reminded recently · {resting.length}</h2>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"><ul className="divide-y divide-zinc-100 dark:divide-zinc-800">{resting.map((r) => <Person key={r.id} r={r} dim />)}</ul></div>
        </section>
      )}
      <p className="text-xs text-zinc-400">The wording of the reminder can be changed in Service Profile → Messages.</p>
    </div>
  );
}
