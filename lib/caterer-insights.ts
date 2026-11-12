import { db } from "@/lib/db";
import { billMoney } from "@/lib/caterer-orders";
import { MONTHS, billedInRange, expensesInRange, paymentsInRange } from "@/lib/caterer-finance";
import { analyticsInRange, balancesInRange, openBillIds, openPurchaseIds } from "@/lib/caterer-analytics";

const DAY = 86400000;
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const FOOD_COST_CATEGORIES = ["Meat", "Fish", "Chicken", "Vegetables", "Groceries", "Raw material", "Meat & fish", "Vegetables & groceries"];

export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

// The same number of days straight before the chosen range, for "compared with last time"
export function previousRange(from: Date, to: Date) {
  const days = Math.round((to.getTime() - from.getTime()) / DAY) + 1;
  const prevTo = new Date(from.getTime() - DAY);
  return { from: new Date(prevTo.getTime() - (days - 1) * DAY), to: prevTo, days };
}

async function snapshot(catererId: string, orgId: string, from: Date, to: Date) {
  const [billed, payments, costs, orders] = await Promise.all([
    billedInRange(catererId, from, to),
    paymentsInRange(catererId, from, to),
    expensesInRange(orgId, from, to, catererId),
    db.catererOrder.count({ where: { catererId, status: { not: "CANCELLED" }, date: { gte: from, lte: to } } }),
  ]);
  const received = payments.reduce((s, p) => s + p.amountPaise, 0);
  const profit = billed.total - costs.total;
  return {
    functions: orders, billed: billed.total, food: billed.food, service: billed.service, receivedOnBills: billed.received, balance: billed.balance,
    collected: received, costs: costs.total, paidOut: costs.paidTotal, profit, margin: pct(profit, billed.total),
    avgPerFunction: orders ? Math.round(billed.total / orders) : 0, collectionRate: pct(billed.received, billed.total),
    costRows: costs.byCategory,
  };
}
export type Snapshot = Awaited<ReturnType<typeof snapshot>>;

// Billed, costs and profit for each of the 12 months ending with the month of `to`
export async function monthlyTrend(catererId: string, orgId: string, to: Date) {
  const endY = to.getUTCFullYear(), endM = to.getUTCMonth();
  const start = utc(endY, endM - 11, 1);
  const end = utc(endY, endM + 1, 0);
  const [billed, costs] = await Promise.all([billedInRange(catererId, start, end), expensesInRange(orgId, start, end, catererId)]);
  const rows = Array.from({ length: 12 }, (_, i) => {
    const d = utc(endY, endM - 11 + i, 1);
    return { key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, month: MONTHS[d.getUTCMonth()], year: d.getUTCFullYear(), revenuePaise: 0, expensePaise: 0, functions: 0 };
  });
  const at = (d: Date) => rows.find((r) => r.key === `${d.getUTCFullYear()}-${d.getUTCMonth()}`);
  for (const b of billed.bills) { const r = at(b.order.date); if (r) r.revenuePaise += billMoney(b).netPaise; }
  for (const e of costs.rows) { const r = at(e.date); if (r) r.expensePaise += e.amountPaise; }
  return rows;
}

