import { db } from "@/lib/db";

export const usualKey = (l: { itemId?: string | null; name: string; unit: string }) => (l.itemId ? `i:${l.itemId}` : `n:${l.name.trim().toLowerCase()}|${l.unit}`);

// What this customer was charged last time, per item, plus their latest function: the form starts from these
export async function usualFor(catererId: string, customerId: string) {
  const orders = await db.catererOrder.findMany({
    where: { catererId, customerId, status: { not: "CANCELLED" } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 6,
    select: { id: true, date: true, eventType: true, place: true, bills: { select: { lines: { select: { itemId: true, name: true, unit: true, ratePaise: true } } } } },
  });
  const rates: Record<string, number> = {};
  for (const o of orders) for (const b of o.bills) for (const l of b.lines) { const k = usualKey(l); if (!(k in rates)) rates[k] = l.ratePaise; }
  const last = orders[0];
  return { rates, last: last ? { id: last.id, date: last.date.toISOString().slice(0, 10), eventType: last.eventType, place: last.place } : null };
}
