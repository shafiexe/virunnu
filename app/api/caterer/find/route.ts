import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { BILL_LABEL, formatInvoiceDate, rs } from "@/lib/caterer-orders";
import { quoteLabel } from "@/lib/caterer-quotes";
import { canOpen } from "@/lib/caterer-access";

type Hit = { kind: string; title: string; sub: string; href: string };

// One search box for the whole book: customers by name or phone, invoices by number, quotations (Q-4), suppliers, team and functions by place.
export async function GET(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 1) return NextResponse.json({ hits: [] });
  const catererId = ctx.caterer.id;
  const digits = q.replace(/\D/g, "");
  const quoteNo = /^q[-\s]?(\d+)$/i.exec(q);
  const invoiceNo = /^#?\s*(\d{1,7})$/.exec(q);
  const word = { contains: q, mode: "insensitive" as const };
  const hits: Hit[] = [];

  const [invoices, quotes, customers, suppliers, staff, orders] = await Promise.all([
    invoiceNo ? db.catererBill.findMany({ where: { catererId, number: Number(invoiceNo[1]) }, include: { order: { select: { id: true, date: true, customer: { select: { name: true } } } } }, take: 3 }) : [],
    quoteNo ? db.catererQuote.findMany({ where: { catererId, number: Number(quoteNo[1]) }, include: { customer: { select: { name: true } } }, take: 3 }) : [],
    db.catererCustomer.findMany({ where: { catererId, OR: [{ name: word }, ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : [])] }, orderBy: { name: "asc" }, take: 6 }),
    q.length >= 2 ? db.catererSupplier.findMany({ where: { catererId, name: word }, take: 4 }) : [],
    q.length >= 2 ? db.employee.findMany({ where: { orgId: ctx.caterer.orgId!, isActive: true, name: word }, take: 4 }) : [],
    q.length >= 3 ? db.catererOrder.findMany({ where: { catererId, status: { not: "CANCELLED" }, OR: [{ place: word }, { eventType: word }] }, orderBy: { date: "desc" }, take: 4, include: { customer: { select: { name: true } } } }) : [],
  ]);

  for (const b of invoices) hits.push({ kind: "Invoice", title: `Invoice #${b.number} · ${BILL_LABEL[b.type]}`, sub: `${b.order.customer.name} · function ${formatInvoiceDate(b.order.date)}`, href: `/caterer/orders/${b.order.id}` });
  for (const k of quotes) hits.push({ kind: "Quotation", title: `Quotation ${quoteLabel(k.number)}`, sub: `${k.customer.name} · ${rs(k.totalPaise)}`, href: `/caterer/quotes/${k.id}` });
  for (const c of customers) hits.push({ kind: "Customer", title: c.name, sub: c.phone, href: `/caterer/customers/${c.id}` });
  for (const o of orders) hits.push({ kind: "Order", title: `${o.customer.name} · ${o.eventType ?? "Function"}${o.place ? `, ${o.place}` : ""}`, sub: formatInvoiceDate(o.date), href: `/caterer/orders/${o.id}` });
  for (const s of suppliers) hits.push({ kind: "Supplier", title: s.name, sub: s.category ?? "Supplier", href: `/caterer/suppliers/${s.id}` });
  for (const e of staff) hits.push({ kind: "Team", title: e.name, sub: e.role, href: `/caterer/staff/${e.id}` });
  // only what this person is allowed to open
  return NextResponse.json({ hits: hits.filter((h) => canOpen(ctx.session.deny, h.href)) });
}