export type Insight = { tone: "good" | "warn" | "info"; text: string };
const money = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export async function overviewData(catererId: string, orgId: string, from: Date, to: Date) {
  const prev = previousRange(from, to);
  const [now, before, trend, a, aging] = await Promise.all([
    snapshot(catererId, orgId, from, to), snapshot(catererId, orgId, prev.from, prev.to),
    monthlyTrend(catererId, orgId, to), analyticsInRange(catererId, from, to), agingReport(catererId),
  ]);

  const delta = (cur: number, was: number) => (was > 0 ? Math.round(((cur - was) / was) * 1000) / 10 : null);
  const insights: Insight[] = [];
  const dBilled = delta(now.billed, before.billed);
  if (dBilled !== null) insights.push({ tone: dBilled >= 0 ? "good" : "warn", text: `Billing is ${dBilled >= 0 ? "up" : "down"} ${Math.abs(dBilled)}% compared with the previous ${prev.days} days (${money(before.billed)} before).` });
  else if (now.billed > 0) insights.push({ tone: "info", text: `You billed ${money(now.billed)} in this period; there is nothing in the period before to compare with.` });
  if (now.billed > 0) insights.push({ tone: now.margin >= 20 ? "good" : now.margin >= 0 ? "info" : "warn", text: now.profit >= 0 ? `Profit is ${money(now.profit)}, a ${now.margin}% margin on billing.` : `Costs are higher than billing: a loss of ${money(-now.profit)} in this period.` });
  const top = [...a.items].sort((x, y) => y.amountPaise - x.amountPaise)[0];
  if (top && a.billedPaise > 0) insights.push({ tone: "info", text: `${top.name} is your biggest earner: ${pct(top.amountPaise, a.billedPaise)}% of billing, used in ${top.functions} of ${a.functions} functions.` });
  const old = aging.receivable.filter((b) => b.key !== "upcoming" && b.key !== "d0_30").reduce((s, b) => s + b.paise, 0);
  if (old > 0) insights.push({ tone: "warn", text: `${money(old)} from customers has been waiting more than 30 days after the function. See Money → Aging.` });
  const foodCost = (await db.catererPurchase.findMany({ where: { catererId, date: { gte: from, lte: to }, category: { in: FOOD_COST_CATEGORIES } }, select: { totalPaise: true } })).reduce((s, p) => s + p.totalPaise, 0);
  if (now.food > 0 && foodCost > 0) { const fc = pct(foodCost, now.food); insights.push({ tone: fc <= 40 ? "good" : "warn", text: `Food ingredients cost ${fc}% of food billing (${money(foodCost)} of ${money(now.food)}).` }); }
  const best = [...a.weekdays].sort((x, y) => y.billedPaise - x.billedPaise)[0];
  if (best && best.billedPaise > 0) insights.push({ tone: "info", text: `${best.day} is your busiest day: ${best.count} function${best.count === 1 ? "" : "s"}, ${money(best.billedPaise)} billed.` });
  if (now.collectionRate > 0 && now.collectionRate < 80 && now.billed > 0) insights.push({ tone: "warn", text: `Only ${now.collectionRate}% of what you billed in this period has been collected so far.` });

  return { now, before, prev, trend, insights, delta: {
    billed: dBilled, functions: delta(now.functions, before.functions), avg: delta(now.avgPerFunction, before.avgPerFunction),
    collected: delta(now.collected, before.collected), costs: delta(now.costs, before.costs), profit: delta(now.profit, before.profit),
  } };
}

// ── Sales ──────────────────────────────────────────────────────────────────
export async function salesTrend(catererId: string, from: Date, to: Date) {
  const orders = await db.catererOrder.findMany({
    where: { catererId, status: { not: "CANCELLED" }, date: { gte: from, lte: to } },
    select: { date: true, eventType: true, place: true, servings: { select: { guests: true } }, bills: { select: { subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true } } },
  });
  const months = new Map<string, { label: string; functions: number; billedPaise: number }>();
  const types = new Map<string, { type: string; functions: number; billedPaise: number; guests: number }>();
  const places = new Map<string, { place: string; functions: number; billedPaise: number }>();
  let billed = 0, guests = 0;
  for (const o of orders) {
    const net = o.bills.reduce((s, b) => s + billMoney(b).netPaise, 0);
    const g = o.servings.reduce((s, x) => s + (x.guests ?? 0), 0);
    billed += net; guests += g;
    const mk = `${o.date.getUTCFullYear()}-${String(o.date.getUTCMonth()).padStart(2, "0")}`;
    const m = months.get(mk) ?? { label: `${MONTHS[o.date.getUTCMonth()]} ${o.date.getUTCFullYear()}`, functions: 0, billedPaise: 0 };
    m.functions++; m.billedPaise += net; months.set(mk, m);
    const tk = (o.eventType ?? "Not set").trim() || "Not set";
    const t = types.get(tk) ?? { type: tk, functions: 0, billedPaise: 0, guests: 0 };
    t.functions++; t.billedPaise += net; t.guests += g; types.set(tk, t);
    if (o.place) { const pk = o.place.trim().toLowerCase(); const p = places.get(pk) ?? { place: o.place.trim(), functions: 0, billedPaise: 0 }; p.functions++; p.billedPaise += net; places.set(pk, p); }
  }
  return {
    functions: orders.length, billedPaise: billed, guests,
    perGuestPaise: guests > 0 ? Math.round(billed / guests) : 0,
    months: [...months.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, v]) => v),
    types: [...types.values()].sort((a, b) => b.billedPaise - a.billedPaise),
    places: [...places.values()].sort((a, b) => b.billedPaise - a.billedPaise).slice(0, 8),
  };
}

