import { hidesFor } from "@/components/show-server";
import { ShowS as Show } from "@/components/show-server";
import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Clock, MapPin, Phone, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { loadOrder } from "@/lib/caterer-bills";
import { BILL_LABEL, billMoney, formatTime, rs } from "@/lib/caterer-orders";
import { BackToList } from "@/components/back-to-list";
import { CatererBillCard, type BillCardData } from "@/components/caterer-bill-card";
import { CatererOrderActions } from "@/components/caterer-order-actions";
import { PayStaffButton } from "@/components/caterer-staff-ui";
import type { PayTypeKey } from "@/lib/caterer-staff";

const STATUS_STYLE = {
  CONFIRMED: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
} as const;
const STATUS_LABEL = { CONFIRMED: "Upcoming", COMPLETED: "Completed", CANCELLED: "Cancelled" } as const;

export default async function CatererOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const { orderId } = await params;
  const order = await loadOrder(orderId, ctx.caterer.id);
  if (!order) notFound();

  const purchases = await db.catererPurchase.findMany({ where: { orderId: order.id }, orderBy: { date: "asc" }, include: { employee: { select: { name: true } } } });
  const purchasePaise = purchases.reduce((s, p) => s + p.totalPaise, 0);
  const teamPaise = order.team.reduce((s, t) => s + t.amountPaise, 0);
  const costPaise = purchasePaise + teamPaise;
  const dateIso = order.date.toISOString();
  const dateLong = order.date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const cancelled = order.status === "CANCELLED";

  const totals = order.bills.reduce(
    (a, b) => { const m = billMoney(b); return { net: a.net + m.netPaise, received: a.received + b.receivedPaise, balance: a.balance + m.balancePaise }; },
    { net: 0, received: 0, balance: 0 }
  );

  const billCards: BillCardData[] = order.bills.map((b) => ({
    id: b.id, type: b.type, number: b.number, shareToken: b.shareToken, createdAt: b.createdAt.toISOString(),
    subtotalPaise: b.subtotalPaise, discountPaise: b.discountPaise, taxPaise: b.taxPaise, gstRateBp: b.gstRateBp, gstInclusive: b.gstInclusive, gstPaise: b.gstPaise, discountReason: b.discountReason, receivedPaise: b.receivedPaise,
    lines: b.lines.map((l) => ({ id: l.id, name: l.name, unit: l.unit, quantity: l.quantity, ratePaise: l.ratePaise, amountPaise: l.amountPaise })),
    payments: b.payments.map((p) => ({ id: p.id, amountPaise: p.amountPaise, method: p.method, note: p.note, paidOn: p.paidOn.toISOString(), recordedBy: p.recordedBy, shareToken: p.shareToken })),
  }));

  // Kitchen view: what goes out at each serve time
  const allLines = order.bills.flatMap((b) => b.lines);
  const unassignedFood = allLines.filter((l) => !l.servingId && l.group === "FOOD");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 [&>*]:max-w-4xl space-y-5">
      <BackToList href="/caterer/orders" label="Back to orders" />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 truncate">
            <Link href={`/caterer/customers/${order.customer.id}`} className="hover:text-amber-600">{order.customer.name}</Link>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
            <span>{dateLong}</span>
            <Show what="phones"><a href={`tel:${order.customer.phone}`} className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline"><Phone className="h-3.5 w-3.5" />{order.customer.phone}</a></Show>
            {order.place && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{order.place}</span>}
            {order.eventType && <span>{order.eventType}</span>}
          </div>
        </div>
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${STATUS_STYLE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
      </div>

      <CatererOrderActions
        orderId={order.id} status={order.status} shareToken={order.shareToken} date={dateIso}
        customer={{ name: order.customer.name, phone: hidesFor(ctx.session.deny, "phones") ? "" : order.customer.phone }} catererName={ctx.caterer.name}
        bills={order.bills.map((b) => ({ number: b.number, type: b.type, subtotalPaise: b.subtotalPaise, discountPaise: b.discountPaise, taxPaise: b.taxPaise, receivedPaise: b.receivedPaise }))}
      />

      {!cancelled && order.bills.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3"><div className="text-[11px] text-zinc-500">Total</div><div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{rs(totals.net)}</div></div>
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-3"><div className="text-[11px] text-emerald-700 dark:text-emerald-400">Received</div><div className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{rs(totals.received)}</div></div>
          <div className={`rounded-xl border p-3 ${totals.balance > 0 ? "border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
            <div className={`text-[11px] ${totals.balance > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-500"}`}>Balance</div>
            <div className={`text-lg font-bold ${totals.balance > 0 ? "text-red-700 dark:text-red-300" : "text-zinc-400"}`}>{totals.balance > 0 ? rs(totals.balance) : "Nil"}</div>
          </div>
        </div>
      )}

      {(order.servings.length > 0 || order.notes) && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Serve times and kitchen sheet</h2>
          {order.servings.map((s) => {
            const lines = allLines.filter((l) => l.servingId === s.id);
            return (
              <div key={s.id} className="space-y-1">
                <div className="flex items-center gap-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4 text-amber-500" />{s.label} · {formatTime(s.time)}</span>
                  {s.guests && <span className="inline-flex items-center gap-1 text-xs font-normal text-zinc-500"><Users className="h-3.5 w-3.5" />{s.guests} guests</span>}
                </div>
                {lines.length > 0 ? (
                  <ul className="pl-6 text-sm text-zinc-600 dark:text-zinc-400 columns-1 sm:columns-2">
                    {lines.map((l) => <li key={l.id}>{l.name} — {l.quantity} {l.unit}</li>)}
                  </ul>
                ) : <p className="pl-6 text-xs text-zinc-400">No items tied to this time.</p>}
              </div>
            );
          })}
          {unassignedFood.length > 0 && order.servings.length > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 pl-6">Whole event</div>
              <ul className="pl-6 text-sm text-zinc-600 dark:text-zinc-400 columns-1 sm:columns-2">{unassignedFood.map((l) => <li key={l.id}>{l.name} — {l.quantity} {l.unit}</li>)}</ul>
            </div>
          )}
          {order.notes && <p className="rounded-xl bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">{order.notes}</p>}
        </section>
      )}

      {order.team.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Team for this function</h2>
            <Link href={`/caterer/orders/${order.id}/edit`} className="text-xs font-semibold text-amber-600 hover:underline">Change</Link>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {order.team.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/caterer/staff/${t.employeeId}?month=${dateIso.slice(0, 7)}`} className="min-w-0 hover:text-amber-600"><span className="font-medium text-zinc-900 dark:text-zinc-50">{t.employee.name}</span><span className="ml-2 text-xs text-zinc-400">{t.employee.role}</span></Link>
                <span className="flex items-center gap-3 shrink-0">
                  <Show what="salaries"><span className="font-medium">{t.amountPaise > 0 ? rs(t.amountPaise) : <span className="text-xs text-zinc-400">pay not set</span>}</span></Show>
                  <PayStaffButton id={t.employeeId} name={t.employee.name} payType={t.employee.payType as PayTypeKey} toPayPaise={t.amountPaise} compact />
                </span>
              </li>
            ))}
          </ul>
          <Show what="salaries">{teamPaise > 0 && <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2 text-sm"><span className="text-zinc-500">Team pay for this function</span><span className="font-semibold">{rs(teamPaise)}</span></div>}</Show>
        </section>
      )}

      {order.bills.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-sm text-zinc-500">
          No billed items on this order yet. <Link href={`/caterer/orders/${order.id}/edit`} className="font-semibold text-amber-600 hover:underline">Edit the order</Link> to add food, equipment or staff.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {billCards.map((b) => (
            <CatererBillCard key={b.id} bill={b} orderId={order.id} orderDate={dateIso} customer={{ name: order.customer.name, phone: hidesFor(ctx.session.deny, "phones") ? "" : order.customer.phone }} catererName={ctx.caterer.name} cancelled={cancelled} />
          ))}
        </div>
      )}
      {!cancelled && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Cost and profit for this function</h2>
            <Link href="/caterer/purchases/new" className="text-xs font-semibold text-amber-600 hover:underline">+ Add a purchase</Link>
          </div>
          {purchases.length === 0 ? (
            <p className="text-sm text-zinc-400">No purchases tied to this function yet. Pick this function when you record a purchase to see your profit on it.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
              {purchases.map((p) => (
                <li key={p.id}>
                  <Link href={`/caterer/purchases/${p.id}`} className="flex items-center justify-between gap-3 py-2 hover:text-amber-600">
                    <span className="min-w-0 truncate">{p.supplier} <span className="text-xs text-zinc-400">· {p.category}{p.employee ? ` · ${p.employee.name}` : ""}</span></span>
                    <span className="shrink-0 font-medium">{rs(p.totalPaise)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {order.bills.length > 0 && (
            <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-3 text-sm">
              <div><div className="text-[11px] text-zinc-500">Billed</div><div className="font-semibold">{rs(totals.net)}</div></div>
              <div><div className="text-[11px] text-zinc-500">Purchases & team pay</div><div className="font-semibold">{rs(costPaise)}</div></div>
              <Show what="profit"><div><div className="text-[11px] text-zinc-500">Profit</div><div className={totals.net - costPaise < 0 ? "font-bold text-red-600" : "font-bold text-emerald-600"}>{rs(totals.net - costPaise)}</div></div></Show>
            </div>
          )}
        </section>
      )}
      <p className="text-xs text-zinc-400">{Object.values(BILL_LABEL).join(" and ")} are separate invoices. You can share them one by one or together.</p>
    </div>
  );
}
