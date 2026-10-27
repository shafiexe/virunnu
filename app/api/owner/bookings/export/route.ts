import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search") ?? "";

  const bookings = await db.booking.findMany({
    where: {
      orgId: session.orgId!,
      ...(status && status !== "ALL" ? { status: status as never } : {}),
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
      user: { select: { phone: true, name: true } },
      hallSlot: {
        include: {
          template: true,
          hall: { include: { venue: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = [
    ["Booking ID", "Date", "Venue", "Hall", "Slot", "Customer Name", "Phone", "Total (₹)", "Advance Paid (₹)", "Balance Due (₹)", "Status", "Payment Method", "Cancel Reason", "Created At"],
    ...bookings.map((b) => {
      const advPaise = b.advancePaise ?? 0;
      const balPaise = b.status === "ADVANCE_PAID" ? b.totalPaise - advPaise : 0;
      return [
        b.id,
        new Date(b.hallSlot.date).toLocaleDateString("en-IN"),
        b.hallSlot.hall.venue.name,
        b.hallSlot.hall.name,
        `${b.hallSlot.template.name} ${b.hallSlot.template.startTime}–${b.hallSlot.template.endTime}`,
        b.user?.name ?? b.guestName ?? "",
        b.user?.phone ?? b.guestPhone ?? "",
        (b.totalPaise / 100).toFixed(2),
        advPaise > 0 ? (advPaise / 100).toFixed(2) : "",
        balPaise > 0 ? (balPaise / 100).toFixed(2) : "",
        b.status,
        b.paymentMethod,
        b.cancelReason ?? "",
        b.createdAt.toISOString(),
      ];
    }),
  ];

  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