export async function customerInsights(catererId: string, from: Date, to: Date) {
  const orders = await db.catererOrder.findMany({
    where: { catererId, status: { not: "CANCELLED" }, date: { gte: from, lte: to } },
    select: { customerId: true, customer: { select: { id: true, name: true, phone: true } }, bills: { select: { subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true } } },
  });
  const ids = [...new Set(orders.map((o) => o.customerId))];
  const earlier = ids.length ? await db.catererOrder.groupBy({ by: ["customerId"], where: { catererId, customerId: { in: ids }, status: { not: "CANCELLED" }, date: { lt: from } }, _count: true }) : [];
  const returning = new Set(earlier.map((e) => e.customerId));
  const map = new Map<string, { id: string; name: string; phone: string; functions: number; billedPaise: number; balancePaise: number; repeat: boolean }>();
  for (const o of orders) {
    const net = o.bills.reduce((s, b) => s + billMoney(b).netPaise, 0);
    const bal = o.bills.reduce((s, b) => s + billMoney(b).balancePaise, 0);
    const c = map.get(o.customerId) ?? { ...o.customer, functions: 0, billedPaise: 0, balancePaise: 0, repeat: returning.has(o.customerId) };
    c.functions++; c.billedPaise += net; c.balancePaise += bal;
    map.set(o.customerId, c);
  }
  const list = [...map.values()].sort((a, b) => b.billedPaise - a.billedPaise);
  const total = list.reduce((s, c) => s + c.billedPaise, 0);
  const top5 = list.slice(0, 5).reduce((s, c) => s + c.billedPaise, 0);
  const repeat = list.filter((c) => c.repeat || c.functions > 1);
  return {
    customers: list, total, count: list.length, functions: orders.length,
    newCount: list.filter((c) => !c.repeat).length, returningCount: list.filter((c) => c.repeat).length, multiCount: list.filter((c) => c.functions > 1).length,
    repeatBilledPaise: repeat.reduce((s, c) => s + c.billedPaise, 0), top5Share: pct(top5, total),
    avgFunctions: list.length ? Math.round((orders.length / list.length) * 10) / 10 : 0,
  };
}

