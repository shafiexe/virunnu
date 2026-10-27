import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/services/auth.service";
import { setSession } from "@/lib/session";

const schema = z.object({
  phone: z.string(),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const result = await verifyOtp(parsed.data.phone, parsed.data.code);

  if (!result) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
  }

  await setSession({
    userId: result.userId,
    role: result.role,
    orgId: result.orgId ?? undefined,
  });

  return NextResponse.json({ ok: true, role: result.role, needsName: !result.name });
}
