import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ categoryId: string; itemId: string }> };

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  defaultAmountPaise: z.number().int().min(0).optional(),
  notes: z.string().max(300).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { itemId } = await params;
  const item = await db.expenseItem.findUnique({ where: { id: itemId } });
  if (!item || item.orgId !== session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await db.expenseItem.update({ where: { id: itemId }, data: parsed.data });
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { itemId } = await params;
  const item = await db.expenseItem.findUnique({ where: { id: itemId } });
  if (!item || item.orgId !== session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.expenseItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
