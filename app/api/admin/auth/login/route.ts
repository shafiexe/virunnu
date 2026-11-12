import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { setSession } from "@/lib/session";
import { clearFailures, clientIp, rateLimited, recordFailure, TOO_MANY, tooManyFailures } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const ipKey = `admin-login:${clientIp(req)}`;
  if (tooManyFailures(ipKey, 8, 15 * 60_000)) return NextResponse.json(TOO_MANY, { status: 429 });

  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (!validUsername || !validPassword) {
    return NextResponse.json({ error: "Admin credentials not configured" }, { status: 500 });
  }

  const same = (a: unknown, b: string) => { const x = crypto.createHash("sha256").update(String(a)).digest(), y = crypto.createHash("sha256").update(b).digest(); return crypto.timingSafeEqual(x, y); };
  if (!same(body.username, validUsername) || !same(body.password, validPassword)) {
    recordFailure(ipKey, 15 * 60_000);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  clearFailures(ipKey);

  await setSession({ userId: "admin", role: "ADMIN" });
  return NextResponse.json({ ok: true });
}
