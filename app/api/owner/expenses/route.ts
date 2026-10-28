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

  const sp = new URL(req.url).searchParams;
  const month = sp.get("month");
  const year = sp.get("year");
  const search = (sp.get("search") ?? "").trim();
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(500, Math.max(25, parseInt(sp.get("pageSize") ?? "50") || 50));

  const from = month && year
    ? new Date(parseInt(year), parseInt(month) - 1, 1)
    : new Date(new Date().getFullYear(), 0, 1);
  const to = month && year
    ? new Date(parseInt(year), parseInt(month), 0)
    : new Date(new Date().getFullYear(), 11, 31);

  const where = {
    orgId: session.orgId,
    date: { gte: from, lte: to },
    ...(search ? {
      OR: [
        { label: { contains: search, mode: "insensitive" as const } },
        { category: { contains: search, mode: "insensitive" as const } },
        { notes: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const paginate = sp.has("page") || sp.has("pageSize");

  if (paginate) {
    const [total, expenses] = await Promise.all([
      db.expense.count({ where }),
      db.expense.findMany({
        where,
        include: { employee: { select: { id: true, name: true, role: true } } },
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return NextResponse.json({ data: expenses, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  }

  // Legacy: return all for the month (used by ExpenseManager on initial load)
  const expenses = await db.expense.findMany({
    where,
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
