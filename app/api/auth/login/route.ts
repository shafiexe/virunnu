import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSession } from "@/lib/session";
import { clearFailures, clientIp, rateLimited, recordFailure, TOO_MANY, tooManyFailures } from "@/lib/rate-limit";

const schema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { phone, password } = parsed.data;

  // Normalize phone: accept with or without +91
  const normalized = phone.startsWith("+") ? phone : `+91${phone}`;

  // guessing passwords is slowed: a few wrong tries for one number, more for one address
  const phoneKey = `login:${normalized}`, ipKey = `login-ip:${clientIp(req)}`;
  if (tooManyFailures(phoneKey, 8, 15 * 60_000) || tooManyFailures(ipKey, 40, 15 * 60_000)) return NextResponse.json(TOO_MANY, { status: 429 });

  const user = await db.user.findUnique({ where: { phone: normalized } });

  if (!user || !user.password) {
    recordFailure(phoneKey, 15 * 60_000); recordFailure(ipKey, 15 * 60_000);
    return NextResponse.json({ error: "Invalid phone number or password" }, { status: 401 });
  }

  if (user.disabled) return NextResponse.json({ error: "This login has been switched off. Ask the owner." }, { status: 403 });

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    recordFailure(phoneKey, 15 * 60_000); recordFailure(ipKey, 15 * 60_000);
    return NextResponse.json({ error: "Invalid phone number or password" }, { status: 401 });
  }
  clearFailures(phoneKey);

  await setSession({ userId: user.id, role: user.role, orgId: user.orgId ?? undefined });
  return NextResponse.json({ ok: true, role: user.role });
}
