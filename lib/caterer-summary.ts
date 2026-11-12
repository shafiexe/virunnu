import { db } from "@/lib/db";
import { cashBook } from "@/lib/caterer-books";
import { billMoney, formatInvoiceDate, formatTime, rs } from "@/lib/caterer-orders";
import { getAppUrl } from "@/lib/app-url";
import { normalizeCustomerPhone } from "@/lib/caterer-orders";
import { quoteState } from "@/lib/caterer-quotes";
import { sendRawMail, sendRawWhatsApp, whatsappAutoOn } from "@/services/notification.service";

type SummaryCaterer = { id: string; orgId: string | null; name: string; phone: string; whatsappNumber: string | null; email: string | null; summaryVia: string; summaryEmail: string | null };

const istKey = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// The day in short: money in and out, what was billed, tomorrow's functions, and who still owes.
export async function buildSummary(caterer: SummaryCaterer, now = new Date()) {
  const key = istKey(now);
  const day = new Date(key + "T00:00:00Z");
  const tomorrow = new Date(day.getTime() + 86400000);
  const startOfDay = new Date(key + "T00:00:00+05:30");
  const endOfDay = new Date(startOfDay.getTime() + 86400000);

  const [cash, billsToday, nextUp, owedRows, topOwing, supplierOwed, enquiries, quotes] = await Promise.all([
    cashBook(caterer.id, caterer.orgId!, day, day),
    db.catererBill.findMany({
      where: { catererId: caterer.id, createdAt: { gte: startOfDay, lt: endOfDay }, order: { status: { not: "CANCELLED" } } },
      select: { subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true },
    }),
    db.catererOrder.findMany({
      where: { catererId: caterer.id, status: { not: "CANCELLED" }, date: tomorrow },
      orderBy: { createdAt: "asc" },
      select: { place: true, eventType: true, customer: { select: { name: true, phone: true } }, servings: { orderBy: { sortOrder: "asc" }, select: { label: true, time: true, guests: true } } },
    }),
    db.$queryRaw<{ total: bigint; old: bigint; invoices: bigint }[]>`
      SELECT COALESCE(SUM(bal), 0) AS total, COALESCE(SUM(bal) FILTER (WHERE o."date" < ${new Date(day.getTime() - 30 * 86400000)}), 0) AS old, COUNT(*) AS invoices
      FROM (SELECT b."orderId", GREATEST(0, GREATEST(0, b."subtotalPaise" - b."discountPaise" + b."taxPaise") - b."receivedPaise") AS bal FROM "CatererBill" b WHERE b."catererId" = ${caterer.id}) x
      JOIN "CatererOrder" o ON o."id" = x."orderId" WHERE o."status" <> 'CANCELLED' AND bal > 0`,
    db.$queryRaw<{ name: string; phone: string; bal: bigint }[]>`
      SELECT c."name", c."phone", SUM(GREATEST(0, GREATEST(0, b."subtotalPaise" - b."discountPaise" + b."taxPaise") - b."receivedPaise")) AS bal
      FROM "CatererBill" b JOIN "CatererOrder" o ON o."id" = b."orderId" JOIN "CatererCustomer" c ON c."id" = o."customerId"
      WHERE b."catererId" = ${caterer.id} AND o."status" <> 'CANCELLED'
      GROUP BY c."id" HAVING SUM(GREATEST(0, GREATEST(0, b."subtotalPaise" - b."discountPaise" + b."taxPaise") - b."receivedPaise")) > 0
      ORDER BY bal DESC LIMIT 5`,
    db.$queryRaw<{ due: bigint }[]>`SELECT COALESCE(SUM("totalPaise" - "paidPaise"), 0) AS due FROM "CatererPurchase" WHERE "catererId" = ${caterer.id} AND "totalPaise" > "paidPaise"`,
    db.cateringEnquiry.count({ where: { catererId: caterer.id, status: "PENDING" } }),
    db.catererQuote.findMany({ where: { catererId: caterer.id, status: "OPEN" }, select: { status: true, validUntil: true, totalPaise: true } }),
  ]);

  const moneyIn = cash.reduce((s, m) => s + m.inPaise, 0);
  const moneyOut = cash.reduce((s, m) => s + m.outPaise, 0);
  const billed = billsToday.reduce((s, b) => s + billMoney(b).netPaise, 0);
  const owing = Number(owedRows[0]?.total ?? 0), old = Number(owedRows[0]?.old ?? 0);
  const openQuotes = quotes.filter((q) => quoteState(q, now) === "OPEN");

  const lines: string[] = [];
  lines.push(`*${caterer.name}*`, `Today, ${formatInvoiceDate(day)}`, ``);
  lines.push(`*Money today*`, `In: ${rs(moneyIn)}`, `Out: ${rs(moneyOut)}`, `Net: ${rs(moneyIn - moneyOut)}`);
  if (billsToday.length > 0) lines.push(`Billed today: ${rs(billed)} (${billsToday.length} invoice${billsToday.length === 1 ? "" : "s"})`);
  lines.push(``, `*Tomorrow, ${formatInvoiceDate(tomorrow)}*`);
  if (nextUp.length === 0) lines.push(`No functions booked.`);
  for (const o of nextUp) {
    const times = o.servings.map((s) => `${s.label} ${formatTime(s.time)}${s.guests ? ` · ${s.guests}` : ""}`).join(", ");
    lines.push(`• ${o.customer.name}${o.place ? ` — ${o.place}` : ""}${times ? ` (${times})` : ""}`);
  }
  lines.push(``, `*Who owes you*`);
  if (owing === 0) lines.push(`Nobody. All invoices are paid.`);
  else {
    lines.push(`Total: *${rs(owing)}*${old > 0 ? ` (${rs(old)} is over 30 days old)` : ""}`);
    for (const c of topOwing) lines.push(`• ${c.name} — ${rs(Number(c.bal))}`);
  }
  const owedSuppliers = Number(supplierOwed[0]?.due ?? 0);
  if (owedSuppliers > 0) lines.push(``, `You owe suppliers: ${rs(owedSuppliers)}`);
  const todo: string[] = [];
  if (enquiries > 0) todo.push(`${enquiries} new enquir${enquiries === 1 ? "y" : "ies"} to reply to`);
  if (openQuotes.length > 0) todo.push(`${openQuotes.length} quotation${openQuotes.length === 1 ? "" : "s"} waiting for a reply (${rs(openQuotes.reduce((s, q) => s + q.totalPaise, 0))})`);
  if (todo.length > 0) lines.push(``, `*To do*`, ...todo.map((t) => `• ${t}`));
  lines.push(``, `${getAppUrl()}/caterer/dashboard`);

  return { subject: `${caterer.name}: your day on ${formatInvoiceDate(day)}`, text: lines.join("\n"), key };
}

