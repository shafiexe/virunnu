import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ categoryId: string }> };

const schema = z.object({
  name: z.string().min(1).max(100),
  defaultAmountPaise: z.number().int().min(0).optional(),
  notes: z.string().max(300).optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { categoryId } = await params;
  const cat = await db.expenseCategory.findUnique({ where: { id: categoryId } });
  if (!cat || cat.orgId !== session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const count = await db.expenseItem.count({ where: { categoryId } });
  const item = await db.expenseItem.create({
    data: {
      categoryId,
      orgId: session.orgId,
      name: parsed.data.name,
      defaultAmountPaise: parsed.data.defaultAmountPaise ?? 0,
      notes: parsed.data.notes ?? null,
      sortOrder: count,
    },
  });
  return NextResponse.json({ item }, { status: 201 });
}
