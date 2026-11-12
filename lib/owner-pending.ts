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
