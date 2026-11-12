import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { generatePassword } from "@/services/center-setup.service";

// The logins behind a convention centre or a catering team, for the admin: the main login first, then anyone the owner added.
export async function listLogins(orgId: string, role: "OWNER" | "CATERER") {
  const users = await db.user.findMany({
    where: { orgId, role },
    orderBy: [{ teamMember: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, phone: true, teamMember: true, disabled: true },
  });
  return users.map((u) => ({ id: u.id, name: u.name, phone: u.phone, main: !u.teamMember, disabled: u.disabled }));
}

// Makes a new password for one login and returns it once, so the admin can pass it on when the person can't get it by WhatsApp.
// Team members are signed out (their access version moves); the old password stops working for everyone.
export async function resetLogin(orgId: string, role: "OWNER" | "CATERER", userId?: string) {
  const user = userId
    ? await db.user.findFirst({ where: { id: userId, orgId, role } })
    : await db.user.findFirst({ where: { orgId, role, teamMember: false }, orderBy: { createdAt: "asc" } });
  if (!user) return null;
  const password = generatePassword();
  await db.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(password, 10), accessVersion: { increment: 1 } } });
  return { id: user.id, name: user.name, phone: user.phone, password };
}
