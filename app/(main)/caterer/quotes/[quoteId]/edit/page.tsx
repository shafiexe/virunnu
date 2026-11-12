import { connection } from "next/server";
export const instant = false;
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { loadQuote, parseQuoteData, type QuoteGst } from "@/lib/caterer-quotes";
import { BackToList } from "@/components/back-to-list";
import { CatererOrderForm, type OrderFormInitial } from "@/components/caterer-order-form";
import type { PriceItem } from "@/components/caterer-items-manager";

export default async function EditQuotePage({ params }: { params: Promise<{ quoteId: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const q = await loadQuote(ctx.caterer.id, (await params).quoteId);
  if (!q) notFound();
  if (q.status === "ACCEPTED") redirect(`/caterer/quotes/${q.id}`);
  const d = parseQuoteData(q.data as never);
  const items = await db.catererItem.findMany({ where: { catererId: ctx.caterer.id }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });

  const initial: OrderFormInitial = {
    id: q.id, date: d.date, customerName: d.customerName, customerPhone: d.customerPhone, customerAddress: d.customerAddress ?? null,
    place: d.place ?? null, eventType: d.eventType ?? null, notes: d.notes ?? null,
    foodDiscountPaise: Math.round((d.foodBill?.discount ?? 0) * 100), foodDiscountReason: d.foodBill?.discountReason ?? null,
    serviceDiscountPaise: Math.round((d.serviceBill?.discount ?? 0) * 100), serviceDiscountReason: d.serviceBill?.discountReason ?? null,
    servings: d.servings.map((s) => ({ label: s.label, time: s.time, guests: s.guests ?? null })),
    team: [],
    lines: d.lines.map((l) => ({ itemId: l.itemId ?? null, name: l.name, group: l.group, unit: l.unit, quantity: l.quantity, ratePaise: Math.round(l.rate * 100), servingIndex: l.servingIndex ?? null })),
  };
  const gst = q.gst as unknown as QuoteGst;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 [&>*]:max-w-3xl space-y-5">
      <BackToList href={`/caterer/quotes/${q.id}`} label="Back to quotation" />
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Edit quotation — {d.customerName}</h1>
      <CatererOrderForm quote={{ id: q.id, validUntil: q.validUntil?.toISOString().slice(0, 10) ?? "" }} people={[]} catalog={items as PriceItem[]} initial={initial} gstRates={gst} />
    </div>
  );
}
