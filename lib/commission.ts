import { db } from "@/lib/db";

// Virunnu keeps 1% of every payment a customer makes on the website (the whole amount paid, GST included).
// Money the venue records itself (cash, UPI to its own account) is never touched.
export const COMMISSION_BPS = 100;
export const commissionOf = (amountPaise: number) => Math.round((amountPaise * COMMISSION_BPS) / 10_000);

// What Virunnu holds for a venue: online payments less commission, less what has already been sent.
export type PayoutBalance = { onlinePaise: number; commissionPaise: number; paidOutPaise: number; owedPaise: number };

export async function payoutBalances(orgIds?: string[]): Promise<Map<string, PayoutBalance>> {
  const where = { ...(orgIds ? { orgId: { in: orgIds } } : {}) };
  const [online, payouts] = await Promise.all([
    db.bookingPayment.groupBy({ by: ["orgId"], where: { ...where, method: "ONLINE" }, _sum: { amountPaise: true, commissionPaise: true } }),
    db.payout.groupBy({ by: ["orgId"], where, _sum: { amountPaise: true } }),
  ]);
  const out = new Map<string, PayoutBalance>();
  const row = (id: string) => out.get(id) ?? out.set(id, { onlinePaise: 0, commissionPaise: 0, paidOutPaise: 0, owedPaise: 0 }).get(id)!;
  for (const o of online) { const r = row(o.orgId); r.onlinePaise = o._sum.amountPaise ?? 0; r.commissionPaise = o._sum.commissionPaise ?? 0; }
  for (const p of payouts) row(p.orgId).paidOutPaise = p._sum.amountPaise ?? 0;
  for (const r of out.values()) r.owedPaise = r.onlinePaise - r.commissionPaise - r.paidOutPaise;
  return out;
}
