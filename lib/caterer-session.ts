import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

// The catering team behind the current login (null when not a caterer or no profile yet).
export async function getCatererForSession() {
  const session = await getSession();
  if (!session || session.role !== "CATERER" || !session.orgId) return null;
  const caterer = await db.caterer.findFirst({ where: { orgId: session.orgId } });
  return caterer ? { session, caterer } : null;
}
