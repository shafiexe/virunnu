import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(80),
  phone: z.string().optional(),
  salaryPaise: z.number().int().min(0).optional(),
});

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const employees = await db.employee.findMany({
    where: { orgId: session.orgId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const { name, role, phone, salaryPaise } = parsed.data;
  const employee = await db.employee.create({
    data: { orgId: session.orgId, name, role, phone: phone ?? null, salaryPaise: salaryPaise ?? null },
  });

  return NextResponse.json({ employee }, { status: 201 });
}
