import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CYCLE_DAYS, type SupplierCycleKey } from "@/lib/caterer-suppliers";
import { todayIST } from "@/lib/caterer-finance";

type Tx = Prisma.TransactionClient;

// The supplier for a purchase: the one picked from the list, or one filed by name the first time it is used.
export async function resolveSupplier(tx: Tx, catererId: string, d: { supplier: string; supplierId?: string; category?: string }) {
  if (d.supplierId) {
    const picked = await tx.catererSupplier.findFirst({ where: { id: d.supplierId, catererId } });
    if (picked) return picked;
  }
  const name = d.supplier.trim();
  const existing = await tx.catererSupplier.findFirst({ where: { catererId, name: { equals: name, mode: "insensitive" } } });
  if (existing) return existing;
  return tx.catererSupplier.create({ data: { catererId, name, category: d.category ?? "Other" } });
}

// Purchases saved before suppliers had their own list are filed under suppliers by name.
export async function syncSuppliers(catererId: string) {
  const loose = await db.catererPurchase.findMany({ where: { catererId, supplierId: null }, select: { id: true, supplier: true, category: true } });
  if (loose.length === 0) return;
  await db.$transaction(async (tx) => {
    for (const p of loose) {
      const s = await resolveSupplier(tx, catererId, { supplier: p.supplier, category: p.category });
      await tx.catererPurchase.update({ where: { id: p.id }, data: { supplierId: s.id } });
    }
  });
}

// Each supplier with what has been bought, paid and is owed, and whether payment is overdue for their cycle.
export async function supplierOverview(catererId: string) {
  await syncSuppliers(catererId);
  const suppliers = await db.catererSupplier.findMany({
    where: { catererId },
    include: { purchases: { select: { date: true, totalPaise: true, paidPaise: true } } },
    orderBy: { name: "asc" },
  });
  const today = todayIST().getTime();
  return suppliers.map((s) => {
    let total = 0, paid = 0;
    let oldestUnpaid: Date | null = null;
    for (const p of s.purchases) {
      total += p.totalPaise; paid += p.paidPaise;
      if (p.totalPaise > p.paidPaise && (!oldestUnpaid || p.date < oldestUnpaid)) oldestUnpaid = p.date;
    }
    const waitDays = oldestUnpaid ? Math.floor((today - oldestUnpaid.getTime()) / 86400000) : 0;
    const limit = CYCLE_DAYS[s.cycle as SupplierCycleKey];
    return {
      id: s.id, name: s.name, phone: s.phone, category: s.category, cycle: s.cycle as SupplierCycleKey, notes: s.notes, active: s.active,
      billCount: s.purchases.length, totalPaise: total, paidPaise: paid, duePaise: total - paid,
      oldestUnpaid: oldestUnpaid ? oldestUnpaid.toISOString().slice(0, 10) : null,
      overdue: total - paid > 0 && limit > 0 && waitDays > limit, waitDays,
    };
  });
}

// One payment to a supplier, spread over their unpaid bills oldest first, so the ledger stays right bill by bill.
export async function settleSupplier(tx: Tx, supplierId: string, amountPaise: number, d: { method: string; note?: string; paidOn?: string }) {
  const bills = await tx.catererPurchase.findMany({ where: { supplierId }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
  const due = bills.reduce((s, b) => s + (b.totalPaise - b.paidPaise), 0);
  if (amountPaise > due) throw new Error(`OVER:${due}`);
  let left = amountPaise;
  const paidOn = d.paidOn ? new Date(d.paidOn) : todayIST();
  for (const b of bills) {
    if (left <= 0) break;
    const owed = b.totalPaise - b.paidPaise;
    if (owed <= 0) continue;
    const take = Math.min(owed, left);
    await tx.catererPurchasePayment.create({ data: { purchaseId: b.id, amountPaise: take, method: d.method, note: d.note ?? "Account settlement", paidOn } });
    await tx.catererPurchase.update({ where: { id: b.id }, data: { paidPaise: { increment: take } } });
    left -= take;
  }
}
