import { db } from "@/lib/db";
import { splitForVenue } from "@/lib/gst";
import { METHOD_LABEL, bookingRef } from "@/lib/booking-ledger";

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const day = (d: Date) => d.toISOString().slice(0, 10);

export function parseMonth(raw: string | undefined, now = new Date()) {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(raw ?? "");
  const year = m ? Number(m[1]) : now.getFullYear();
  const month = m ? Number(m[2]) : now.getMonth() + 1;
  const key = `${year}-${String(month).padStart(2, "0")}`;
  return { year, month, key, label: `${MONTH_NAMES[month - 1]} ${year}`, from: new Date(Date.UTC(year, month - 1, 1)), to: new Date(Date.UTC(year, month, 1)) };
}

export const shiftMonth = (key: string, by: number) => {
  const { year, month } = parseMonth(key);
  const d = new Date(Date.UTC(year, month - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

export type SaleRow = { bookingId: string; ref: string; eventDate: string; customer: string; hall: string; slot: string; status: string; grossPaise: number; discountPaise: number; netPaise: number; basePaise: number; cgstPaise: number; sgstPaise: number; receivedPaise: number; balancePaise: number };
export type ReceiptRow = { date: string; customer: string; ref: string; method: string; amountPaise: number; note: string | null };
export type ExpenseRow = { date: string; category: string; label: string; amountPaise: number; notes: string | null };
export type YearRow = { month: number; label: string; billedPaise: number; basePaise: number; gstPaise: number; receivedPaise: number; expensesPaise: number; profitPaise: number };

const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);

// What an accountant needs for one month, and the twelve months around it. Nothing is estimated: every figure is added up from the
// bookings, the recorded payments and the expenses.
//  - Sales:    bookings for events held in the month (not cancelled), by the amount billed after discount, with the GST inside it.
//  - Received: payments recorded as received in the month, whatever event they were for, less refunds given.
//  - Profit:   money received less expenses; and billed (before GST) less expenses.
export async function monthReport(orgId: string, key: string) {
  const p = parseMonth(key);
  const yearFrom = new Date(Date.UTC(p.year, 0, 1));
  const yearTo = new Date(Date.UTC(p.year + 1, 0, 1));

  const [bookings, payments, expenses, refunded] = await Promise.all([
    db.booking.findMany({
      where: { orgId, status: { in: ["CONFIRMED", "ADVANCE_PAID"] }, hallSlot: { date: { gte: yearFrom, lt: yearTo } } },
      include: {
        user: { select: { name: true } },
        payments: { select: { amountPaise: true } },
        hallSlot: { include: { template: { select: { name: true } }, hall: { select: { name: true, venue: { select: { gstEnabled: true, gstRate: true } } } } } },
      },
      orderBy: { hallSlot: { date: "asc" } },
    }),
    db.bookingPayment.findMany({
      where: { orgId, paidOn: { gte: yearFrom, lt: yearTo } },
      include: { booking: { select: { id: true, guestName: true, user: { select: { name: true } } } } },
      orderBy: [{ paidOn: "asc" }, { createdAt: "asc" }],
    }),
    db.expense.findMany({ where: { orgId, date: { gte: yearFrom, lt: yearTo } }, orderBy: { date: "asc" } }),
    // money handed back on cancelled bookings, by the month the booking was cancelled
    db.booking.findMany({ where: { orgId, status: "CANCELLED", refundPaise: { gt: 0 }, updatedAt: { gte: yearFrom, lt: yearTo } }, select: { refundPaise: true, updatedAt: true } }),
  ]);

  const allSales: (SaleRow & { monthIndex: number })[] = bookings.map((b) => {
    const venue = b.hallSlot.hall.venue;
    const net = b.totalPaise - (b.discountPaise ?? 0);
    const s = splitForVenue(net, venue);
    const received = b.payments.reduce((t, x) => t + x.amountPaise, 0);
    return {
      bookingId: b.id, ref: bookingRef(b.id), eventDate: day(b.hallSlot.date), monthIndex: b.hallSlot.date.getUTCMonth(),
      customer: b.user?.name ?? b.guestName ?? "Guest", hall: b.hallSlot.hall.name, slot: b.hallSlot.template.name, status: b.status === "CONFIRMED" ? "Confirmed" : "Advance paid",
      grossPaise: b.totalPaise, discountPaise: b.discountPaise ?? 0, netPaise: net, basePaise: s.basePaise, cgstPaise: s.cgstPaise, sgstPaise: s.sgstPaise,
      receivedPaise: received, balancePaise: Math.max(0, net - received),
    };
  });

  const inMonth = (d: Date) => d >= p.from && d < p.to;
  const sales = allSales.filter((s) => s.monthIndex === p.month - 1);
  const receiptRows: ReceiptRow[] = payments.filter((x) => inMonth(x.paidOn)).map((x) => ({
    date: day(x.paidOn), customer: x.booking.user?.name ?? x.booking.guestName ?? "Guest", ref: bookingRef(x.booking.id), method: METHOD_LABEL[x.method] ?? x.method, amountPaise: x.amountPaise, note: x.note,
  }));
  const expenseRows: ExpenseRow[] = expenses.filter((x) => inMonth(x.date)).map((x) => ({ date: day(x.date), category: x.category, label: x.label, amountPaise: x.amountPaise, notes: x.notes }));

  const byMethod = new Map<string, number>();
  for (const r of receiptRows) byMethod.set(r.method, (byMethod.get(r.method) ?? 0) + r.amountPaise);
  const byCategory = new Map<string, number>();
  for (const r of expenseRows) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.amountPaise);

  const refundsPaise = sum(refunded.filter((r) => inMonth(r.updatedAt)), (r) => r.refundPaise ?? 0);
  const receivedPaise = sum(receiptRows, (r) => r.amountPaise) - refundsPaise;
  const expensesPaise = sum(expenseRows, (r) => r.amountPaise);
  const summary = {
    count: sales.length, billedPaise: sum(sales, (s) => s.netPaise), discountPaise: sum(sales, (s) => s.discountPaise), basePaise: sum(sales, (s) => s.basePaise),
    cgstPaise: sum(sales, (s) => s.cgstPaise), sgstPaise: sum(sales, (s) => s.sgstPaise), gstPaise: sum(sales, (s) => s.cgstPaise + s.sgstPaise),
    balancePaise: sum(sales, (s) => s.balancePaise), receivedPaise, refundsPaise, expensesPaise,
    profitCashPaise: receivedPaise - expensesPaise,
  };

  const year: YearRow[] = MONTH_NAMES.map((name, i) => {
    const s = allSales.filter((x) => x.monthIndex === i);
    const rec = sum(payments.filter((x) => x.paidOn.getUTCMonth() === i), (x) => x.amountPaise) - sum(refunded.filter((r) => r.updatedAt.getUTCMonth() === i), (r) => r.refundPaise ?? 0);
    const exp = sum(expenses.filter((x) => x.date.getUTCMonth() === i), (x) => x.amountPaise);
    return { month: i + 1, label: name.slice(0, 3), billedPaise: sum(s, (x) => x.netPaise), basePaise: sum(s, (x) => x.basePaise), gstPaise: sum(s, (x) => x.cgstPaise + x.sgstPaise), receivedPaise: rec, expensesPaise: exp, profitPaise: rec - exp };
  });

  return {
    period: p, summary, sales, receipts: receiptRows, expenses: expenseRows, year,
    methods: [...byMethod].map(([method, amountPaise]) => ({ method, amountPaise })).sort((a, b) => b.amountPaise - a.amountPaise),
    categories: [...byCategory].map(([category, amountPaise]) => ({ category, amountPaise })).sort((a, b) => b.amountPaise - a.amountPaise),
    gstOn: bookings.some((b) => b.hallSlot.hall.venue.gstEnabled),
  };
}

export type MonthReport = Awaited<ReturnType<typeof monthReport>>;
