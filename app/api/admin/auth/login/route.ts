import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (!validUsername || !validPassword) {
    return NextResponse.json({ error: "Admin credentials not configured" }, { status: 500 });
  }

  if (body.username !== validUsername || body.password !== validPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await setSession({ userId: "admin", role: "ADMIN" });
  return NextResponse.json({ ok: true });
}
