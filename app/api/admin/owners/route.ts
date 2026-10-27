import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  orgName: z.string().min(2),
  ownerName: z.string().min(1),
  ownerPhone: z.string().min(10),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orgs = await db.organization.findMany({
    where: { type: "CONVENTION" },
    include: {
      users: { where: { role: "OWNER" }, select: { id: true, name: true, phone: true } },
      venues: { select: { id: true, name: true, approved: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orgs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { orgName, ownerName, ownerPhone } = parsed.data;

  const existing = await db.user.findUnique({ where: { phone: ownerPhone } });
  if (existing) return NextResponse.json({ error: "A user with this phone already exists" }, { status: 409 });

  const org = await db.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: orgName, type: "CONVENTION" } });
    await tx.user.create({ data: { phone: ownerPhone, name: ownerName, role: "OWNER", orgId: org.id } });
    return org;
  });

  return NextResponse.json({ orgId: org.id }, { status: 201 });
}
