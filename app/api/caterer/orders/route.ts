import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { billMoney, orderSchema } from "@/lib/caterer-orders";
import { createOrder } from "@/lib/caterer-order-create";
import type { OrderStatus, Prisma } from "@prisma/client";

const STATUSES = ["CONFIRMED", "COMPLETED", "CANCELLED"];

export async function GET(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(sp.get("pageSize") ?? "50") || 50));
  const status = sp.get("status") ?? "ALL";
  const search = (sp.get("search") ?? "").trim();
  const from = sp.get("from");
  const to = sp.get("to");
  const dues = sp.get("dues") === "1";
  const customerId = sp.get("customerId");

  const where: Prisma.CatererOrderWhereInput = {
    catererId: ctx.caterer.id,
    ...(STATUSES.includes(status) ? { status: status as OrderStatus } : {}),
    ...(customerId ? { customerId } : {}),
    ...(from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    ...(search
      ? {
          OR: [
            { customer: { name: { contains: search, mode: "insensitive" } } },
            { customer: { phone: { contains: search } } },
            { place: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const include = {
    customer: { select: { id: true, name: true, phone: true } },
    servings: { orderBy: { sortOrder: "asc" as const } },
    bills: { select: { id: true, type: true, number: true, shareToken: true, subtotalPaise: true, discountPaise: true, taxPaise: true, receivedPaise: true } },
  };

  if (dues) {
    // "balance > 0" depends on three columns, so filter after loading
    const all = await db.catererOrder.findMany({ where: { ...where, status: { not: "CANCELLED" } }, include, orderBy: { date: "desc" } });
    const owing = all.filter((o) => o.bills.some((b) => billMoney(b).balancePaise > 0));
    return NextResponse.json({ data: owing.slice((page - 1) * pageSize, page * pageSize), total: owing.length, page, pageSize, totalPages: Math.ceil(owing.length / pageSize) });
  }

  const [total, data] = await Promise.all([
    db.catererOrder.count({ where }),
    db.catererOrder.findMany({ where, include, orderBy: [{ date: "desc" }, { createdAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const result = await createOrder(ctx.caterer, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ order: result.order }, { status: 201 });
}
