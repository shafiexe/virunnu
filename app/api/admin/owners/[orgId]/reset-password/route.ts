import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { resetLogin } from "@/lib/admin-logins";

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = z.object({ userId: z.string().optional() }).safeParse(await req.json().catch(() => ({})));
  const r = await resetLogin((await params).orgId, "OWNER", body.success ? body.data.userId : undefined);
  if (!r) return NextResponse.json({ error: "No login found" }, { status: 404 });
  return NextResponse.json(r);
}
