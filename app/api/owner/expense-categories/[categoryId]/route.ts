import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ categoryId: string }> };

const schema = z.object({
  name: z.string().min(1).max(60).optional(),
  icon: z.string().max(8).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await db.expenseCategory.update({
    where: { id: categoryId },
    data: parsed.data,
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json({ category: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { categoryId } = await params;
  const cat = await db.expenseCategory.findUnique({ where: { id: categoryId } });
  if (!cat || cat.orgId !== session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.expenseCategory.delete({ where: { id: categoryId } });
  return NextResponse.json({ ok: true });
}
