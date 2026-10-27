import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSession } from "@/lib/session";

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

  const user = await db.user.findUnique({ where: { phone: normalized } });

  if (!user || !user.password) {
    return NextResponse.json({ error: "Invalid phone number or password" }, { status: 401 });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return NextResponse.json({ error: "Invalid phone number or password" }, { status: 401 });
  }

  await setSession({ userId: user.id, role: user.role, orgId: user.orgId ?? undefined });
  return NextResponse.json({ ok: true, role: user.role });
}
