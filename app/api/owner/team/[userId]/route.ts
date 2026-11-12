import { getMainVenueOwner, VALID_OWNER_DENY_KEYS } from "@/lib/caterer-team";
import { teamHandlers } from "@/lib/team-handlers";

const h = teamHandlers({ getOwner: getMainVenueOwner, role: "OWNER", validKeys: VALID_OWNER_DENY_KEYS });
export const PATCH = h.patch;
export const DELETE = h.remove;
