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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let orgId: string;
  if (session.role === "ADMIN") {
    const { searchParams } = new URL(req.url);
    const queryOrgId = searchParams.get("orgId");
    if (!queryOrgId) return NextResponse.json({ error: "orgId query param required for ADMIN" }, { status: 400 });
    orgId = queryOrgId;
  } else {
    orgId = session.orgId!;
  }

  const facilities = await db.facility.findMany({
    where: { orgId },
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(facilities);
}

const createSchemaAdmin = createSchema.extend({
  orgId: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  let orgId: string;
  if (session.role === "ADMIN") {
    const parsed = createSchemaAdmin.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    if (!parsed.data.orgId) return NextResponse.json({ error: "orgId required in body for ADMIN" }, { status: 400 });
    orgId = parsed.data.orgId;
    const { name, description, amountPaise, category, icon, isCustom } = parsed.data;
    const existing = await db.facility.count({ where: { orgId } });
    const facility = await db.facility.create({
      data: { orgId, name, description, amountPaise, category, icon, isCustom: isCustom ?? true, sortOrder: existing },
    });
    return NextResponse.json(facility, { status: 201 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { name, description, amountPaise, category, icon, isCustom } = parsed.data;
  orgId = session.orgId!;

  const existing = await db.facility.count({ where: { orgId } });

  const facility = await db.facility.create({
    data: {
      orgId,
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
