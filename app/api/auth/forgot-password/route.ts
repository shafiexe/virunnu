import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendCredentialsMail, sendCredentialsWhatsApp } from "@/services/notification.service";

const schema = z.object({
  phone: z.string().min(1),
});

function generatePassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const normalized = parsed.data.phone.startsWith("+") ? parsed.data.phone : `+91${parsed.data.phone}`;

  const user = await db.user.findUnique({
    where: { phone: normalized },
    select: { id: true, name: true, email: true, password: true, role: true },
  });

  // Only owners and caterers have password-based login
  if (!user || !["OWNER", "CATERER"].includes(user.role)) {
    // Return ok regardless to avoid user enumeration
    return NextResponse.json({ ok: true });
  }

  const plainPassword = generatePassword();
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await db.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

  const type: "owner" | "caterer" = user.role === "OWNER" ? "owner" : "caterer";
  const name = user.name ?? normalized;

  Promise.allSettled([
    user.email
      ? sendCredentialsMail({ to: user.email, name, phone: normalized, password: plainPassword, type })
      : Promise.resolve(),
    sendCredentialsWhatsApp({ to: normalized, name, phone: normalized, password: plainPassword, type }),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") console.error(`[ForgotPw][${i}]`, r.reason);
    });
  });

  // In development, return the password on-screen (SMTP/Twilio may not be configured)
  const devPassword = process.env.NODE_ENV === "development" ? plainPassword : undefined;
  return NextResponse.json({ ok: true, devPassword });
}
