import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BILL_TYPES, billMoney, orderSchema, type BillTypeKey, type OrderInput } from "@/lib/caterer-orders";
import { groupLines, upsertCustomer } from "@/lib/caterer-bills";
import { computeGst, gstFor, type GstSnapshot } from "@/lib/caterer-gst";
import { toParty } from "@/lib/caterer-invoice-data";
import type { InvoiceBill } from "@/components/caterer-invoice";

// A quotation is typed in the same form as an order, minus the team and any advance, plus how long the price holds.
export const quoteSchema = orderSchema.omit({ team: true, advanceMethod: true, enquiryId: true }).extend({
  validUntil: z.string().date().optional().or(z.literal("").transform(() => undefined)),
});
export type QuoteInput = z.infer<typeof quoteSchema>;
export type QuoteGst = Record<BillTypeKey, GstSnapshot>;

type CatererGst = Parameters<typeof gstFor>[0];
export const quoteGstFor = (caterer: CatererGst): QuoteGst => ({ FOOD: gstFor(caterer, "FOOD"), SERVICE: gstFor(caterer, "SERVICE") });

// The bills this quotation would turn into, with GST worked out, shaped like invoice bills so the same layout prints them.
export function quoteBills(data: QuoteInput, gst: QuoteGst, number: number, createdAt: Date): InvoiceBill[] {
  const grouped = groupLines(data.lines);
  const bills: InvoiceBill[] = [];
  for (const type of BILL_TYPES) {
    const lines = grouped[type];
    if (!lines.length) continue;
    const adj = type === "FOOD" ? data.foodBill : data.serviceBill;
    const subtotalPaise = lines.reduce((s, l) => s + l.amountPaise, 0);
    const discountPaise = Math.min(subtotalPaise, Math.round((adj?.discount ?? 0) * 100));
    const g = computeGst(subtotalPaise, discountPaise, gst[type]);
    bills.push({
      number, type, createdAt, subtotalPaise, discountPaise, taxPaise: g.taxPaise, gstRateBp: gst[type].gstRateBp, gstInclusive: gst[type].gstInclusive, gstPaise: g.gstPaise,
      discountReason: adj?.discountReason ?? null, receivedPaise: 0,
      lines: lines.map((l) => ({ name: l.name, unit: l.unit, quantity: l.quantity, ratePaise: l.ratePaise, amountPaise: l.amountPaise })),
    });
  }
  return bills;
}

export const quoteTotal = (bills: InvoiceBill[]) => bills.reduce((s, b) => s + billMoney(b).netPaise, 0);

export const quoteLabel = (n: number) => `Q-${String(n).padStart(3, "0")}`;

// What the customer sees: open, accepted, declined, or lapsed once the valid-until date has passed
export function quoteState(q: { status: string; validUntil: Date | null }, today = new Date()) {
  if (q.status === "ACCEPTED") return "ACCEPTED" as const;
  if (q.status === "DECLINED") return "DECLINED" as const;
  const t = new Date(today.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00Z");
  return q.validUntil && q.validUntil < t ? ("EXPIRED" as const) : ("OPEN" as const);
}

export type QuoteRow = Awaited<ReturnType<typeof loadQuote>>;
export const loadQuote = (catererId: string, id: string) => db.catererQuote.findFirst({ where: { id, catererId }, include: { customer: true, caterer: true } });
export const loadQuoteByToken = (token: string) => db.catererQuote.findUnique({ where: { shareToken: token }, include: { customer: true, caterer: true } });

export const parseQuoteData = (json: Prisma.JsonValue) => quoteSchema.parse(json);

// Files or updates a quotation. Returns the saved row, or an error to show.
export async function saveQuote(
  caterer: CatererGst & { id: string },
  input: QuoteInput,
  existing?: { id: string; gst: QuoteGst; number: number; createdAt: Date },
) {
  if (input.lines.some((l) => l.servingIndex !== undefined && l.servingIndex >= input.servings.length)) return { ok: false as const, error: "A line points at a serve time that doesn't exist" };
  const gst = existing?.gst ?? quoteGstFor(caterer);
  const bills = quoteBills(input, gst, existing?.number ?? 0, existing?.createdAt ?? new Date());
  if (bills.length === 0) return { ok: false as const, error: "Add at least one item" };
  for (const b of bills) if ((b.discountPaise ?? 0) > b.subtotalPaise) return { ok: false as const, error: "A discount can't be more than that bill's total" };
  const totalPaise = quoteTotal(bills);

  const saved = await db.$transaction(async (tx) => {
    const customer = await upsertCustomer(tx, caterer.id, input);
    const data = JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
    const common = { customerId: customer.id, date: new Date(input.date), validUntil: input.validUntil ? new Date(input.validUntil) : null, data, totalPaise };
    if (existing) return tx.catererQuote.update({ where: { id: existing.id }, data: common });
    const seq = await tx.caterer.update({ where: { id: caterer.id }, data: { nextQuoteNumber: { increment: 1 } }, select: { nextQuoteNumber: true } });
    return tx.catererQuote.create({ data: { ...common, catererId: caterer.id, number: seq.nextQuoteNumber - 1, gst: JSON.parse(JSON.stringify(gst)) as Prisma.InputJsonValue } });
  });
  return { ok: true as const, quote: saved };
}

export type { OrderInput };

// Everything needed to print or show one saved quotation
export function quoteDoc(q: NonNullable<QuoteRow>, logoUrl?: string | null) {
  const data = parseQuoteData(q.data as never);
  const bills = quoteBills(data, q.gst as unknown as QuoteGst, q.number, q.createdAt);
  return {
    data, bills,
    total: quoteTotal(bills),
    info: { label: quoteLabel(q.number), validUntil: q.validUntil },
    party: toParty(q.caterer, q.customer, { date: q.date, place: data.place ?? null }, logoUrl),
  };
}
