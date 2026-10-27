import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

const OTP_TTL_MINUTES = 10;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtp(phone: string): Promise<string> {
  await db.otpCode.updateMany({
    where: { phone, used: false },
    data: { used: true },
  });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await db.otpCode.create({ data: { phone, code, expiresAt } });

  console.log(`[OTP] ${phone} → ${code}`);
  return code;
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ userId: string; role: UserRole; orgId: string | null; name: string | null } | null> {
  const otp = await db.otpCode.findFirst({
    where: { phone, code, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return null;

  await db.otpCode.update({ where: { id: otp.id }, data: { used: true } });

  const user = await db.user.upsert({
    where: { phone },
    update: {},
    create: { phone, role: UserRole.CUSTOMER },
  });

  return { userId: user.id, role: user.role, orgId: user.orgId, name: user.name };
}
