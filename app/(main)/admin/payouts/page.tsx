import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { payoutBalances, COMMISSION_BPS } from "@/lib/commission";
import { formatRupees } from "@/lib/gst";
import { AdminPayoutForm } from "@/components/admin-payout-form";

const rs = (p: number) => `₹${formatRupees(p)}`;

export default async function AdminPayoutsPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const orgs = await db.organization.findMany({
    where: { type: "CONVENTION" },
    select: { id: true, name: true, payoutDetails: true, payouts: { orderBy: { paidOn: "desc" }, take: 5 } },
    orderBy: { name: "asc" },
  });
  const balances = await payoutBalances();
  const rows = orgs.map((o) => ({ ...o, b: balances.get(o.id) ?? { onlinePaise: 0, commissionPaise: 0, paidOutPaise: 0, owedPaise: 0 } }));
  const active = rows.filter((r) => r.b.onlinePaise > 0 || r.b.paidOutPaise > 0).sort((a, b) => b.b.owedPaise - a.b.owedPaise);
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((t, r) => t + f(r), 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6">
      <div>
        <Link href="/admin" className="text-xs text-zinc-500 hover:underline">← Admin</Link>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Payouts to venues</h1>
        <p className="text-sm text-zinc-500">Customers pay online into Virunnu&apos;s Razorpay account. Virunnu keeps {COMMISSION_BPS / 100}% and owes the rest to the venue. The 1% is on the whole amount paid; GST on the fee is not worked out here.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[["Paid online", sum((r) => r.b.onlinePaise)], ["Virunnu's commission", sum((r) => r.b.commissionPaise)], ["Already sent to venues", sum((r) => r.b.paidOutPaise)], ["Still to send", sum((r) => r.b.owedPaise)]].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">{l}</p><p className="mt-1 text-xl font-bold tabular-nums">{rs(v as number)}</p>
          </div>
        ))}
      </div>

      {active.length === 0 && <p className="text-sm text-zinc-500">No online payments yet.</p>}
      {active.map((r) => (
        <section key={r.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{r.name}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Paid online {rs(r.b.onlinePaise)} − commission {rs(r.b.commissionPaise)} − sent {rs(r.b.paidOutPaise)} = <strong className="text-zinc-900 dark:text-zinc-50">{rs(r.b.owedPaise)} to send</strong></p>
          </div>
          <AdminPayoutForm orgId={r.id} owedRupees={Math.floor(r.b.owedPaise / 100)} details={r.payoutDetails ?? ""} />
          {r.payouts.length > 0 && (
            <ul className="border-t border-zinc-100 dark:border-zinc-800 pt-2 text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
              {r.payouts.map((p) => <li key={p.id} className="flex justify-between"><span>{p.paidOn.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}{p.reference ? ` · ${p.reference}` : ""}</span><span>{rs(p.amountPaise)}</span></li>)}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
