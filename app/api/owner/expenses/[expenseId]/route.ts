import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ expenseId: string }> };

const schema = z.object({
  category: z.string().min(1).max(80).optional(),
  label: z.string().min(1).max(100).optional(),
  amountRupees: z.number().positive().optional(),
  date: z.string().date().optional(),
  notes: z.string().max(500).optional().nullable(),
  employeeId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { expenseId } = await params;
  const expense = await db.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.orgId !== session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { category, label, amountRupees, date, notes, employeeId } = parsed.data;

  const updated = await db.expense.update({
    where: { id: expenseId },
    data: {
      ...(category !== undefined ? { category } : {}),
      ...(label !== undefined ? { label } : {}),
      ...(amountRupees !== undefined ? { amountPaise: Math.round(amountRupees * 100) } : {}),
      ...(date !== undefined ? { date: new Date(date) } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(employeeId !== undefined ? { employeeId } : {}),
    },
    include: { employee: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json({ expense: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { expenseId } = await params;
  const expense = await db.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.orgId !== session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.expense.delete({ where: { id: expenseId } });
  return NextResponse.json({ ok: true });
}
