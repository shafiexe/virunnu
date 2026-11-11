import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { billMoney } from "@/lib/caterer-orders";

// Ids of invoices that still have a balance, found in the database so a book with years of paid invoices stays quick.
export async function openBillIds(catererId: string, range?: { from: Date; to: Date }) {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT b."id" FROM "CatererBill" b JOIN "CatererOrder" o ON o."id" = b."orderId"
    WHERE b."catererId" = ${catererId} AND o."status" <> 'CANCELLED'
      AND GREATEST(0, b."subtotalPaise" - b."discountPaise" + b."taxPaise") > b."receivedPaise"
      ${range ? Prisma.sql`AND o."date" >= ${range.from} AND o."date" <= ${range.to}` : Prisma.empty}`;
  return rows.map((r) => r.id);
}

export async function openPurchaseIds(catererId: string, range?: { from: Date; to: Date }) {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "CatererPurchase"
    WHERE "catererId" = ${catererId} AND "totalPaise" > "paidPaise"
      ${range ? Prisma.sql`AND "date" >= ${range.from} AND "date" <= ${range.to}` : Prisma.empty}`;
  return rows.map((r) => r.id);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// What is still owed on invoices for functions in the range, newest function first.
export async function balancesInRange(catererId: string, from: Date, to: Date) {
  const ids = await openBillIds(catererId, { from, to });
  const [bills, [t]] = await Promise.all([
    db.catererBill.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, number: true, type: true, shareToken: true, subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true, orderId: true,
        order: { select: { date: true, customer: { select: { id: true, name: true, phone: true } } } },
      },
    }),
    // headline figures for every invoice in the range, summed in the database
    db.$queryRaw<{ invoices: bigint; billed: bigint; received: bigint }[]>`
      SELECT COUNT(*) AS invoices, COALESCE(SUM(GREATEST(0, b."subtotalPaise" - b."discountPaise" + b."taxPaise")), 0) AS billed, COALESCE(SUM(b."receivedPaise"), 0) AS received
      FROM "CatererBill" b JOIN "CatererOrder" o ON o."id" = b."orderId"
      WHERE b."catererId" = ${catererId} AND o."status" <> 'CANCELLED' AND o."date" >= ${from} AND o."date" <= ${to}`,
  ]);
  const today = Date.now();
  const open = bills.map((b) => {
    const m = billMoney(b);
    return {
      id: b.id, number: b.number, type: b.type, shareToken: b.shareToken, orderId: b.orderId, customer: b.order.customer, functionDate: b.order.date,
      netPaise: m.netPaise, receivedPaise: b.receivedPaise, balancePaise: m.balancePaise,
      daysSince: Math.max(0, Math.floor((today - b.order.date.getTime()) / 86400000)),
    };
  }).sort((a, b) => b.balancePaise - a.balancePaise);
  const byCustomer = new Map<string, { id: string; name: string; phone: string; invoices: number; balancePaise: number }>();
  for (const r of open) {
    const c = byCustomer.get(r.customer.id) ?? { id: r.customer.id, name: r.customer.name, phone: r.customer.phone, invoices: 0, balancePaise: 0 };
    c.invoices++; c.balancePaise += r.balancePaise;
    byCustomer.set(r.customer.id, c);
  }
  return {
    open,
    customers: [...byCustomer.values()].sort((a, b) => b.balancePaise - a.balancePaise),
    totals: {
      invoices: Number(t.invoices),
      billedPaise: Number(t.billed),
      receivedPaise: Number(t.received),
      balancePaise: open.reduce((s, r) => s + r.balancePaise, 0),
      closed: Number(t.invoices) - open.length,
    },
  };
}

