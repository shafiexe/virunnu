import { db } from "@/lib/db";
import { billMoney, type BillTypeKey } from "@/lib/caterer-orders";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

// "2026-11" → that month; "2026" → that year
export function periodRange(period: "month" | "year", value: string) {
  if (period === "year") {
    const y = parseInt(value);
    return { from: utc(y, 0, 1), to: utc(y, 11, 31), label: String(y) };
  }
  const [y, m] = value.split("-").map(Number);
  return { from: utc(y, m - 1, 1), to: utc(y, m, 0), label: `${MONTHS[m - 1]} ${y}` };
}

// Today in India as a plain date. Money recorded "today" must use this, not the server clock, which is a day behind overnight.
export const todayIST = () => new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00Z");

export const currentMonthValue = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);

// Billed (after discount) for functions in the range, ignoring cancelled ones
export async function billedInRange(catererId: string, from: Date, to: Date) {
  const bills = await db.catererBill.findMany({
    where: { catererId, order: { status: { not: "CANCELLED" }, date: { gte: from, lte: to } } },
    select: { type: true, subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true, order: { select: { date: true } } },
  });
  let total = 0, food = 0, service = 0, received = 0, balance = 0;
  for (const b of bills) {
    const m = billMoney(b);
    total += m.netPaise; received += b.receivedPaise; balance += m.balancePaise;
    if (b.type === "FOOD") food += m.netPaise; else service += m.netPaise;
  }
  return { total, food, service, received, balance, count: bills.length, bills };
}

export async function paymentsInRange(catererId: string, from: Date, to: Date) {
  return db.catererPayment.findMany({
    where: { bill: { catererId }, paidOn: { gte: from, lte: to } },
    orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
    include: { bill: { select: { id: true, number: true, type: true, orderId: true, order: { select: { customer: { select: { id: true, name: true } } } } } } },
  });
}

// Costs in the period: everyday expenses plus purchases (what the bills came to, paid or not).
// `paidTotal` is only what has actually gone out.
export async function expensesInRange(orgId: string, from: Date, to: Date, catererId?: string) {
  const [expenseRows, purchaseRows, staffRows] = await Promise.all([
    db.expense.findMany({ where: { orgId, date: { gte: from, lte: to } }, select: { category: true, amountPaise: true, date: true } }),
    catererId ? db.catererPurchase.findMany({ where: { catererId, date: { gte: from, lte: to } }, select: { category: true, totalPaise: true, date: true } }) : Promise.resolve([]),
    catererId ? db.catererStaffPayment.findMany({ where: { catererId, date: { gte: from, lte: to } }, select: { amountPaise: true, date: true } }) : Promise.resolve([]),
  ]);
  // salary and wages count as a cost when they are paid
  const rows = [
    ...expenseRows,
    ...purchaseRows.map((p) => ({ category: p.category, amountPaise: p.totalPaise, date: p.date })),
    ...staffRows.map((s) => ({ category: "Staff salary & wages", amountPaise: s.amountPaise, date: s.date })),
  ];
  const byCategory = new Map<string, number>();
  let total = 0;
  for (const r of rows) { total += r.amountPaise; byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.amountPaise); }
  const paidPurchases = catererId
    ? (await db.catererPurchasePayment.aggregate({ where: { purchase: { catererId }, paidOn: { gte: from, lte: to } }, _sum: { amountPaise: true } }))._sum.amountPaise ?? 0
    : 0;
  const expenseTotal = expenseRows.reduce((s, r) => s + r.amountPaise, 0);
  const staffTotal = staffRows.reduce((s, r) => s + r.amountPaise, 0);
  return {
    total, byCategory: [...byCategory.entries()].map(([category, totalPaise]) => ({ category, totalPaise })).sort((a, b) => b.totalPaise - a.totalPaise),
    rows, expenseTotal, staffTotal, purchaseTotal: total - expenseTotal - staffTotal, paidTotal: expenseTotal + staffTotal + paidPurchases,
  };
}

// Twelve months of billed vs expenses for the chart
export async function yearByMonth(catererId: string, orgId: string, year: number) {
  const [billed, expenses] = await Promise.all([
    billedInRange(catererId, utc(year, 0, 1), utc(year, 11, 31)),
    expensesInRange(orgId, utc(year, 0, 1), utc(year, 11, 31), catererId),
  ]);
  const months = MONTHS.map((month) => ({ month, revenuePaise: 0, expensePaise: 0 }));
  for (const b of billed.bills) months[b.order.date.getUTCMonth()].revenuePaise += billMoney(b).netPaise;
  for (const e of expenses.rows) months[e.date.getUTCMonth()].expensePaise += e.amountPaise;
  return months;
}

// Everything to date: money in, money out, and what customers still owe
export async function balanceSheet(catererId: string, orgId: string) {
  const [paid, spent, supplierPaid, staffPaid, purchases, bills] = await Promise.all([
    db.catererPayment.aggregate({ where: { bill: { catererId } }, _sum: { amountPaise: true } }),
    db.expense.aggregate({ where: { orgId }, _sum: { amountPaise: true } }),
    db.catererPurchasePayment.aggregate({ where: { purchase: { catererId } }, _sum: { amountPaise: true } }),
    db.catererStaffPayment.aggregate({ where: { catererId }, _sum: { amountPaise: true } }),
    db.catererPurchase.findMany({ where: { catererId }, select: { supplier: true, totalPaise: true, paidPaise: true } }),
    db.catererBill.findMany({
      where: { catererId, order: { status: { not: "CANCELLED" } } },
      select: { type: true, number: true, subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true, order: { select: { date: true, customer: { select: { id: true, name: true, phone: true } } } } },
    }),
  ]);
  const received = paid._sum.amountPaise ?? 0;
  const expenseCost = spent._sum.amountPaise ?? 0;
  const paidToSuppliers = supplierPaid._sum.amountPaise ?? 0;
  const paidToStaff = staffPaid._sum.amountPaise ?? 0;
  const expenses = expenseCost + paidToSuppliers + paidToStaff; // money that has actually gone out
  const supplierDues = new Map<string, { name: string; balancePaise: number }>();
  let payables = 0;
  for (const p of purchases) {
    const due = p.totalPaise - p.paidPaise;
    if (due > 0) {
      payables += due;
      const k = p.supplier.trim().toLowerCase();
      const row = supplierDues.get(k) ?? { name: p.supplier.trim(), balancePaise: 0 };
      row.balancePaise += due;
      supplierDues.set(k, row);
    }
  }

  const dues = new Map<string, { id: string; name: string; phone: string; invoices: number; balancePaise: number }>();
  let receivables = 0, billedAll = 0;
  for (const b of bills) {
    const m = billMoney(b);
    billedAll += m.netPaise;
    if (m.balancePaise > 0) {
      receivables += m.balancePaise;
      const c = b.order.customer;
      const row = dues.get(c.id) ?? { id: c.id, name: c.name, phone: c.phone, invoices: 0, balancePaise: 0 };
      row.invoices += 1; row.balancePaise += m.balancePaise;
      dues.set(c.id, row);
    }
  }
  return {
    received, expenses, expenseCost, paidToSuppliers, paidToStaff, cashInHand: received - expenses, receivables, payables, billedAll,
    position: received - expenses + receivables - payables,
    supplierDues: [...supplierDues.values()].sort((a, b) => b.balancePaise - a.balancePaise),
    dues: [...dues.values()].sort((a, b) => b.balancePaise - a.balancePaise),
  };
}

export type BillSplit = Record<BillTypeKey, number>;
