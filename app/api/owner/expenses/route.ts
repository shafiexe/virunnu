import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  category: z.string().min(1).max(80),
  label: z.string().min(1).max(100),
  amountRupees: z.number().positive(),
  date: z.string().date(),
  notes: z.string().max(500).optional(),
  employeeId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const from = month && year
    ? new Date(parseInt(year), parseInt(month) - 1, 1)
    : new Date(new Date().getFullYear(), 0, 1);
  const to = month && year
    ? new Date(parseInt(year), parseInt(month), 0)
    : new Date(new Date().getFullYear(), 11, 31);

  const expenses = await db.expense.findMany({
    where: { orgId: session.orgId, date: { gte: from, lte: to } },
    include: { employee: { select: { id: true, name: true, role: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { category, label, amountRupees, date, notes, employeeId } = parsed.data;

  const expense = await db.expense.create({
    data: {
      orgId: session.orgId,
      category,
      label,
      amountPaise: Math.round(amountRupees * 100),
      date: new Date(date),
      notes: notes ?? null,
      employeeId: employeeId ?? null,
    },
    include: { employee: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
