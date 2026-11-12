import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listLogins } from "@/lib/admin-logins";

export async function GET(_req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ logins: await listLogins((await params).orgId, "OWNER") });
}
