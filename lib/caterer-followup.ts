import { db } from "@/lib/db";
import { billMoney } from "@/lib/caterer-orders";
import { openBillIds } from "@/lib/caterer-analytics";
import { todayIST } from "@/lib/caterer-finance";

const DAY = 86400000;
// After a reminder, a customer rests this many days before reappearing at the top of the list
export const REST_DAYS = 3;

// Customers who owe money for functions held at least `afterDays` ago: who to call today, longest-waiting and biggest first.
export async function followUpList(catererId: string, afterDays: number) {
  const ids = await openBillIds(catererId);
  const bills = ids.length
    ? await db.catererBill.findMany({
        where: { id: { in: ids } },
        select: {
          id: true, number: true, type: true, shareToken: true, subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true,
          order: { select: { date: true, customer: { select: { id: true, name: true, phone: true, shareToken: true, lastRemindedAt: true } } } },
        },
      })
    : [];
  const today = todayIST().getTime();
  const cutoff = today - afterDays * DAY;
  const byCustomer = new Map<string, {
    id: string; name: string; phone: string; shareToken: string; lastRemindedAt: Date | null; balancePaise: number; oldest: Date;
    bills: { id: string; number: number; type: "FOOD" | "SERVICE"; balancePaise: number }[];
  }>();
  for (const b of bills) {
    const c = b.order.customer;
    const bal = billMoney(b).balancePaise;
    const row = byCustomer.get(c.id) ?? { ...c, balancePaise: 0, oldest: b.order.date, bills: [] };
    row.balancePaise += bal;
    if (b.order.date < row.oldest) row.oldest = b.order.date;
    row.bills.push({ id: b.id, number: b.number, type: b.type, balancePaise: bal });
    byCustomer.set(c.id, row);
  }
  const all = [...byCustomer.values()].filter((c) => c.oldest.getTime() <= cutoff);
  const daysWaiting = (d: Date) => Math.max(0, Math.floor((today - d.getTime()) / DAY));
  const restUntil = (c: { lastRemindedAt: Date | null }) => (c.lastRemindedAt ? c.lastRemindedAt.getTime() + REST_DAYS * DAY : 0);
  const rows = all.map((c) => ({ ...c, days: daysWaiting(c.oldest), resting: restUntil(c) > Date.now(), bills: c.bills.sort((a, b) => a.number - b.number) }));
  const byWeight = (a: { days: number; balancePaise: number }, b: { days: number; balancePaise: number }) => b.days - a.days || b.balancePaise - a.balancePaise;
  return {
    toCall: rows.filter((r) => !r.resting).sort(byWeight),
    resting: rows.filter((r) => r.resting).sort(byWeight),
    totalPaise: rows.reduce((s, r) => s + r.balancePaise, 0),
  };
}