export async function functionsReport(catererId: string, from: Date, to: Date) {
  const orders = await db.catererOrder.findMany({
    where: { catererId, status: { not: "CANCELLED" }, date: { gte: from, lte: to } },
    orderBy: { date: "desc" },
    select: {
      id: true, date: true, eventType: true, place: true, customer: { select: { name: true } },
      servings: { select: { guests: true } }, team: { select: { amountPaise: true } }, purchases: { select: { totalPaise: true } },
      bills: { select: { subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true } },
    },
  });
  const rows = orders.map((o) => {
    const billed = o.bills.reduce((s, b) => s + billMoney(b).netPaise, 0);
    const received = o.bills.reduce((s, b) => s + b.receivedPaise, 0);
    const purchases = o.purchases.reduce((s, p) => s + p.totalPaise, 0);
    const team = o.team.reduce((s, t) => s + t.amountPaise, 0);
    const guests = o.servings.reduce((s, x) => s + (x.guests ?? 0), 0);
    const cost = purchases + team;
    return { id: o.id, date: o.date, customer: o.customer.name, eventType: o.eventType, place: o.place, guests, billedPaise: billed, receivedPaise: received, balancePaise: Math.max(0, billed - received), purchasesPaise: purchases, teamPaise: team, costPaise: cost, profitPaise: billed - cost, marginPct: pct(billed - cost, billed), tracked: cost > 0 };
  });
  return rows;
}

// ── Costs ──────────────────────────────────────────────────────────────────
export async function costReport(catererId: string, orgId: string, from: Date, to: Date) {
  const [costs, billed, purchases, guestRows] = await Promise.all([
    expensesInRange(orgId, from, to, catererId),
    billedInRange(catererId, from, to),
    db.catererPurchase.findMany({ where: { catererId, date: { gte: from, lte: to } }, select: { supplier: true, category: true, totalPaise: true, paidPaise: true } }),
    db.catererServing.findMany({ where: { order: { catererId, status: { not: "CANCELLED" }, date: { gte: from, lte: to } } }, select: { guests: true } }),
  ]);
  const guests = guestRows.reduce((s, g) => s + (g.guests ?? 0), 0);
  const suppliers = new Map<string, { name: string; category: string; bills: number; totalPaise: number; paidPaise: number }>();
  for (const p of purchases) {
    const k = p.supplier.trim().toLowerCase();
    const s = suppliers.get(k) ?? { name: p.supplier.trim(), category: p.category, bills: 0, totalPaise: 0, paidPaise: 0 };
    s.bills++; s.totalPaise += p.totalPaise; s.paidPaise += p.paidPaise;
    suppliers.set(k, s);
  }
  const foodCost = purchases.filter((p) => FOOD_COST_CATEGORIES.includes(p.category)).reduce((s, p) => s + p.totalPaise, 0);
  return {
    total: costs.total, byCategory: costs.byCategory, billedPaise: billed.total, foodBilledPaise: billed.food,
    suppliers: [...suppliers.values()].sort((a, b) => b.totalPaise - a.totalPaise),
    purchaseTotal: costs.purchaseTotal, expenseTotal: costs.expenseTotal, staffTotal: costs.staffTotal,
    foodCostPaise: foodCost, foodCostPct: pct(foodCost, billed.food), costPct: pct(costs.total, billed.total),
    perGuestPaise: guests > 0 ? Math.round(costs.total / guests) : 0, guests,
  };
}

export async function staffReport(catererId: string, orgId: string, from: Date, to: Date) {
  const [pays, billed, jobs, people] = await Promise.all([
    db.catererStaffPayment.findMany({ where: { catererId, date: { gte: from, lte: to } }, select: { employeeId: true, amountPaise: true, kind: true } }),
    billedInRange(catererId, from, to),
    db.catererOrderStaff.findMany({ where: { order: { catererId, status: { not: "CANCELLED" }, date: { gte: from, lte: to } } }, select: { employeeId: true, amountPaise: true } }),
    db.employee.findMany({ where: { orgId }, select: { id: true, name: true, role: true, payType: true, isActive: true } }),
  ]);
  const rows = people.map((p) => {
    const mine = pays.filter((x) => x.employeeId === p.id);
    const myJobs = jobs.filter((j) => j.employeeId === p.id);
    return {
      id: p.id, name: p.name, role: p.role, payType: p.payType, active: p.isActive,
      paidPaise: mine.reduce((s, x) => s + x.amountPaise, 0), advancePaise: mine.filter((x) => x.kind === "ADVANCE").reduce((s, x) => s + x.amountPaise, 0),
      functions: myJobs.length, agreedPaise: myJobs.reduce((s, j) => s + j.amountPaise, 0),
    };
  }).filter((r) => r.paidPaise > 0 || r.functions > 0).sort((a, b) => b.paidPaise - a.paidPaise);
  const paid = rows.reduce((s, r) => s + r.paidPaise, 0);
  const byType = ["MONTHLY", "DAILY"].map((t) => ({ type: t, paidPaise: rows.filter((r) => r.payType === t).reduce((s, r) => s + r.paidPaise, 0), people: rows.filter((r) => r.payType === t).length }));
  return { rows, paidPaise: paid, billedPaise: billed.total, shareOfBilling: pct(paid, billed.total), byType };
}

