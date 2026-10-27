import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, setSession } from "@/lib/session";
import { db } from "@/lib/db";
import { UserRole, OrgType } from "@prisma/client";

const schema = z.object({
  role: z.enum(["CUSTOMER", "OWNER", "CATERER"]),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { role } = parsed.data;

  // Role can only be set once (guard against re-assignment)
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let orgId: string | null = user.orgId;

  if (role === "OWNER" || role === "CATERER") {
    // Create an org for this user if they don't have one yet
    if (!orgId) {
      const org = await db.organization.create({
        data: {
          name: user.name ?? user.phone,
          type: role === "OWNER" ? OrgType.CONVENTION : OrgType.CATERING,
          users: { connect: { id: user.id } },
        },
      });
      orgId = org.id;
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { role: UserRole[role], orgId },
  });

  await setSession({ ...session, role: UserRole[role], orgId: orgId ?? undefined });

  return NextResponse.json({ ok: true, role });
}
