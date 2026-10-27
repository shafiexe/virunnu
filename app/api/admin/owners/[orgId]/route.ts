import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  orgName: z.string().min(2).optional(),
  ownerName: z.string().min(1).optional(),
  ownerPhone: z.string().min(10).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { orgId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { orgName, ownerName, ownerPhone } = parsed.data;

  const org = await db.organization.findFirst({ where: { id: orgId, type: "CONVENTION" } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await db.$transaction(async (tx) => {
      if (orgName) await tx.organization.update({ where: { id: orgId }, data: { name: orgName } });

      const owner = await tx.user.findFirst({ where: { orgId, role: "OWNER" } });
      if (owner && (ownerName || ownerPhone)) {
        if (ownerPhone && ownerPhone !== owner.phone) {
          const taken = await tx.user.findUnique({ where: { phone: ownerPhone } });
          if (taken) throw new Error("PHONE_TAKEN");
        }
        await tx.user.update({
          where: { id: owner.id },
          data: { ...(ownerName ? { name: ownerName } : {}), ...(ownerPhone ? { phone: ownerPhone } : {}) },
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "PHONE_TAKEN") {
      return NextResponse.json({ error: "A user with that phone already exists" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { orgId } = await params;

  const org = await db.organization.findFirst({ where: { id: orgId, type: "CONVENTION" } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.organization.delete({ where: { id: orgId } });

  return NextResponse.json({ ok: true });
}
