import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { isAllowed, keysForRequest } from "@/lib/caterer-access";
import { ownerKeysForRequest } from "@/lib/owner-access";

// Runs before every catering and convention-centre page and API call. A person the owner added can only reach what the owner left ticked.
// The list of hidden pages travels in the signed session cookie, so this needs no database; changing someone's access
// signs them out (see lib/session.ts), which is what makes a change apply straight away.
const key = new TextEncoder().encode(process.env.SESSION_SECRET ?? "");

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("vr_session")?.value;
  if (!token) return NextResponse.next();
  let session: { tm?: boolean; deny?: string[]; role?: string };
  try { session = (await jwtVerify(token, key, { algorithms: ["HS256"] })).payload as typeof session; } catch { return NextResponse.next(); }
  if (!session.tm) return NextResponse.next();

  const { pathname, searchParams } = req.nextUrl;
  const owner = session.role === "OWNER";
  const keys = owner ? ownerKeysForRequest(pathname, req.method) : keysForRequest(pathname, req.method, searchParams);
  // the team screens are for the main owner only, whatever else is ticked
  const blocked = keys.includes("__owner") || !isAllowed(session.deny, keys);
  if (!blocked) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "You don't have access to this. Ask the owner." }, { status: 403 });
  return NextResponse.redirect(new URL(owner ? "/owner/no-access" : "/caterer/no-access", req.url));
}

export const config = { matcher: ["/caterer/:path*", "/owner/:path*", "/api/caterer/:path*", "/api/owner/:path*", "/api/bookings/:path*", "/api/payments/:path*"] };
