import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { MAX_TEAM_LOGINS } from "@/lib/caterer-team-limit";
import { generatePassword, normalizePhone } from "@/services/center-setup.service";

// The team-login screens of both portals work the same way; only who counts as "the main owner" and which pages exist differ.
type Owner = { orgId: string; userId: string };
type Config = { getOwner: () => Promise<Owner | null>; role: "CATERER" | "OWNER"; validKeys: Set<string> };

const SELECT = { id: true, name: true, phone: true, deny: true, disabled: true, createdAt: true } as const;
const deny403 = (what: string) => NextResponse.json({ error: `Only the owner can ${what}` }, { status: 403 });

const createSchema = z.object({
  name: z.string().trim().min(1, "Enter the person's name").max(80),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(20),
});
const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  deny: z.array(z.string()).max(100).optional(),
  disabled: z.boolean().optional(),
  resetPassword: z.boolean().optional(),
});

export function teamHandlers(cfg: Config) {
  const member = (owner: Owner, id: string) => db.user.findFirst({ where: { id, orgId: owner.orgId, teamMember: true } });

  return {
    async list() {
      const owner = await cfg.getOwner();
      if (!owner) return deny403("manage logins");
      const members = await db.user.findMany({ where: { orgId: owner.orgId, teamMember: true }, orderBy: { createdAt: "asc" }, select: SELECT });
      return NextResponse.json({ members });
    },

    // Adds a login. It starts with every page open; the owner then unticks what to hide. A password is made and shown once.
    async create(req: NextRequest) {
      const owner = await cfg.getOwner();
      if (!owner) return deny403("add logins");
      const parsed = createSchema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

      // switched-off logins still count, so switching one off does not free a place; removing it does
      const count = await db.user.count({ where: { orgId: owner.orgId, teamMember: true } });
      if (count >= MAX_TEAM_LOGINS) return NextResponse.json({ error: `You can add up to ${MAX_TEAM_LOGINS} logins. Remove one to add another.` }, { status: 400 });

      const phone = normalizePhone(parsed.data.phone);
      if (phone.replace(/\D/g, "").length < 12) return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
      if (await db.user.findUnique({ where: { phone } })) return NextResponse.json({ error: "This phone number already has a login" }, { status: 409 });

      const password = generatePassword();
      const user = await db.user.create({
        data: { phone, name: parsed.data.name, role: cfg.role, orgId: owner.orgId, teamMember: true, deny: [], addedById: owner.userId, password: await bcrypt.hash(password, 10) },
        select: SELECT,
      });
      return NextResponse.json({ member: user, password }, { status: 201 });
    },

    async patch(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
      const owner = await cfg.getOwner();
      if (!owner) return deny403("change logins");
      const m = await member(owner, (await params).userId);
      if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const parsed = patchSchema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
      const d = parsed.data;
      if (d.deny && d.deny.some((k) => !cfg.validKeys.has(k))) return NextResponse.json({ error: "Unknown page in the list" }, { status: 400 });

      const password = d.resetPassword ? generatePassword() : undefined;
      // anything that changes what they can do, or how they sign in, signs them out so it applies at once
      const bump = d.deny !== undefined || d.disabled !== undefined || d.resetPassword;
      const updated = await db.user.update({
        where: { id: m.id },
        data: {
          ...(d.name !== undefined && { name: d.name }),
          ...(d.deny !== undefined && { deny: [...new Set(d.deny)] }),
          ...(d.disabled !== undefined && { disabled: d.disabled }),
          ...(password && { password: await bcrypt.hash(password, 10) }),
          ...(bump && { accessVersion: { increment: 1 } }),
        },
        select: SELECT,
      });
      return NextResponse.json({ member: updated, ...(password ? { password } : {}) });
    },

    async remove(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
      const owner = await cfg.getOwner();
      if (!owner) return deny403("remove logins");
      const m = await member(owner, (await params).userId);
      if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await db.user.delete({ where: { id: m.id } });
      return NextResponse.json({ ok: true });
    },
  };
}
