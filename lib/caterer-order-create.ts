import { db } from "@/lib/db";
import { BILL_TYPES, type BillTypeKey, type OrderInput } from "@/lib/caterer-orders";
import { groupLines, markTeamAttendance, nextInvoiceNumber, retax, upsertCustomer, validTeam } from "@/lib/caterer-bills";
import { gstFor } from "@/lib/caterer-gst";
import { todayIST } from "@/lib/caterer-finance";

type CatererForOrder = { id: string; orgId: string | null; gstEnabled: boolean; foodGstBp: number; serviceGstBp: number; gstInclusive: boolean };
const fail = (error: string) => ({ ok: false as const, error });

// Validates and files a new order with its bills, team and any advance. Shared by the order form and by turning a quotation into an order.
export async function createOrder(caterer: CatererForOrder, d: OrderInput, by?: string | null) {

  if (d.lines.some((l) => l.servingIndex !== undefined && l.servingIndex >= d.servings.length)) {
    return fail("A line points at a serve time that doesn't exist");
  }

  const grouped = groupLines(d.lines);
  const adjust: Record<BillTypeKey, typeof d.foodBill> = { FOOD: d.foodBill, SERVICE: d.serviceBill };

  // Validate each bill's discount and advance before touching the database
  for (const type of BILL_TYPES) {
    const subtotal = grouped[type].reduce((s, l) => s + l.amountPaise, 0);
    const discount = Math.round((adjust[type]?.discount ?? 0) * 100);
    const advance = Math.round((adjust[type]?.advance ?? 0) * 100);
    if (discount > subtotal) return fail(`${type === "FOOD" ? "Food" : "Service"} discount can't be more than that bill's total`);
    if (advance > subtotal - discount) return fail(`${type === "FOOD" ? "Food" : "Service"} advance can't be more than that bill`);
  }
  if (grouped.FOOD.length + grouped.SERVICE.length === 0 && d.servings.length === 0) {
    return fail("Add at least one item or serve time");
  }

  const team = await validTeam(caterer.orgId!, d.team);
  if (!team.ok) return fail("Someone on the team list wasn't found");

  const order = await db.$transaction(async (tx) => {
    const customer = await upsertCustomer(tx, caterer.id, d);
    const created = await tx.catererOrder.create({
      data: {
        catererId: caterer.id,
        customerId: customer.id,
        date: new Date(d.date),
        place: d.place,
        eventType: d.eventType,
        notes: d.notes,
        recordedBy: by ?? null,
        servings: { create: d.servings.map((s, i) => ({ label: s.label, time: s.time, guests: s.guests, sortOrder: i })) },
        ...(team.rows.length ? { team: { create: team.rows } } : {}),
      },
      include: { servings: { orderBy: { sortOrder: "asc" } } },
    });

    for (const type of BILL_TYPES) {
      const lines = grouped[type];
      if (!lines.length) continue;
      const subtotalPaise = lines.reduce((s, l) => s + l.amountPaise, 0);
      const discountPaise = Math.round((adjust[type]?.discount ?? 0) * 100);
      const advancePaise = Math.round((adjust[type]?.advance ?? 0) * 100);
      const number = await nextInvoiceNumber(tx, caterer.id);
      const bill = await tx.catererBill.create({
        data: {
          orderId: created.id, catererId: caterer.id, type, number, subtotalPaise, discountPaise, ...gstFor(caterer, type),
          discountReason: adjust[type]?.discountReason, receivedPaise: advancePaise,
          lines: {
            create: lines.map((l, i) => ({
              servingId: l.servingIndex !== undefined ? created.servings[l.servingIndex].id : null,
              itemId: l.itemId ?? null, name: l.name, group: l.group, unit: l.unit, quantity: l.quantity,
              ratePaise: l.ratePaise, amountPaise: l.amountPaise, sortOrder: i,
            })),
          },
          ...(advancePaise > 0 ? { payments: { create: { amountPaise: advancePaise, method: d.advanceMethod ?? "CASH", paidOn: todayIST(), note: "Advance", recordedBy: by ?? null } } } : {}),
        },
      });
      await retax(tx, bill.id);
    }
    await markTeamAttendance(tx, caterer.id, created.date, team.rows.map((r) => r.employeeId));
    if (d.enquiryId) {
      await tx.cateringEnquiry.updateMany({ where: { id: d.enquiryId, catererId: caterer.id, status: "PENDING" }, data: { status: "ATTENDED" } });
    }
    return created;
  });
  return { ok: true as const, order };
}
