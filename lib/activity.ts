import { db } from "@/lib/db";
import type { SessionPayload } from "@/lib/session";

// Who did it. People the owner added are named on what they record ("by Rahim"); the main owner's own work carries no label.
export async function actorOf(session: SessionPayload) {
  const u = await db.user.findUnique({ where: { id: session.userId }, select: { name: true, phone: true } }).catch(() => null);
  const name = u?.name?.trim() || (session.tm ? u?.phone?.replace(/^\+91/, "") : "") || "Owner";
  return { name, label: session.tm ? name : null };
}

// A line in the owner's activity list. Never allowed to break the action it describes.
export async function logActivity(session: SessionPayload, summary: string, action = "change") {
  if (!session.orgId) return;
  try {
    const { name } = await actorOf(session);
    await db.activityLog.create({ data: { orgId: session.orgId, userId: session.userId, userName: name, action, summary: summary.slice(0, 300) } });
  } catch { /* the log is a convenience */ }
}
