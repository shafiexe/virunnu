import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const bookings = await db.booking.findMany({
    where: {
      orgId: session.orgId!,
      status: { not: "EXPIRED" },
      ...(search ? {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        },
      } : {}),
    },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      hallSlot: { include: { hall: { include: { venue: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by customer
  const map = new Map<string, { name: string | null; phone: string; bookings: number; revenue: number; lastDate: Date }>();
  for (const b of bookings) {
    const cid = b.user?.id ?? `guest_${b.guestPhone ?? b.id}`;
    const e = map.get(cid);
    if (!e) {
      map.set(cid, { name: b.user?.name ?? b.guestName ?? null, phone: b.user?.phone ?? b.guestPhone ?? "—", bookings: 1, revenue: b.status === "CONFIRMED" ? b.totalPaise : 0, lastDate: b.createdAt });
    } else {
      e.bookings++;
      if (b.status === "CONFIRMED") e.revenue += b.totalPaise;
      if (b.createdAt > e.lastDate) e.lastDate = b.createdAt;
    }
  }

  const rows = [
    ["Name", "Phone", "Bookings", "Revenue (₹)", "Last Booking"],
    ...Array.from(map.values()).map((c) => [
      c.name ?? "",
      c.phone,
      String(c.bookings),
      (c.revenue / 100).toFixed(2),
      c.lastDate.toLocaleDateString("en-IN"),
    ]),
  ];

  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
