import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ employeeId: string }> };

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.string().min(1).max(80).optional(),
  phone: z.string().nullable().optional(),
  salaryPaise: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { employeeId } = await params;
  const emp = await db.employee.findFirst({ where: { id: employeeId, orgId: session.orgId } });
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const employee = await db.employee.update({ where: { id: employeeId }, data: parsed.data });
  return NextResponse.json({ employee });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { employeeId } = await params;
  const emp = await db.employee.findFirst({ where: { id: employeeId, orgId: session.orgId } });
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const linked = await db.expense.count({ where: { employeeId } });
  if (linked > 0)
    return NextResponse.json({ error: `Cannot delete — ${linked} expense(s) linked. Disable instead.` }, { status: 409 });

  await db.employee.delete({ where: { id: employeeId } });
  return NextResponse.json({ ok: true });
}
