import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { SendReminderButton } from "@/components/send-reminder";
import { BookingsFilter } from "@/components/bookings-filter";
import { OwnerBookingActions } from "@/components/owner-booking-actions";
import { PendingRequests } from "@/components/pending-requests";
import { Download, Printer } from "lucide-react";

type BookingStatus = "PENDING" | "APPROVED" | "ADVANCE_PAID" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
const STATUS_STYLE: Record<BookingStatus, string> = {
  PENDING:      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  APPROVED:     "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400",
  ADVANCE_PAID: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
  CONFIRMED:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  CANCELLED:    "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  EXPIRED:      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};
const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING:      "Pending",
  APPROVED:     "Approved",
  ADVANCE_PAID: "Advance paid",
  CONFIRMED:    "Confirmed",
  CANCELLED:    "Cancelled",
  EXPIRED:      "Expired",
};

const PAGE_SIZE = 20;

type Props = { searchParams: Promise<Record<string, string>> };

export default async function OwnerBookingsPage({ searchParams }: Props) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");

  const sp = await searchParams;
  const search = sp.search ?? "";
  const status = sp.status ?? "ALL";
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);

  const where = {
    orgId: session.orgId,
    ...(status !== "ALL" ? { status: status as BookingStatus } : {}),
    ...(search ? {
      OR: [
        { user: { name: { contains: search, mode: "insensitive" as const } } },
        { user: { phone: { contains: search } } },
        { guestName: { contains: search, mode: "insensitive" as const } },
        { guestPhone: { contains: search } },
      ],
    } : {}),
  };

  const [total, bookings, pendingBookings] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      include: {
        user: { select: { phone: true, name: true } },
        hallSlot: {
          include: {
            template: true,
            hall: { include: { venue: { select: { name: true } } } },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.booking.findMany({
      where: { orgId: session.orgId, status: "PENDING" },
      include: {
        hallSlot: {
          include: {
            template: true,
            hall: { include: { venue: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const exportUrl = `/api/owner/bookings/export?${new URLSearchParams({ ...(status !== "ALL" ? { status } : {}), ...(search ? { search } : {}) }).toString()}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Bookings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} booking{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={exportUrl}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            CSV
          </a>
          <a
            href={`/owner/bookings/print?${new URLSearchParams({ ...(status !== "ALL" ? { status } : {}), ...(search ? { search } : {}) }).toString()}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </a>
        </div>
      </div>

      <div className="mb-4">
        <BookingsFilter />
      </div>

      {pendingBookings.length > 0 && (
        <div className="mb-6">
          <PendingRequests
            bookings={pendingBookings.map((b) => ({
              id: b.id,
              guestName: b.guestName,
              guestPhone: b.guestPhone,
              guestEmail: b.guestEmail,
              totalPaise: b.totalPaise,
              createdAt: b.createdAt.toISOString(),
              heldUntil: b.hallSlot.heldUntil?.toISOString() ?? null,
              hallSlot: {
                date: b.hallSlot.date.toISOString().slice(0, 10),
                template: { name: b.hallSlot.template.name, startTime: b.hallSlot.template.startTime, endTime: b.hallSlot.template.endTime },
                hall: { name: b.hallSlot.hall.name, venue: { name: b.hallSlot.hall.venue.name } },
              },
            }))}
          />
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wide w-10">#</th>
                {["Date & Slot", "Customer", "Amount", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-400">
                    {search || status !== "ALL" ? "No bookings match your filter." : "No bookings yet."}
                  </td>
                </tr>
              )}
              {bookings.map((b, idx) => {
                const date = new Date(b.hallSlot.date).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                });
                return (
                  <tr key={b.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-zinc-400 tabular-nums">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-zinc-900 dark:text-zinc-50">{date}</div>
                      <div className="text-zinc-500 text-xs">
                        {b.hallSlot.template.name} · {b.hallSlot.template.startTime}–{b.hallSlot.template.endTime}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-zinc-900 dark:text-zinc-50">{b.user?.name ?? b.guestName ?? "—"}</div>
                      <div className="text-zinc-500 text-xs">{b.user?.phone ?? b.guestPhone ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const disc = b.discountPaise ?? 0;
                        const net = b.totalPaise - disc;
                        const paidPaise =
                          b.status === "CONFIRMED" ? net :
                          b.status === "ADVANCE_PAID" ? (b.advancePaise ?? 0) :
                          (b.payment?.status === "PAID" ? b.payment.amountPaise : 0);
                        const balance = Math.max(0, net - paidPaise);
                        const cancelled = b.status === "CANCELLED" || b.status === "EXPIRED";
                        const awaitingPayment = b.status === "PENDING" || b.status === "APPROVED";
                        return (
                          <div className="space-y-0.5 text-xs">
                            <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
                              ₹{(b.totalPaise / 100).toLocaleString("en-IN")}
                            </div>
                            {disc > 0 && (
                              <div className="text-amber-600 dark:text-amber-400" title={b.discountReason ?? undefined}>
                                🏷️ −₹{(disc / 100).toLocaleString("en-IN")}
                                {b.discountReason && <span className="text-zinc-400 ml-1">· {b.discountReason}</span>}
                              </div>
                            )}
                            {!cancelled && !awaitingPayment && paidPaise > 0 && (
                              <div className="text-emerald-600 dark:text-emerald-400">
                                Paid ₹{(paidPaise / 100).toLocaleString("en-IN")}
                              </div>
                            )}
                            {!cancelled && !awaitingPayment && balance > 0 && (
                              <div className="text-red-500 dark:text-red-400 font-medium">
                                Due ₹{(balance / 100).toLocaleString("en-IN")}
                              </div>
                            )}
                            {!cancelled && !awaitingPayment && balance === 0 && (
                              <div className="text-emerald-600 dark:text-emerald-400">Fully paid</div>
                            )}
                            {b.status === "APPROVED" && (
                              <div className="text-zinc-400">Awaiting payment</div>
                            )}
                            {b.paymentMethod === "CASH" && !awaitingPayment && (
                              <div className="text-zinc-400">💵 Cash</div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[b.status as BookingStatus] ?? STATUS_STYLE.EXPIRED}`}>
                        {STATUS_LABEL[b.status as BookingStatus] ?? b.status}
                      </span>
                      {b.cancelReason && (
                        <div className="text-[10px] text-zinc-400 mt-1 max-w-[120px] truncate" title={b.cancelReason}>
                          {b.cancelReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/owner/bookings/${b.id}/invoice`}
                          className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap"
                        >
                          Invoice
                        </Link>
                        {(b.status === "PENDING" || b.status === "APPROVED" || b.status === "CONFIRMED" || b.status === "ADVANCE_PAID") && (
                          <SendReminderButton
                            data={{
                              customerPhone: b.user?.phone ?? b.guestPhone ?? "",
                              customerName: b.user?.name ?? b.guestName ?? "",
                              venueName: b.hallSlot.hall.venue.name,
                              hallName: b.hallSlot.hall.name,
                              bookingDate: new Date(b.hallSlot.date).toLocaleDateString("en-IN", {
                                day: "numeric", month: "long", year: "numeric",
                              }),
                              slotName: b.hallSlot.template.name,
                              startTime: b.hallSlot.template.startTime,
                              endTime: b.hallSlot.template.endTime,
                              totalPaise: b.totalPaise,
                              advancePaise: b.advancePaise,
                              bookingId: b.id,
                            }}
                          />
                        )}
                        <OwnerBookingActions
                          bookingId={b.id}
                          status={b.status as BookingStatus}
                          totalPaise={b.totalPaise}
                          advancePaise={b.advancePaise}
                          paymentMethod={b.paymentMethod as "ONLINE" | "CASH"}
                          cancelReason={b.cancelReason}
                          discountPaise={b.discountPaise}
                          discountReason={b.discountReason}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-1">
              {page > 1 && (
                <Link
                  href={`?${new URLSearchParams({ ...(search ? { search } : {}), ...(status !== "ALL" ? { status } : {}), page: String(page - 1) }).toString()}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`?${new URLSearchParams({ ...(search ? { search } : {}), ...(status !== "ALL" ? { status } : {}), page: String(page + 1) }).toString()}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
