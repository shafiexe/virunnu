import Razorpay from "razorpay";
import { db } from "@/lib/db";
import { COMMISSION_BPS, commissionOf, feeOf, owedOf, type PayoutBalance } from "@/lib/commission-math";

export { COMMISSION_BPS, commissionOf, feeOf, owedOf };
export type { PayoutBalance };

// Payments whose Razorpay fee was not known at the time are asked about again here (a few at a time, so a page never waits long).
export async function fillMissingFees(limit = 20): Promise<void> {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return;
  const rows = await db.bookingPayment.findMany({
    where: { method: "ONLINE", gatewayFeePaise: null, booking: { razorpayPaymentId: { not: null } } },
    select: { id: true, booking: { select: { razorpayPaymentId: true } } },
    take: limit,
  });
  if (rows.length === 0) return;
  const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  await Promise.all(rows.map(async (r) => {
    try {
      const fee = feeOf(await rz.payments.fetch(r.booking.razorpayPaymentId!));
      if (fee !== null) await db.bookingPayment.update({ where: { id: r.id }, data: { gatewayFeePaise: fee } });
    } catch { /* Razorpay did not answer: it is asked again next time */ }
  }));
}

export async function payoutBalances(orgIds?: string[]): Promise<Map<string, PayoutBalance>> {
  const where = { ...(orgIds ? { orgId: { in: orgIds } } : {}) };
  const [online, unknown, payouts] = await Promise.all([
    db.bookingPayment.groupBy({ by: ["orgId"], where: { ...where, method: "ONLINE" }, _sum: { amountPaise: true, commissionPaise: true, gatewayFeePaise: true } }),
    db.bookingPayment.groupBy({ by: ["orgId"], where: { ...where, method: "ONLINE", gatewayFeePaise: null }, _count: { _all: true } }),
    db.payout.groupBy({ by: ["orgId"], where, _sum: { amountPaise: true } }),
  ]);
  const out = new Map<string, PayoutBalance>();
  const row = (id: string) => out.get(id) ?? out.set(id, { onlinePaise: 0, commissionPaise: 0, gatewayFeePaise: 0, unknownFees: 0, paidOutPaise: 0, owedPaise: 0 }).get(id)!;
  for (const o of online) { const r = row(o.orgId); r.onlinePaise = o._sum.amountPaise ?? 0; r.commissionPaise = o._sum.commissionPaise ?? 0; r.gatewayFeePaise = o._sum.gatewayFeePaise ?? 0; }
  for (const u of unknown) row(u.orgId).unknownFees = u._count._all;
  for (const p of payouts) row(p.orgId).paidOutPaise = p._sum.amountPaise ?? 0;
  for (const r of out.values()) r.owedPaise = owedOf(r);
  return out;
}
