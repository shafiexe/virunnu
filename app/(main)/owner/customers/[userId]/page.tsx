import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { CustomerDetail } from "@/components/customer-detail";

type Props = { params: Promise<{ userId: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");

  const { userId } = await params;

  const isGuest = userId.startsWith("guest_");
  const guestPhone = isGuest ? userId.replace(/^guest_/, "") : null;

  const bookings = await db.booking.findMany({
    where: isGuest
      ? { orgId: session.orgId, guestPhone, status: { not: "EXPIRED" } }
      : { orgId: session.orgId, userId, status: { not: "EXPIRED" } },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      hallSlot: {
        include: {
          hall: { include: { venue: { select: { name: true } } } },
          template: { select: { name: true } },
        },
      },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (bookings.length === 0) redirect("/owner/customers");

  const firstBooking = bookings[0];
  const customer = firstBooking.user ?? {
    id: userId,
    name: firstBooking.guestName ?? null,
    phone: firstBooking.guestPhone ?? "—",
  };

  const serialized = bookings.map((b) => ({
    id: b.id,
    status: b.status,
    totalPaise: b.totalPaise,
    advancePaise: b.advancePaise ?? 0,
    discountPaise: b.discountPaise,
    discountReason: b.discountReason,
    cancelReason: b.cancelReason,
    refundPaise: b.refundPaise ?? 0,
    refundNote: b.refundNote,
    paymentMethod: b.paymentMethod,
    createdAt: b.createdAt.toISOString(),
    hallName: b.hallSlot.hall.name,
    venueName: b.hallSlot.hall.venue.name,
    templateName: b.hallSlot.template?.name ?? null,
    slotDate: b.hallSlot.date.toISOString().slice(0, 10),
    slotSession: b.hallSlot.template?.name ?? "",
    paidPaise:
      b.status === "CANCELLED" ? 0 :
      b.status === "CONFIRMED"
        ? b.totalPaise - (b.discountPaise ?? 0) - (b.advancePaise ?? 0)
        : (b.payment?.status === "PAID" ? b.payment.amountPaise : 0),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <CustomerDetail
        customer={{ id: customer.id, name: customer.name, phone: customer.phone }}
        bookings={serialized}
      />
    </div>
  );
}