// ── Aging: how long money has been waiting ─────────────────────────────────
const BUCKETS = [
  { key: "upcoming", label: "Function not held yet", min: -99999, max: -1 },
  { key: "d0_30", label: "0–30 days", min: 0, max: 30 },
  { key: "d31_60", label: "31–60 days", min: 31, max: 60 },
  { key: "d61_90", label: "61–90 days", min: 61, max: 90 },
  { key: "d90", label: "Over 90 days", min: 91, max: 99999 },
] as const;

export async function agingReport(catererId: string) {
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00Z").getTime();
  const [billIds, purchaseIds] = await Promise.all([openBillIds(catererId), openPurchaseIds(catererId)]);
  const [bills, purchases] = await Promise.all([
    db.catererBill.findMany({
      where: { id: { in: billIds } },
      select: { number: true, type: true, subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true, orderId: true, order: { select: { date: true, customer: { select: { id: true, name: true, phone: true } } } } },
    }),
    db.catererPurchase.findMany({ where: { id: { in: purchaseIds } }, select: { id: true, date: true, supplier: true, supplierId: true, totalPaise: true, paidPaise: true } }),
  ]);
  const bucket = (days: number) => BUCKETS.find((b) => days >= b.min && days <= b.max)!.key;
  const receivable = BUCKETS.map((b) => ({ key: b.key, label: b.label, paise: 0, count: 0 }));
  const owing: { number: number; type: string; orderId: string; customer: { id: string; name: string; phone: string }; days: number; balancePaise: number; functionDate: Date }[] = [];
  for (const b of bills) {
    const bal = billMoney(b).balancePaise;
    if (bal <= 0) continue;
    const days = Math.floor((today - b.order.date.getTime()) / DAY);
    const k = bucket(days); const r = receivable.find((x) => x.key === k)!; r.paise += bal; r.count++;
    owing.push({ number: b.number, type: b.type, orderId: b.orderId, customer: b.order.customer, days, balancePaise: bal, functionDate: b.order.date });
  }
  const payable = BUCKETS.filter((b) => b.key !== "upcoming").map((b) => ({ key: b.key, label: b.label.replace("Function not held yet", ""), paise: 0, count: 0 }));
  const owed: { id: string; supplier: string; supplierId: string | null; days: number; duePaise: number; date: Date }[] = [];
  for (const p of purchases) {
    const due = p.totalPaise - p.paidPaise;
    if (due <= 0) continue;
    const days = Math.max(0, Math.floor((today - p.date.getTime()) / DAY));
    const k = bucket(days); const r = payable.find((x) => x.key === k)!; r.paise += due; r.count++;
    owed.push({ id: p.id, supplier: p.supplier, supplierId: p.supplierId, days, duePaise: due, date: p.date });
  }
  return {
    receivable, owing: owing.sort((a, b) => b.days - a.days || b.balancePaise - a.balancePaise), receivableTotal: receivable.reduce((s, r) => s + r.paise, 0),
    payable, owed: owed.sort((a, b) => b.days - a.days), payableTotal: payable.reduce((s, r) => s + r.paise, 0),
  };
}

export { balancesInRange };
