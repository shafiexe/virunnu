import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { attendanceSchema } from "@/lib/caterer-staff";

type Params = { params: Promise<{ employeeId: string }> };

// Mark a day: 1 = full day, 0.5 = half, 0 = absent (clears the day).
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { employeeId } = await params;
  const person = await db.employee.findFirst({ where: { id: employeeId, orgId: ctx.caterer.orgId! } });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = attendanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const date = new Date(parsed.data.date);
  if (parsed.data.units === 0) {
    await db.catererAttendance.deleteMany({ where: { employeeId, date } });
  } else {
    await db.catererAttendance.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: { catererId: ctx.caterer.id, employeeId, date, units: parsed.data.units },
      update: { units: parsed.data.units },
    });
  }
  return NextResponse.json({ ok: true });
}
