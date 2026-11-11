import { db } from "@/lib/db";
import type { OrderFormInitial } from "@/components/caterer-order-form";

// An existing order in the shape the order form starts from, for editing it or for copying it into a new one.
export async function loadOrderInitial(catererId: string, orderId: string) {
  const order = await db.catererOrder.findFirst({
    where: { id: orderId, catererId },
    include: {
      customer: true,
      servings: { orderBy: { sortOrder: "asc" } },
      team: { include: { employee: { select: { name: true } } } },
      bills: { include: { lines: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!order) return null;
  const food = order.bills.find((b) => b.type === "FOOD");
  const service = order.bills.find((b) => b.type === "SERVICE");
  const allLines = [...(food?.lines ?? []), ...(service?.lines ?? [])];
  const initial: OrderFormInitial = {
    id: order.id,
    date: order.date.toISOString().slice(0, 10),
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    customerAddress: order.customer.address,
    place: order.place,
    eventType: order.eventType,
    notes: order.notes,
    foodDiscountPaise: food?.discountPaise ?? 0,
    foodDiscountReason: food?.discountReason ?? null,
    serviceDiscountPaise: service?.discountPaise ?? 0,
    serviceDiscountReason: service?.discountReason ?? null,
    servings: order.servings.map((s) => ({ label: s.label, time: s.time, guests: s.guests })),
    team: order.team.map((t) => ({ employeeId: t.employeeId, name: t.employee.name, amountPaise: t.amountPaise })),
    lines: allLines.map((l) => ({
      itemId: l.itemId, name: l.name, group: l.group, unit: l.unit, quantity: l.quantity, ratePaise: l.ratePaise,
      servingIndex: l.servingId ? order.servings.findIndex((s) => s.id === l.servingId) : null,
    })),
  };
  // GST each existing bill was made with, so editing the order keeps it
  const billGst = { FOOD: food ? { gstRateBp: food.gstRateBp, gstInclusive: food.gstInclusive } : null, SERVICE: service ? { gstRateBp: service.gstRateBp, gstInclusive: service.gstInclusive } : null };
  return { initial, customerName: order.customer.name, billGst };
}
