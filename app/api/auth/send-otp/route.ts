import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendOtp } from "@/services/auth.service";

const schema = z.object({ phone: z.string().regex(/^\+91[6-9]\d{9}$/) });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const code = await sendOtp(parsed.data.phone);
  const devCode = process.env.NODE_ENV === "development" ? code : undefined;
  return NextResponse.json({ ok: true, devCode });
}