// Supplier bills in the range that are not fully paid.
export async function supplierDuesInRange(catererId: string, from: Date, to: Date) {
  const ids = await openPurchaseIds(catererId, { from, to });
  const rows = await db.catererPurchase.findMany({
    where: { id: { in: ids } },
    select: { id: true, date: true, supplier: true, supplierId: true, category: true, totalPaise: true, paidPaise: true },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({ ...r, duePaise: r.totalPaise - r.paidPaise }));
}

export type ItemStat = { name: string; group: string; unit: string; quantity: number; amountPaise: number; functions: number; avgRatePaise: number };

// Which items were sold, how much, in how many functions, and what share of the billing they made.
export async function analyticsInRange(catererId: string, from: Date, to: Date) {
  const orders = await db.catererOrder.findMany({
    where: { catererId, status: { not: "CANCELLED" }, date: { gte: from, lte: to } },
    select: {
      id: true, date: true, customer: { select: { id: true, name: true } },
      servings: { select: { guests: true } },
      bills: { select: { subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true, lines: { select: { name: true, group: true, unit: true, quantity: true, amountPaise: true } } } },
      purchases: { select: { totalPaise: true } },
      team: { select: { amountPaise: true } },
    },
  });

  const items = new Map<string, ItemStat & { fnSet: Set<string> }>();
  const groups: Record<string, number> = {};
  const weekdays = WEEKDAYS.map((d) => ({ day: d, count: 0, billedPaise: 0 }));
  const customers = new Map<string, { id: string; name: string; functions: number; billedPaise: number }>();
  let billed = 0, guests = 0, lineCount = 0;
  const functionsProfit: { id: string; date: Date; customer: string; billedPaise: number; costPaise: number }[] = [];

  for (const o of orders) {
    let orderNet = 0;
    for (const b of o.bills) {
      orderNet += billMoney(b).netPaise;
      // discounts are spread over the bill's lines in proportion, so item revenue adds up to what was actually billed
      const factor = b.subtotalPaise > 0 ? Math.max(0, b.subtotalPaise - b.discountPaise) / b.subtotalPaise : 1;
      for (const l of b.lines) {
        lineCount++;
        const k = `${l.name.trim().toLowerCase()}|${l.unit}`;
        const row = items.get(k) ?? { name: l.name, group: l.group, unit: l.unit, quantity: 0, amountPaise: 0, functions: 0, avgRatePaise: 0, fnSet: new Set<string>() };
        const amt = Math.round(l.amountPaise * factor);
        row.quantity += l.quantity; row.amountPaise += amt; row.fnSet.add(o.id);
        items.set(k, row);
        groups[l.group] = (groups[l.group] ?? 0) + amt;
      }
    }
    billed += orderNet;
    guests += o.servings.reduce((s, x) => s + (x.guests ?? 0), 0);
    const wd = weekdays[o.date.getUTCDay()];
    wd.count++; wd.billedPaise += orderNet;
    const c = customers.get(o.customer.id) ?? { id: o.customer.id, name: o.customer.name, functions: 0, billedPaise: 0 };
    c.functions++; c.billedPaise += orderNet;
    customers.set(o.customer.id, c);
    functionsProfit.push({ id: o.id, date: o.date, customer: o.customer.name, billedPaise: orderNet, costPaise: o.purchases.reduce((s, p) => s + p.totalPaise, 0) + o.team.reduce((s, t) => s + t.amountPaise, 0) });
  }

  const itemList: ItemStat[] = [...items.values()].map(({ fnSet, ...r }) => ({ ...r, functions: fnSet.size, avgRatePaise: r.quantity > 0 ? Math.round(r.amountPaise / r.quantity) : 0 }));
  return {
    functions: orders.length,
    billedPaise: billed,
    guests,
    lineCount,
    distinctItems: itemList.length,
    avgPerFunctionPaise: orders.length ? Math.round(billed / orders.length) : 0,
    items: itemList,
    groups: Object.entries(groups).map(([group, amountPaise]) => ({ group, amountPaise })).sort((a, b) => b.amountPaise - a.amountPaise),
    weekdays,
    customers: [...customers.values()].sort((a, b) => b.billedPaise - a.billedPaise),
    functionsProfit: functionsProfit.map((f) => ({ ...f, profitPaise: f.billedPaise - f.costPaise })),
  };
}
