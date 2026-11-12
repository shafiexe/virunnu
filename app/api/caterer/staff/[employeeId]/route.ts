import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { staffSchema } from "@/lib/caterer-staff";

type Params = { params: Promise<{ employeeId: string }> };

async function mine(orgId: string, id: string) {
  return db.employee.findFirst({ where: { id, orgId } });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { employeeId } = await params;
  if (!(await mine(ctx.caterer.orgId!, employeeId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = staffSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const paise = Math.round(d.rate * 100);
  const staff = await db.employee.update({
    where: { id: employeeId },
    data: { name: d.name, role: d.role, phone: d.phone ?? null, payType: d.payType, salaryPaise: d.payType === "MONTHLY" ? paise : null, dailyRatePaise: d.payType === "DAILY" ? paise : null },
  });
  return NextResponse.json({ staff });
}

// Someone with pay records is moved to "left" so past months stay correct; someone with none is deleted.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { employeeId } = await params;
  if (!(await mine(ctx.caterer.orgId!, employeeId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [pay, att, buys] = await Promise.all([
    db.catererStaffPayment.count({ where: { employeeId } }),
    db.catererAttendance.count({ where: { employeeId } }),
    db.catererPurchase.count({ where: { employeeId } }),
  ]);
  if (pay + att + buys > 0) {
    await db.employee.update({ where: { id: employeeId }, data: { isActive: false } });
    return NextResponse.json({ ok: true, archived: true });
  }
  await db.employee.delete({ where: { id: employeeId } });
  return NextResponse.json({ ok: true });
}
