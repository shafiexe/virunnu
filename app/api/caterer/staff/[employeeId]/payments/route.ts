import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { staffPaymentSchema } from "@/lib/caterer-staff";
import { todayIST } from "@/lib/caterer-finance";
import { actorOf, logActivity } from "@/lib/activity";

type Params = { params: Promise<{ employeeId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { employeeId } = await params;
  const person = await db.employee.findFirst({ where: { id: employeeId, orgId: ctx.caterer.orgId! } });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = staffPaymentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const date = d.date ? new Date(d.date) : todayIST();
  const payment = await db.catererStaffPayment.create({
    data: {
      catererId: ctx.caterer.id, employeeId, date, amountPaise: Math.round(d.amount * 100), kind: d.kind, method: d.method, note: d.note,
      forMonth: date.toISOString().slice(0, 7),
    },
  });
  await logActivity(ctx.session, `Paid ${person.name} ₹${d.amount.toLocaleString("en-IN")}`);
  return NextResponse.json({ payment }, { status: 201 });
}
