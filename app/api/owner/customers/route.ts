import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

type CustomerRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  phone: string | null;
  booking_count: bigint;
  confirmed_count: bigint;
  cancelled_count: bigint;
  total_paise: bigint;
  discount_paise: bigint;
  advance_paise: bigint;
  last_booking: Date;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(500, Math.max(25, parseInt(sp.get("pageSize") ?? "50") || 50));
  const search = (sp.get("search") ?? "").trim();
  const orgId = session.orgId!;
  const offset = (page - 1) * pageSize;
  const searchLike = `%${search}%`;

  const searchClause = search
    ? `AND (
        LOWER(COALESCE(u.name, b."guestName", '')) LIKE LOWER($2)
        OR COALESCE(u.phone, b."guestPhone", '') LIKE $2
      )`
    : "";

  const countSql = `
    SELECT COUNT(*) as count FROM (
      SELECT COALESCE(b."userId"::text, 'g_' || COALESCE(b."guestPhone", b.id)) as cid
      FROM "Booking" b
      LEFT JOIN "User" u ON u.id = b."userId"
      WHERE b."orgId" = $1 AND b.status != 'EXPIRED'
      ${searchClause}
      GROUP BY cid, b."userId", b."guestPhone"
    ) sub
  `;

  const dataSql = `
    SELECT
      COALESCE(b."userId"::text, 'g_' || COALESCE(b."guestPhone", MIN(b.id))) as id,
      b."userId" as user_id,
      COALESCE(MAX(u.name), MAX(b."guestName")) as name,
      COALESCE(MAX(u.phone), b."guestPhone") as phone,
      COUNT(*) as booking_count,
      COUNT(*) FILTER (WHERE b.status = 'CONFIRMED') as confirmed_count,
      COUNT(*) FILTER (WHERE b.status = 'CANCELLED') as cancelled_count,
      SUM(CASE WHEN b.status != 'CANCELLED' THEN b."totalPaise" ELSE 0 END) as total_paise,
      SUM(CASE WHEN b.status != 'CANCELLED' THEN COALESCE(b."discountPaise", 0) ELSE 0 END) as discount_paise,
      SUM(CASE WHEN b.status IN ('ADVANCE_PAID','CONFIRMED') THEN COALESCE(b."advancePaise", 0) ELSE 0 END) as advance_paise,
      MAX(b."createdAt") as last_booking
    FROM "Booking" b
    LEFT JOIN "User" u ON u.id = b."userId"
    WHERE b."orgId" = $1 AND b.status != 'EXPIRED'
    ${searchClause}
    GROUP BY
      COALESCE(b."userId"::text, 'g_' || COALESCE(b."guestPhone", b.id)),
      b."userId", b."guestPhone"
    ORDER BY last_booking DESC
    LIMIT $${search ? 3 : 2} OFFSET $${search ? 4 : 3}
  `;

  const countParams = search ? [orgId, searchLike] : [orgId];
  const dataParams = search ? [orgId, searchLike, pageSize, offset] : [orgId, pageSize, offset];

  const [countRows, rows] = await Promise.all([
    db.$queryRawUnsafe<[{ count: bigint }]>(countSql, ...countParams),
    db.$queryRawUnsafe<CustomerRow[]>(dataSql, ...dataParams),
  ]);

  const total = Number(countRows[0]?.count ?? 0);

  const data = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    phone: r.phone,
    bookingCount: Number(r.booking_count),
    confirmedCount: Number(r.confirmed_count),
    cancelledCount: Number(r.cancelled_count),
    totalPaise: Number(r.total_paise),
    discountPaise: Number(r.discount_paise),
    advancePaise: Number(r.advance_paise),
    lastBooking: r.last_booking,
  }));

  return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}
