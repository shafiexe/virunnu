import { getMainOwner, VALID_DENY_KEYS } from "@/lib/caterer-team";
import { teamHandlers } from "@/lib/team-handlers";

const h = teamHandlers({ getOwner: getMainOwner, role: "CATERER", validKeys: VALID_DENY_KEYS });
export const GET = h.list;
export const POST = h.create;
