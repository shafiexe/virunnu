import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export type SessionPayload = {
  userId: string;
  role: string;
  orgId?: string;
  // set for people the catering owner added: the pages hidden from them, and the version that must still match
  tm?: boolean;
  deny?: string[];
  av?: number;
};

const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
const COOKIE = "vr_session";
const EXPIRY = "7d";

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(key);
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await decrypt(token);
  // A team member is signed out the moment they are switched off or their access is changed
  if (session?.tm) {
    const u = await db.user.findUnique({ where: { id: session.userId }, select: { disabled: true, accessVersion: true, teamMember: true } });
    if (!u || u.disabled || !u.teamMember || u.accessVersion !== session.av) return null;
  }
  return session;
}

// The team details to carry in the cookie for a signed-in catering user
async function withTeam(payload: SessionPayload): Promise<SessionPayload> {
  if ((payload.role !== "CATERER" && payload.role !== "OWNER") || !payload.orgId || payload.userId === "admin") return payload;
  const u = await db.user.findUnique({ where: { id: payload.userId }, select: { teamMember: true, deny: true, accessVersion: true } });
  if (!u?.teamMember) return { ...payload, tm: undefined, deny: undefined, av: undefined };
  return { ...payload, tm: true, deny: u.deny, av: u.accessVersion };
}

export async function setSession(input: SessionPayload): Promise<void> {
  const token = await encrypt(await withTeam(input));
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
