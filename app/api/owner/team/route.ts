import { getMainVenueOwner, VALID_OWNER_DENY_KEYS } from "@/lib/caterer-team";
import { teamHandlers } from "@/lib/team-handlers";

const h = teamHandlers({ getOwner: getMainVenueOwner, role: "OWNER", validKeys: VALID_OWNER_DENY_KEYS });
export const GET = h.list;
export const POST = h.create;
