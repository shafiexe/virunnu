import { db } from "@/lib/db";

// Customers who pressed "Request to Book": the slot is held until the owner approves or rejects
export async function pendingRequests(orgId: string) {
  const rows = await db.booking.findMany({
    where: { orgId, status: "PENDING" },
    include: { hallSlot: { include: { template: true, hall: { include: { venue: { select: { name: true } } } } } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((b) => ({
    id: b.id, guestName: b.guestName, guestPhone: b.guestPhone, guestEmail: b.guestEmail, totalPaise: b.totalPaise,
    createdAt: b.createdAt.toISOString(), heldUntil: b.hallSlot.heldUntil?.toISOString() ?? null,
    hallSlot: {
      date: b.hallSlot.date.toISOString().slice(0, 10),
      template: { name: b.hallSlot.template.name, startTime: b.hallSlot.template.startTime, endTime: b.hallSlot.template.endTime },
      hall: { name: b.hallSlot.hall.name, venue: { name: b.hallSlot.hall.venue.name } },
    },
  }));
}

export const pendingRequestCount = (orgId: string) => db.booking.count({ where: { orgId, status: "PENDING" } });

// Requests that are over: turned down by the owner, or never answered before the hold ran out. Kept here, not in Bookings.
export async function closedRequests(orgId: string) {
  const rows = await db.booking.findMany({
    where: { orgId, status: { in: ["REJECTED", "EXPIRED"] } },
    include: { user: { select: { name: true, phone: true } }, hallSlot: { include: { template: true, hall: { select: { name: true } } } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return rows.map((b) => ({
    id: b.id, rejected: b.status === "REJECTED", reason: b.status === "REJECTED" ? b.cancelReason : null,
    name: b.user?.name ?? b.guestName ?? "Guest", phone: b.user?.phone ?? b.guestPhone ?? "",
    totalPaise: b.totalPaise, requestedOn: b.createdAt.toISOString().slice(0, 10),
    eventDate: b.hallSlot.date.toISOString().slice(0, 10), slot: b.hallSlot.template.name, hall: b.hallSlot.hall.name,
  }));
}
