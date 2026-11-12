import { db } from "@/lib/db";
import { BILL_LABEL, billMoney } from "@/lib/caterer-orders";

export type EntryKind = "SALE" | "RECEIPT" | "PURCHASE" | "PAYMENT" | "SALARY" | "EXPENSE";

export const KIND_LABEL: Record<EntryKind, string> = {
  SALE: "Sale", RECEIPT: "Receipt", PURCHASE: "Purchase", PAYMENT: "Payment", SALARY: "Salary", EXPENSE: "Expense",
};
// Plain words for people who know the accountant's names
export const KIND_HINT: Record<EntryKind, string> = {
  SALE: "Invoice raised", RECEIPT: "Money received", PURCHASE: "Bill from a supplier", PAYMENT: "Money paid to a supplier", SALARY: "Salary, wages or advance paid to the team", EXPENSE: "Money spent",
};

export type DayBookEntry = {
  date: string; // YYYY-MM-DD
  kind: EntryKind;
  party: string;
  ref: string;
  method: string | null;
  amountPaise: number;
  inPaise: number;   // cash/bank in
  outPaise: number;  // cash/bank out
  href: string;
};

const ist = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const day = (d: Date) => d.toISOString().slice(0, 10);

// Every money event and every bill in date order. Sales and purchases are on credit until a receipt or payment follows.
export async function dayBook(catererId: string, orgId: string, from: Date, to: Date): Promise<DayBookEntry[]> {
  const fromTs = new Date(from.getTime() - 86400000);
  const toTs = new Date(to.getTime() + 2 * 86400000);
  const [bills, receipts, purchases, payments, staffPay, expenses] = await Promise.all([
    db.catererBill.findMany({
      where: { catererId, createdAt: { gte: fromTs, lte: toTs }, order: { status: { not: "CANCELLED" } } },
      select: { id: true, type: true, number: true, createdAt: true, subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true, orderId: true, order: { select: { customer: { select: { name: true } } } } },
    }),
    db.catererPayment.findMany({
      where: { bill: { catererId }, paidOn: { gte: from, lte: to } },
      select: { id: true, amountPaise: true, method: true, paidOn: true, recordedBy: true, bill: { select: { number: true, type: true, orderId: true, order: { select: { customer: { select: { name: true } } } } } } },
    }),
    db.catererPurchase.findMany({ where: { catererId, date: { gte: from, lte: to } }, select: { id: true, date: true, supplier: true, billNo: true, totalPaise: true, category: true } }),
    db.catererPurchasePayment.findMany({
      where: { purchase: { catererId }, paidOn: { gte: from, lte: to } },
      select: { id: true, amountPaise: true, method: true, paidOn: true, recordedBy: true, purchase: { select: { id: true, supplier: true, billNo: true } } },
    }),
    db.catererStaffPayment.findMany({ where: { catererId, date: { gte: from, lte: to } }, select: { id: true, date: true, amountPaise: true, kind: true, method: true, employeeId: true, employee: { select: { name: true } } } }),
    db.expense.findMany({ where: { orgId, date: { gte: from, lte: to } }, select: { id: true, date: true, category: true, label: true, amountPaise: true } }),
  ]);

  const entries: DayBookEntry[] = [];
  const fromKey = day(from), toKey = day(to);
  for (const b of bills) {
    const date = ist(b.createdAt);
    if (date < fromKey || date > toKey) continue;
    entries.push({ date, kind: "SALE", party: b.order.customer.name, ref: `Invoice #${b.number} · ${BILL_LABEL[b.type]}`, method: null, amountPaise: billMoney(b).netPaise, inPaise: 0, outPaise: 0, href: `/caterer/orders/${b.orderId}` });
  }
  for (const r of receipts) entries.push({ date: day(r.paidOn), kind: "RECEIPT", party: r.bill.order.customer.name, ref: `Invoice #${r.bill.number}${r.recordedBy ? ` · by ${r.recordedBy}` : ""}`, method: r.method, amountPaise: r.amountPaise, inPaise: r.amountPaise, outPaise: 0, href: `/caterer/orders/${r.bill.orderId}` });
  for (const p of purchases) entries.push({ date: day(p.date), kind: "PURCHASE", party: p.supplier, ref: `${p.billNo ? `Bill ${p.billNo} · ` : ""}${p.category}`, method: null, amountPaise: p.totalPaise, inPaise: 0, outPaise: 0, href: `/caterer/purchases/${p.id}` });
  for (const p of payments) entries.push({ date: day(p.paidOn), kind: "PAYMENT", party: p.purchase.supplier, ref: `${p.purchase.billNo ? `Bill ${p.purchase.billNo}` : "Supplier payment"}${p.recordedBy ? ` · by ${p.recordedBy}` : ""}`, method: p.method, amountPaise: p.amountPaise, inPaise: 0, outPaise: p.amountPaise, href: `/caterer/purchases/${p.purchase.id}` });
  const KIND_WORDS: Record<string, string> = { SALARY: "Salary", WAGE: "Daily wages", ADVANCE: "Advance", OTHER: "Bonus / other" };
  for (const s of staffPay) entries.push({ date: day(s.date), kind: "SALARY", party: s.employee.name, ref: KIND_WORDS[s.kind] ?? s.kind, method: s.method, amountPaise: s.amountPaise, inPaise: 0, outPaise: s.amountPaise, href: `/caterer/staff/${s.employeeId}?month=${day(s.date).slice(0, 7)}` });
  for (const e of expenses) entries.push({ date: day(e.date), kind: "EXPENSE", party: e.category, ref: e.label, method: "CASH", amountPaise: e.amountPaise, inPaise: 0, outPaise: e.amountPaise, href: "/caterer/expenses" });

  const order: Record<EntryKind, number> = { SALE: 0, PURCHASE: 1, RECEIPT: 2, PAYMENT: 3, SALARY: 4, EXPENSE: 5 };
  return entries.sort((a, b) => (a.date === b.date ? order[a.kind] - order[b.kind] : a.date < b.date ? 1 : -1));
}

