import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendOtp } from "@/services/auth.service";
import { clientIp, rateLimited, TOO_MANY } from "@/lib/rate-limit";

const schema = z.object({ phone: z.string().regex(/^\+91[6-9]\d{9}$/) });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  if (rateLimited(`sendotp:${parsed.data.phone}`, 5, 60 * 60_000) || rateLimited(`sendotp-ip:${clientIp(req)}`, 20, 60 * 60_000)) return NextResponse.json(TOO_MANY, { status: 429 });
  const code = await sendOtp(parsed.data.phone);
  const devCode = process.env.NODE_ENV === "development" ? code : undefined;
  return NextResponse.json({ ok: true, devCode });
}
