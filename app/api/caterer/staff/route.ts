import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { currentMonthValue } from "@/lib/caterer-finance";
import { staffSchema } from "@/lib/caterer-staff";
import { staffMonth } from "@/lib/caterer-staff-server";

export async function GET(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const m = req.nextUrl.searchParams.get("month");
  const month = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : currentMonthValue();
  return NextResponse.json({ staff: await staffMonth(ctx.caterer.id, ctx.caterer.orgId!, month) });
}

export async function POST(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = staffSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const paise = Math.round(d.rate * 100);
  const person = await db.employee.create({
    data: {
      orgId: ctx.caterer.orgId!, name: d.name, role: d.role, phone: d.phone ?? null, payType: d.payType,
      salaryPaise: d.payType === "MONTHLY" ? paise : null, dailyRatePaise: d.payType === "DAILY" ? paise : null,
    },
  });
  return NextResponse.json({ staff: person }, { status: 201 });
}
