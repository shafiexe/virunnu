import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { orgId } = await params;

  const org = await db.organization.findFirst({ where: { id: orgId, type: "CONVENTION" } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.organization.update({ where: { id: orgId }, data: { disabled: !org.disabled } });

  return NextResponse.json({ disabled: !org.disabled });
}
