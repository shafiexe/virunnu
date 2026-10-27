import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  amountPaise: z.number().int().min(0),
  category: z.string().min(1).max(50),
  icon: z.string().min(1).max(10),
  isCustom: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const facilities = await db.facility.findMany({
    where: { orgId: session.orgId! },
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(facilities);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { name, description, amountPaise, category, icon, isCustom } = parsed.data;

  const existing = await db.facility.count({ where: { orgId: session.orgId! } });

  const facility = await db.facility.create({
    data: {
      orgId: session.orgId!,
      name,
      description,
      amountPaise,
      category,
      icon,
      isCustom: isCustom ?? true,
      sortOrder: existing,
    },
  });

  return NextResponse.json(facility, { status: 201 });
}
