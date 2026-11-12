import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { listLogins } from "@/lib/admin-logins";

export async function GET(_req: Request, { params }: { params: Promise<{ catererId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const caterer = await db.caterer.findUnique({ where: { id: (await params).catererId }, select: { orgId: true } });
  if (!caterer?.orgId) return NextResponse.json({ logins: [] });
  return NextResponse.json({ logins: await listLogins(caterer.orgId, "CATERER") });
}
