import { getCatererForSession } from "@/lib/caterer-session";
import { getSession } from "@/lib/session";
import { ACCESS_TREE } from "@/lib/caterer-access";
import { OWNER_ACCESS_TREE } from "@/lib/owner-access";
import type { AccessGroup } from "@/lib/caterer-access";

export { MAX_TEAM_LOGINS } from "@/lib/caterer-team-limit";

// Only the main owner (the login the team was set up with) manages logins; people they add never can.
export async function getMainOwner() {
  const ctx = await getCatererForSession();
  if (!ctx || ctx.session.tm || !ctx.caterer.orgId) return null;
  return { orgId: ctx.caterer.orgId, userId: ctx.session.userId, caterer: ctx.caterer, session: ctx.session };
}

export async function getMainVenueOwner() {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || session.tm || !session.orgId) return null;
  return { orgId: session.orgId, userId: session.userId, session };
}

// Every key an owner may hide: a page, one of its tabs, or "ro.<page>" for view-only
const keysOf = (tree: AccessGroup[]) => new Set(tree.flatMap((g) => g.items.flatMap((i) => [i.key, `ro.${i.key}`, ...(i.tabs ?? []).map((t) => t.key)])));
export const VALID_DENY_KEYS = keysOf(ACCESS_TREE);
export const VALID_OWNER_DENY_KEYS = keysOf(OWNER_ACCESS_TREE);
