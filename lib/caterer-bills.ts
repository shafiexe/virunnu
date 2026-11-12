import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { computeGst } from "@/lib/caterer-gst";
import { billTypeOfGroup, lineAmountPaise, normalizeCustomerPhone, BILL_TYPES, type BillTypeKey, type OrderInput } from "@/lib/caterer-orders";

type Tx = Prisma.TransactionClient;

// Work out a bill's GST again from its items and discount, using the GST it was made with. Call after any change to either.
export async function retax(tx: Tx, billId: string) {
  const b = await tx.catererBill.findUnique({ where: { id: billId }, select: { subtotalPaise: true, discountPaise: true, gstRateBp: true, gstInclusive: true } });
  if (!b) return;
  const { gstPaise, taxPaise } = computeGst(b.subtotalPaise, b.discountPaise, b);
  await tx.catererBill.update({ where: { id: billId }, data: { gstPaise, taxPaise } });
}

// Find the customer by phone, or file them; the name is only filled in the first time so a typo later can't rename them.
export async function upsertCustomer(tx: Tx, catererId: string, d: { customerName: string; customerPhone: string; customerAddress?: string }) {
  const phone = normalizeCustomerPhone(d.customerPhone);
  const existing = await tx.catererCustomer.findUnique({ where: { catererId_phone: { catererId, phone } } });
  if (existing) {
    if (d.customerAddress && d.customerAddress !== existing.address) {
      return tx.catererCustomer.update({ where: { id: existing.id }, data: { address: d.customerAddress } });
    }
    return existing;
  }
  return tx.catererCustomer.create({ data: { catererId, name: d.customerName, phone, address: d.customerAddress } });
}

export function groupLines(lines: OrderInput["lines"]) {
  const out: Record<BillTypeKey, (OrderInput["lines"][number] & { ratePaise: number; amountPaise: number })[]> = { FOOD: [], SERVICE: [] };
  for (const l of lines) {
    const ratePaise = Math.round(l.rate * 100);
    out[billTypeOfGroup(l.group)].push({ ...l, ratePaise, amountPaise: lineAmountPaise(l.quantity, ratePaise) });
  }
  return out;
}

export const nextInvoiceNumber = async (tx: Tx, catererId: string) => {
  const seq = await tx.caterer.update({ where: { id: catererId }, data: { nextInvoiceNumber: { increment: 1 } }, select: { nextInvoiceNumber: true } });
  return seq.nextInvoiceNumber - 1;
};

export { BILL_TYPES };

export async function loadOrder(orderId: string, catererId: string) {
  return db.catererOrder.findFirst({
    where: { id: orderId, catererId },
    include: {
      customer: true,
      servings: { orderBy: { sortOrder: "asc" } },
      team: { include: { employee: { select: { id: true, name: true, role: true, payType: true } } }, orderBy: { employee: { name: "asc" } } },
      bills: {
        orderBy: { number: "asc" },
        include: { lines: { orderBy: { sortOrder: "asc" } }, payments: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
}

const billInclude = {
  order: { include: { customer: true, caterer: true, servings: { orderBy: { sortOrder: "asc" as const } } } },
  lines: { orderBy: { sortOrder: "asc" as const } },
  payments: { orderBy: { createdAt: "asc" as const } },
};

// Public links carry an unguessable token instead of a login.
export const loadBillByToken = (token: string) => db.catererBill.findUnique({ where: { shareToken: token }, include: billInclude });

export const loadOrderByToken = (token: string) =>
  db.catererOrder.findUnique({
    where: { shareToken: token },
    include: {
      customer: true, caterer: true,
      bills: { orderBy: { number: "asc" }, include: { lines: { orderBy: { sortOrder: "asc" } }, payments: { orderBy: { createdAt: "asc" } } } },
    },
  });

// Every bill a customer has, across all their functions, newest first.
export const loadStatement = (where: { shareToken: string } | { id: string; catererId: string }) =>
  db.catererCustomer.findFirst({
    where,
    include: {
      caterer: true,
      orders: {
        orderBy: { date: "desc" },
        include: { bills: { orderBy: { number: "asc" } } },
      },
    },
  });

// Only people on this team's own staff list can be put on a function.
export async function validTeam(orgId: string, team: { employeeId: string; amount: number }[] | undefined) {
  if (!team?.length) return { ok: true as const, rows: [] as { employeeId: string; amountPaise: number }[] };
  const ids = [...new Set(team.map((t) => t.employeeId))];
  const found = await db.employee.count({ where: { id: { in: ids }, orgId } });
  if (found !== ids.length) return { ok: false as const };
  const seen = new Set<string>();
  const rows = team.filter((t) => (seen.has(t.employeeId) ? false : (seen.add(t.employeeId), true))).map((t) => ({ employeeId: t.employeeId, amountPaise: Math.round(t.amount * 100) }));
  return { ok: true as const, rows };
}

// A daily-wage person put on a function is marked present that day, so their wage is counted without a second step.
export async function markTeamAttendance(tx: Tx, catererId: string, date: Date, employeeIds: string[]) {
  if (!employeeIds.length) return;
  const daily = await tx.employee.findMany({ where: { id: { in: employeeIds }, payType: "DAILY" }, select: { id: true } });
  for (const e of daily) {
    await tx.catererAttendance.upsert({
      where: { employeeId_date: { employeeId: e.id, date } },
      create: { catererId, employeeId: e.id, date, units: 1 },
      update: {},
    });
  }
}
