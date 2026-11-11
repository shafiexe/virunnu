import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { parseRange } from "@/lib/caterer-report-range";
import { analyticsInRange, balancesInRange } from "@/lib/caterer-analytics";
import { customerInsights, functionsReport } from "@/lib/caterer-insights";
import { dayBook, KIND_LABEL, METHOD_LABEL } from "@/lib/caterer-books";
import { billMoney, BILL_LABEL } from "@/lib/caterer-orders";

const esc = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rupees = (paise: number) => (paise / 100).toFixed(2);
const csv = (rows: (string | number | null)[][]) => "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";

// Plain CSV files that open in Excel and can be imported into an accounting package.
export async function GET(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const type = req.nextUrl.searchParams.get("type") ?? "daybook";
  const sp = req.nextUrl.searchParams;
  // a custom start and end date, or a whole month
  const range = parseRange({ month: sp.get("month") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined });
  const { from, to } = range;
  const tag = range.kind === "month" ? range.fromKey.slice(0, 7) : `${range.fromKey}_to_${range.toKey}`;
  const orgId = ctx.caterer.orgId!;

  let rows: (string | number | null)[][] = [];
  if (type === "daybook") {
    rows = [["Date", "Type", "Party", "Reference", "Mode", "Amount", "Money in", "Money out"]];
    for (const e of (await dayBook(ctx.caterer.id, orgId, from, to)).reverse()) {
      rows.push([e.date, KIND_LABEL[e.kind], e.party, e.ref, e.method ? METHOD_LABEL[e.method] ?? e.method : "", rupees(e.amountPaise), e.inPaise ? rupees(e.inPaise) : "", e.outPaise ? rupees(e.outPaise) : ""]);
    }
  } else if (type === "sales") {
    rows = [["Invoice no", "Date", "Function date", "Customer", "Phone", "Type", "Sub total", "Discount", "GST added", "Total", "Received", "Balance"]];
    const bills = await db.catererBill.findMany({
      where: { catererId: ctx.caterer.id, order: { status: { not: "CANCELLED" }, date: { gte: from, lte: to } } },
      orderBy: { number: "asc" },
      include: { order: { select: { date: true, customer: { select: { name: true, phone: true } } } } },
    });
    for (const b of bills) {
      const mny = billMoney(b);
      rows.push([b.number, b.createdAt.toISOString().slice(0, 10), b.order.date.toISOString().slice(0, 10), b.order.customer.name, b.order.customer.phone, BILL_LABEL[b.type], rupees(b.subtotalPaise), rupees(b.discountPaise), rupees(b.taxPaise), rupees(mny.netPaise), rupees(b.receivedPaise), rupees(mny.balancePaise)]);
    }
  } else if (type === "purchases") {
    rows = [["Date", "Supplier", "Bill no", "Category", "Bought by", "Function", "Total", "Paid", "Due"]];
    const list = await db.catererPurchase.findMany({
      where: { catererId: ctx.caterer.id, date: { gte: from, lte: to } }, orderBy: { date: "asc" },
      include: { employee: { select: { name: true } }, order: { select: { date: true, customer: { select: { name: true } } } } },
    });
    for (const p of list) rows.push([p.date.toISOString().slice(0, 10), p.supplier, p.billNo ?? "", p.category, p.employee?.name ?? "", p.order ? `${p.order.customer.name} ${p.order.date.toISOString().slice(0, 10)}` : "", rupees(p.totalPaise), rupees(p.paidPaise), rupees(p.totalPaise - p.paidPaise)]);
  } else if (type === "balances") {
    rows = [["Invoice no", "Type", "Customer", "Phone", "Function date", "Total", "Received", "Balance", "Days since function"]];
    const b = await balancesInRange(ctx.caterer.id, from, to);
    for (const r of b.open) rows.push([r.number, BILL_LABEL[r.type as "FOOD" | "SERVICE"], r.customer.name, r.customer.phone, r.functionDate.toISOString().slice(0, 10), rupees(r.netPaise), rupees(r.receivedPaise), rupees(r.balancePaise), r.daysSince]);
    rows.push(["", "", "", "", "Total balance due", "", "", rupees(b.totals.balancePaise), ""]);
  } else if (type === "items") {
    rows = [["Item", "Group", "Unit", "Quantity", "Used in functions", "Average rate", "Billed", "Share of billing %"]];
    const a = await analyticsInRange(ctx.caterer.id, from, to);
    for (const i of [...a.items].sort((x, y) => y.amountPaise - x.amountPaise)) {
      rows.push([i.name, i.group, i.unit, i.quantity, i.functions, rupees(i.avgRatePaise), rupees(i.amountPaise), a.billedPaise > 0 ? ((i.amountPaise / a.billedPaise) * 100).toFixed(1) : "0"]);
    }
  } else if (type === "functions") {
    rows = [["Function date", "Customer", "Event type", "Place", "Guests", "Billed", "Received", "Balance", "Purchases", "Team pay", "Profit", "Margin %", "Costs recorded"]];
    for (const r of await functionsReport(ctx.caterer.id, from, to)) rows.push([r.date.toISOString().slice(0, 10), r.customer, r.eventType ?? "", r.place ?? "", r.guests || "", rupees(r.billedPaise), rupees(r.receivedPaise), rupees(r.balancePaise), rupees(r.purchasesPaise), rupees(r.teamPaise), r.tracked ? rupees(r.profitPaise) : "", r.tracked ? r.marginPct : "", r.tracked ? "yes" : "no"]);
  } else if (type === "customers") {
    rows = [["Customer", "Phone", "Functions", "Billed", "Balance", "Returning"]];
    for (const c of (await customerInsights(ctx.caterer.id, from, to)).customers) rows.push([c.name, c.phone, c.functions, rupees(c.billedPaise), rupees(c.balancePaise), c.repeat ? "yes" : "no"]);
  } else if (type === "expenses") {
    rows = [["Date", "Category", "Label", "Amount"]];
    const list = await db.expense.findMany({ where: { orgId, date: { gte: from, lte: to } }, orderBy: { date: "asc" } });
    for (const e of list) rows.push([e.date.toISOString().slice(0, 10), e.category, e.label, rupees(e.amountPaise)]);
  } else {
    return NextResponse.json({ error: "Unknown export" }, { status: 400 });
  }

  return new NextResponse(csv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${type}-${tag}.csv"` },
  });
}