const mobileOf = (c: SummaryCaterer) => normalizeCustomerPhone(c.whatsappNumber || c.phone);

// Sends the summary the way the caterer chose. Returns what happened for each way, so the settings page can say.
export async function sendSummary(caterer: SummaryCaterer) {
  const { subject, text, key } = await buildSummary(caterer);
  const result: { whatsapp?: string; email?: string; key: string } = { key };
  const wantsWa = caterer.summaryVia === "WHATSAPP" || caterer.summaryVia === "BOTH";
  const wantsMail = caterer.summaryVia === "EMAIL" || caterer.summaryVia === "BOTH";
  if (wantsWa) {
    if (!whatsappAutoOn()) result.whatsapp = "Automatic WhatsApp is switched off for now";
    else if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) result.whatsapp = "WhatsApp sending is not set up on this server";
    else try { await sendRawWhatsApp(mobileOf(caterer), text); result.whatsapp = "sent"; } catch (e) { result.whatsapp = e instanceof Error ? e.message : "failed"; }
  }
  if (wantsMail) {
    const to = caterer.summaryEmail || caterer.email;
    if (!to) result.email = "no email address";
    else if (!process.env.SMTP_USER) result.email = "email sending is not set up on this server";
    else try { await sendRawMail(to, subject, text.replace(/\*/g, "")); result.email = "sent"; } catch (e) { result.email = e instanceof Error ? e.message : "failed"; }
  }
  return result;
}
