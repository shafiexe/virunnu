import { db } from "@/lib/db";
import { getSession, type SessionPayload } from "@/lib/session";
import type { BackupKind, Ctx } from "@/lib/backup/registry";

// Backing up and restoring is for the main owner of a convention centre or a catering business, never a team member.
export async function backupAccount(): Promise<{ session: SessionPayload; kind: BackupKind; ctx: Ctx; title: string } | { error: string; status: number }> {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "CATERER") || !session.orgId) return { error: "Forbidden", status: 403 };
  if (session.tm) return { error: "Only the main owner can back up or restore", status: 403 };
  const kind: BackupKind = session.role === "OWNER" ? "OWNER" : "CATERER";
  if (kind === "OWNER") {
    const org = await db.organization.findUnique({ where: { id: session.orgId }, select: { name: true } });
    return { session, kind, ctx: { orgId: session.orgId }, title: org?.name ?? "Convention centre" };
  }
  const caterer = await db.caterer.findFirst({ where: { orgId: session.orgId }, select: { id: true, name: true } });
  if (!caterer) return { error: "No catering profile yet", status: 404 };
  return { session, kind, ctx: { orgId: session.orgId, catererId: caterer.id }, title: caterer.name };
}