const METHODS = ["CASH", "UPI", "CARD", "BANK"] as const;
export const METHOD_LABEL: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card", BANK: "Bank" };

// Money in and out for each way of paying, with the balance carried forward from before the period.
export async function cashBook(catererId: string, orgId: string, from: Date, to: Date) {
  const sum = async (before: Date | null, upto: Date | null) => {
    const dateFilter = (field: string) => ({ [field]: { ...(before ? { gte: before } : {}), ...(upto ? { lte: upto } : {}) } });
    const [rec, pay, staff, exp] = await Promise.all([
      db.catererPayment.groupBy({ by: ["method"], where: { bill: { catererId }, ...dateFilter("paidOn") }, _sum: { amountPaise: true } }),
      db.catererPurchasePayment.groupBy({ by: ["method"], where: { purchase: { catererId }, ...dateFilter("paidOn") }, _sum: { amountPaise: true } }),
      db.catererStaffPayment.groupBy({ by: ["method"], where: { catererId, ...dateFilter("date") }, _sum: { amountPaise: true } }),
      db.expense.aggregate({ where: { orgId, ...dateFilter("date") }, _sum: { amountPaise: true } }),
    ]);
    const out: Record<string, { in: number; out: number }> = Object.fromEntries(METHODS.map((m) => [m, { in: 0, out: 0 }]));
    for (const r of rec) out[r.method] = { ...(out[r.method] ?? { in: 0, out: 0 }), in: (out[r.method]?.in ?? 0) + (r._sum.amountPaise ?? 0) };
    for (const p of pay) out[p.method] = { ...(out[p.method] ?? { in: 0, out: 0 }), out: (out[p.method]?.out ?? 0) + (p._sum.amountPaise ?? 0) };
    for (const p of staff) out[p.method] = { ...(out[p.method] ?? { in: 0, out: 0 }), out: (out[p.method]?.out ?? 0) + (p._sum.amountPaise ?? 0) };
    // everyday expenses don't record how they were paid, so they come out of cash
    out.CASH.out += exp._sum.amountPaise ?? 0;
    return out;
  };
  const dayBefore = new Date(from.getTime() - 86400000);
  const [opening, period] = await Promise.all([sum(null, dayBefore), sum(from, to)]);
  return METHODS.map((m) => {
    const o = opening[m].in - opening[m].out;
    return { method: m, openingPaise: o, inPaise: period[m].in, outPaise: period[m].out, closingPaise: o + period[m].in - period[m].out };
  });
}

// Everyone the team buys from, with what has been bought, paid and is still owed
export async function supplierSummaries(catererId: string) {
  const purchases = await db.catererPurchase.findMany({ where: { catererId }, select: { supplier: true, totalPaise: true, paidPaise: true, date: true } });
  const map = new Map<string, { name: string; count: number; totalPaise: number; paidPaise: number; last: Date }>();
  for (const p of purchases) {
    const k = p.supplier.trim().toLowerCase();
    const row = map.get(k) ?? { name: p.supplier.trim(), count: 0, totalPaise: 0, paidPaise: 0, last: p.date };
    row.count++; row.totalPaise += p.totalPaise; row.paidPaise += p.paidPaise;
    if (p.date > row.last) row.last = p.date;
    map.set(k, row);
  }
  return [...map.values()].map((r) => ({ ...r, balancePaise: r.totalPaise - r.paidPaise })).sort((a, b) => b.balancePaise - a.balancePaise || a.name.localeCompare(b.name));
}

export async function supplierStatement(catererId: string, supplier: string) {
  return db.catererPurchase.findMany({
    where: { catererId, supplier: { equals: supplier, mode: "insensitive" } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { payments: { orderBy: { paidOn: "asc" } }, employee: { select: { name: true } } },
  });
}

export async function spendByPerson(catererId: string, from: Date, to: Date) {
  const rows = await db.catererPurchase.groupBy({ by: ["employeeId"], where: { catererId, date: { gte: from, lte: to } }, _sum: { totalPaise: true }, _count: true });
  const ids = rows.map((r) => r.employeeId).filter((x): x is string => !!x);
  const people = ids.length ? await db.employee.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  return rows.map((r) => ({ id: r.employeeId, name: people.find((p) => p.id === r.employeeId)?.name ?? "Not recorded", totalPaise: r._sum.totalPaise ?? 0, count: r._count })).sort((a, b) => b.totalPaise - a.totalPaise);
}
