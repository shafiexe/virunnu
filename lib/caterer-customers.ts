import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { billMoney } from "@/lib/caterer-orders";

// Customers with what they've been billed, have paid and still owe. Cancelled functions don't count.
export async function customerSummaries(catererId: string, filter?: { search?: string; phone?: string }) {
  const search = filter?.search?.trim();
  const customers = await db.catererCustomer.findMany({
    where: {
      catererId,
      ...(filter?.phone ? { phone: filter.phone } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, ...(/^[\d\s+()-]+$/.test(search) ? [{ phone: { contains: search.replace(/\D/g, "") } }] : [])] } : {}),
    },
    include: {
      orders: {
        select: { id: true, date: true, status: true, bills: { select: { subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return customers.map((c) => {
    const live = c.orders.filter((o) => o.status !== "CANCELLED");
    let billed = 0, received = 0, balance = 0, bills = 0;
    for (const o of live) {
      for (const b of o.bills) {
        const m = billMoney(b);
        billed += m.netPaise; received += b.receivedPaise; balance += m.balancePaise; bills++;
      }
    }
    const last = c.orders.length ? c.orders.reduce((a, o) => (o.date > a ? o.date : a), c.orders[0].date) : null;
    return {
      id: c.id, name: c.name, phone: c.phone, address: c.address, shareToken: c.shareToken,
      orderCount: live.length, billCount: bills, billedPaise: billed, receivedPaise: received, balancePaise: balance,
      lastDate: last ? last.toISOString().slice(0, 10) : null,
    };
  });
}

type Row = {
  id: string; name: string; phone: string; address: string | null; shareToken: string;
  orderCount: bigint; billCount: bigint; billed: bigint; received: bigint; balance: bigint; lastDate: Date | null;
};

// One page of customers, with search, the "has balance" filter and the money sums all done in the database,
// so the list stays fast however many customers and invoices there are.
export async function customerPage(catererId: string, opts: { search?: string; dueOnly?: boolean; page: number; pageSize: number }) {
  const search = opts.search?.trim() ?? "";
  const numeric = /^[\d\s+()-]+$/.test(search);
  const like = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  const phoneLike = `%${search.replace(/\D/g, "")}%`;
  const filter = search
    ? Prisma.sql`AND (c."name" ILIKE ${like} ${numeric ? Prisma.sql`OR c."phone" LIKE ${phoneLike}` : Prisma.empty})`
    : Prisma.empty;
  const having = opts.dueOnly ? Prisma.sql`HAVING COALESCE(SUM(GREATEST(0, GREATEST(0, b."subtotalPaise" - b."discountPaise" + b."taxPaise") - b."receivedPaise")) FILTER (WHERE o."status" <> 'CANCELLED'), 0) > 0` : Prisma.empty;

  const base = Prisma.sql`
    FROM "CatererCustomer" c
    LEFT JOIN "CatererOrder" o ON o."customerId" = c."id"
    LEFT JOIN "CatererBill" b ON b."orderId" = o."id"
    WHERE c."catererId" = ${catererId} ${filter}
    GROUP BY c."id" ${having}`;

  const [{ n }] = await db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM (SELECT c."id" ${base}) t`;
  const total = Number(n);
  const totalPages = Math.max(1, Math.ceil(total / opts.pageSize));
  const page = Math.min(opts.page, totalPages);

  const rows = await db.$queryRaw<Row[]>`
    SELECT c."id", c."name", c."phone", c."address", c."shareToken",
      COUNT(DISTINCT o."id") FILTER (WHERE o."status" <> 'CANCELLED') AS "orderCount",
      COUNT(b."id") FILTER (WHERE o."status" <> 'CANCELLED') AS "billCount",
      COALESCE(SUM(GREATEST(0, b."subtotalPaise" - b."discountPaise" + b."taxPaise")) FILTER (WHERE o."status" <> 'CANCELLED'), 0) AS "billed",
      COALESCE(SUM(b."receivedPaise") FILTER (WHERE o."status" <> 'CANCELLED'), 0) AS "received",
      COALESCE(SUM(GREATEST(0, GREATEST(0, b."subtotalPaise" - b."discountPaise" + b."taxPaise") - b."receivedPaise")) FILTER (WHERE o."status" <> 'CANCELLED'), 0) AS "balance",
      MAX(o."date") AS "lastDate"
    ${base}
    ORDER BY ${opts.dueOnly ? Prisma.sql`"balance" DESC, c."name" ASC` : Prisma.sql`c."name" ASC`}
    LIMIT ${opts.pageSize} OFFSET ${(page - 1) * opts.pageSize}`;

  // header figures for the whole book, independent of the filters
  const [all] = await db.$queryRaw<{ customers: bigint; due: bigint }[]>`
    SELECT (SELECT COUNT(*) FROM "CatererCustomer" WHERE "catererId" = ${catererId}) AS customers,
      COALESCE(SUM(GREATEST(0, GREATEST(0, b."subtotalPaise" - b."discountPaise" + b."taxPaise") - b."receivedPaise")), 0) AS due
    FROM "CatererBill" b JOIN "CatererOrder" o ON o."id" = b."orderId"
    WHERE b."catererId" = ${catererId} AND o."status" <> 'CANCELLED'`;

  return {
    rows: rows.map((r) => ({
      id: r.id, name: r.name, phone: r.phone, address: r.address, shareToken: r.shareToken,
      orderCount: Number(r.orderCount), billCount: Number(r.billCount),
      billedPaise: Number(r.billed), receivedPaise: Number(r.received), balancePaise: Number(r.balance),
      lastDate: r.lastDate ? r.lastDate.toISOString().slice(0, 10) : null,
    })),
    total, totalPages, page, pageSize: opts.pageSize,
    totalCustomers: Number(all.customers), totalDuePaise: Number(all.due),
  };
}
