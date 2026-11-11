import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { BILL_TYPES, orderSchema, type BillTypeKey } from "@/lib/caterer-orders";
import { groupLines, loadOrder, markTeamAttendance, nextInvoiceNumber, retax, upsertCustomer, validTeam } from "@/lib/caterer-bills";
import { gstFor } from "@/lib/caterer-gst";

type Params = { params: Promise<{ orderId: string }> };

const patchSchema = orderSchema
  .omit({ advanceMethod: true })
  .partial()
  .extend({ status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]).optional() });

export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { orderId } = await params;
  const order = await loadOrder(orderId, ctx.caterer.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { orderId } = await params;
  const order = await loadOrder(orderId, ctx.caterer.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success || !raw) return NextResponse.json({ error: parsed.success ? "Invalid input" : parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;
  // The schema fills in defaults for missing fields, so only trust what the request actually sent.
  const sent = (key: string) => Object.prototype.hasOwnProperty.call(raw, key);

  const servings = sent("servings") ? d.servings : undefined;
  const lines = sent("lines") ? d.lines : undefined;
  if (lines && lines.some((l) => l.servingIndex !== undefined && l.servingIndex >= (servings ?? order.servings).length)) {
    return NextResponse.json({ error: "A line points at a serve time that doesn't exist" }, { status: 400 });
  }
  const team = sent("team") ? await validTeam(ctx.caterer.orgId!, d.team) : null;
  if (team && !team.ok) return NextResponse.json({ error: "Someone on the team list wasn't found" }, { status: 400 });
  const grouped = lines ? groupLines(lines) : null;
  const adjust: Record<BillTypeKey, typeof d.foodBill> = { FOOD: sent("foodBill") ? d.foodBill : undefined, SERVICE: sent("serviceBill") ? d.serviceBill : undefined };

  // A bill that already has payments can't be emptied out from under them
  if (grouped) {
    for (const type of BILL_TYPES) {
      const bill = order.bills.find((b) => b.type === type);
      if (bill && grouped[type].length === 0 && bill.payments.length > 0) {
        return NextResponse.json({ error: `The ${type === "FOOD" ? "food" : "service"} bill already has payments. Remove them first, or keep at least one item on it.` }, { status: 400 });
      }
    }
  }

  // Check every discount against what the bill will be after this edit
  for (const type of BILL_TYPES) {
    const bill = order.bills.find((b) => b.type === type);
    const subtotal = grouped ? grouped[type].reduce((s, l) => s + l.amountPaise, 0) : bill?.subtotalPaise ?? 0;
    const discount = adjust[type]?.discount !== undefined ? Math.round(adjust[type]!.discount! * 100) : bill?.discountPaise ?? 0;
    if (discount > subtotal) return NextResponse.json({ error: `${type === "FOOD" ? "Food" : "Service"} discount can't be more than that bill's total` }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    let customerId = order.customerId;
    if (sent("customerPhone") || sent("customerName")) {
      const c = await upsertCustomer(tx, ctx.caterer.id, {
        customerName: d.customerName ?? order.customer.name,
        customerPhone: d.customerPhone ?? order.customer.phone,
        customerAddress: d.customerAddress,
      });
      customerId = c.id;
    }

    await tx.catererOrder.update({
      where: { id: orderId },
      data: {
        customerId,
        ...(sent("date") && d.date !== undefined && { date: new Date(d.date) }),
        ...(sent("place") && { place: d.place ?? null }),
        ...(sent("eventType") && { eventType: d.eventType ?? null }),
        ...(sent("notes") && { notes: d.notes ?? null }),
        ...(sent("status") && d.status !== undefined && { status: d.status }),
      },
    });

    if (team && team.ok) {
      await tx.catererOrderStaff.deleteMany({ where: { orderId } });
      if (team.rows.length) await tx.catererOrderStaff.createMany({ data: team.rows.map((r) => ({ orderId, ...r })) });
      await markTeamAttendance(tx, ctx.caterer.id, sent("date") && d.date ? new Date(d.date) : order.date, team.rows.map((r) => r.employeeId));
    }

    // Serve times are replaced as a set; lines are re-pointed at the new ones by position.
    let servingIds = order.servings.map((s) => s.id);
    if (servings) {
      await tx.catererServing.deleteMany({ where: { orderId } });
      const created = await Promise.all(servings.map((s, i) => tx.catererServing.create({ data: { orderId, label: s.label, time: s.time, guests: s.guests, sortOrder: i } })));
      servingIds = created.map((s) => s.id);
    }

    for (const type of BILL_TYPES) {
      const bill = order.bills.find((b) => b.type === type);
      const incoming = grouped ? grouped[type] : null;
      const adj = adjust[type];

      if (incoming) {
        if (incoming.length === 0) {
          if (bill) await tx.catererBill.delete({ where: { id: bill.id } });
          continue;
        }
        const subtotalPaise = incoming.reduce((s, l) => s + l.amountPaise, 0);
        const lineData = (billId: string) =>
          incoming.map((l, i) => ({
            billId, servingId: l.servingIndex !== undefined ? servingIds[l.servingIndex] ?? null : null,
            itemId: l.itemId ?? null, name: l.name, group: l.group, unit: l.unit, quantity: l.quantity,
            ratePaise: l.ratePaise, amountPaise: l.amountPaise, sortOrder: i,
          }));
        if (bill) {
          await tx.catererOrderLine.deleteMany({ where: { billId: bill.id } });
          await tx.catererOrderLine.createMany({ data: lineData(bill.id) });
          await tx.catererBill.update({
            where: { id: bill.id },
            data: {
              subtotalPaise,
              ...(adj?.discount !== undefined && { discountPaise: Math.round(adj.discount * 100) }),
              ...(adj && "discountReason" in adj && { discountReason: adj.discountReason ?? null }),
            },
          });
        } else {
          const number = await nextInvoiceNumber(tx, ctx.caterer.id);
          const created = await tx.catererBill.create({
            data: {
              orderId, catererId: ctx.caterer.id, type, number, subtotalPaise, ...gstFor(ctx.caterer, type),
              discountPaise: Math.round((adj?.discount ?? 0) * 100), discountReason: adj?.discountReason,
            },
          });
          await tx.catererOrderLine.createMany({ data: lineData(created.id) });
        }
      } else if (bill && adj) {
        // discount-only change
        await tx.catererBill.update({
          where: { id: bill.id },
          data: {
            ...(adj.discount !== undefined && { discountPaise: Math.round(adj.discount * 100) }),
            ...("discountReason" in adj && { discountReason: adj.discountReason ?? null }),
          },
        });
      }
    }
    // totals changed, so GST is worked out again for whatever bills the order now has
    const remaining = await tx.catererBill.findMany({ where: { orderId }, select: { id: true } });
    for (const b of remaining) await retax(tx, b.id);
  });

  return NextResponse.json({ order: await loadOrder(orderId, ctx.caterer.id) });
}

// Deleting wipes the order, its bills and payments; use "Cancelled" to keep a record instead.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { orderId } = await params;
  const order = await db.catererOrder.findFirst({ where: { id: orderId, catererId: ctx.caterer.id }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.catererOrder.delete({ where: { id: orderId } });
  return NextResponse.json({ ok: true });
}
