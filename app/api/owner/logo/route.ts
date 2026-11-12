import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { lookup } from "dns/promises";
import net from "net";
import { db } from "@/lib/db";

const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 500 * 1024;

// Only public internet addresses, so a pasted link can't be used to reach this server's own network.
function isPrivate(ip: string) {
  if (net.isIPv6(ip)) return ip === "::1" || /^(fc|fd|fe80)/i.test(ip) || ip.startsWith("::ffff:");
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

async function fetchImage(link: string): Promise<{ data: Uint8Array<ArrayBuffer>; type: string } | { error: string }> {
  let u: URL;
  try { u = new URL(link); } catch { return { error: "That is not a valid link" }; }
  if (u.protocol !== "https:") return { error: "Use a link that starts with https://" };
  try {
    const addrs = await lookup(u.hostname, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivate(a.address))) return { error: "That link cannot be used" };
    const res = await fetch(u, { redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { error: "Could not open that link" };
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!TYPES.includes(type)) return { error: "The link must be a PNG, JPG or WebP picture" };
    const data = new Uint8Array(await res.arrayBuffer());
    if (data.length > MAX_BYTES) return { error: "That picture is too large (max 500 KB). Try a smaller one" };
    return { data, type };
  } catch {
    return { error: "Could not open that link" };
  }
}

async function orgOf() {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "CATERER") || !session.orgId) return null;
  return session.orgId;
}

export async function POST(req: NextRequest) {
  const orgId = await orgOf();
  if (!orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let data: Uint8Array<ArrayBuffer>, type: string;
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    // a link to a picture: fetched once and kept, so the logo keeps working if the other site changes or goes away
    const body = await req.json().catch(() => null);
    const got = await fetchImage(String(body?.url ?? "").trim());
    if ("error" in got) return NextResponse.json({ error: got.error }, { status: 400 });
    ({ data, type } = got);
  } else {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Choose an image" }, { status: 400 });
    if (!TYPES.includes(file.type)) return NextResponse.json({ error: "Use a PNG, JPG or WebP image" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Logo is too large (max 500 KB)" }, { status: 400 });
    data = new Uint8Array(await file.arrayBuffer()); type = file.type;
  }
  const now = new Date();
  await db.$transaction([
    db.orgLogo.upsert({ where: { orgId }, create: { orgId, contentType: type, data }, update: { contentType: type, data } }),
    db.organization.update({ where: { id: orgId }, data: { logoUpdatedAt: now } }),
  ]);
  return NextResponse.json({ url: `/api/logo/${orgId}?v=${now.getTime()}` }, { status: 201 });
}

export async function DELETE() {
  const orgId = await orgOf();
  if (!orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await db.$transaction([
    db.orgLogo.deleteMany({ where: { orgId } }),
    db.organization.update({ where: { id: orgId }, data: { logoUpdatedAt: null } }),
  ]);
  return NextResponse.json({ ok: true });
}
