import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { canOpenOwner } from "@/lib/owner-access";

type Hit = { kind: string; title: string; sub: string; href: string };
const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// One search box: a customer by name or phone, and their bookings.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (!q) return NextResponse.json({ hits: [] });
  const digits = q.replace(/\D/g, "");
  const word = { contains: q, mode: "insensitive" as const };
  const hidePhones = !!session.deny?.includes("hide.phones");

  const bookings = await db.booking.findMany({
    where: {
      orgId: session.orgId, status: { not: "EXPIRED" },
      OR: [
        { guestName: word }, { user: { name: word } },
        ...(digits.length >= 3 && !hidePhones ? [{ guestPhone: { contains: digits } }, { user: { phone: { contains: digits } } }] : []),
      ],
    },
    orderBy: { createdAt: "desc" }, take: 12,
    select: { id: true, status: true, guestName: true, guestPhone: true, user: { select: { id: true, name: true, phone: true } }, hallSlot: { select: { date: true, template: { select: { name: true } } } } },
  });

  const hits: Hit[] = [];
  const seen = new Set<string>();
  for (const b of bookings) {
    const u = b.user;
    if (u && !seen.has(u.id)) { seen.add(u.id); hits.push({ kind: "Customer", title: u.name ?? "Customer", sub: hidePhones ? "" : u.phone, href: `/owner/customers/${u.id}` }); }
  }
  for (const b of bookings.slice(0, 6)) {
    hits.push({ kind: "Booking", title: `${b.user?.name ?? b.guestName ?? "Guest"} · ${day(b.hallSlot.date)}`, sub: `${b.hallSlot.template.name} · ${b.status.replace("_", " ").toLowerCase()}`, href: `/owner/bookings/${b.id}` });
  }
  return NextResponse.json({ hits: hits.filter((h) => canOpenOwner(session.deny, h.href)) });
}
