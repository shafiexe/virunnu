import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { resetLogin } from "@/lib/admin-logins";

export async function POST(req: NextRequest, { params }: { params: Promise<{ catererId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const caterer = await db.caterer.findUnique({ where: { id: (await params).catererId }, select: { orgId: true } });
  if (!caterer?.orgId) return NextResponse.json({ error: "This team has no login yet" }, { status: 404 });
  const body = z.object({ userId: z.string().optional() }).safeParse(await req.json().catch(() => ({})));
  const r = await resetLogin(caterer.orgId, "CATERER", body.success ? body.data.userId : undefined);
  if (!r) return NextResponse.json({ error: "No login found" }, { status: 404 });
  return NextResponse.json(r);
}
