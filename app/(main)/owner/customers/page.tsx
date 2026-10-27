import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { Download, Phone } from "lucide-react";
import Link from "next/link";

type Props = { searchParams: Promise<Record<string, string>> };

export default async function OwnerCustomersPage({ searchParams }: Props) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");

  const sp = await searchParams;
  const search = sp.search ?? "";

  const bookings = await db.booking.findMany({
    where: {
      orgId: session.orgId,
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
      hallSlot: {
        include: {
          hall: { include: { venue: { select: { name: true } } } },
        },
      },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  type CustomerEntry = {
    id: string;
    name: string | null;
    phone: string;
    bookingCount: number;
    totalPaise: number;
    discountPaise: number;
    paidPaise: number;
    lastBookingDate: Date;
    venues: Set<string>;
    statuses: string[];
  };

  const customerMap = new Map<string, CustomerEntry>();

  for (const b of bookings) {
    const isCancelled = b.status === "CANCELLED";
    const disc = b.discountPaise ?? 0;
    const paid = isCancelled ? 0
      : b.status === "CONFIRMED"
        ? b.totalPaise - disc
        : (b.advancePaise ?? 0) + (b.payment?.status === "PAID" ? b.payment.amountPaise : 0);
    const customerId = b.user?.id ?? `guest_${b.guestPhone ?? b.id}`;
    const customerName = b.user?.name ?? b.guestName ?? null;
    const customerPhone = b.user?.phone ?? b.guestPhone ?? "—";
    const existing = customerMap.get(customerId);
    if (!existing) {
      customerMap.set(customerId, {
        id: customerId,
        name: customerName,
        phone: customerPhone,
        bookingCount: 1,
        totalPaise: !isCancelled ? b.totalPaise : 0,
        discountPaise: !isCancelled ? b.discountPaise : 0,
        paidPaise: paid,
        lastBookingDate: b.createdAt,
        venues: new Set([b.hallSlot.hall.venue.name]),
        statuses: [b.status],
      });
    } else {
      existing.bookingCount++;
      if (!isCancelled) existing.totalPaise += b.totalPaise;
      if (!isCancelled) existing.discountPaise += b.discountPaise;
      existing.paidPaise += paid;
      if (b.createdAt > existing.lastBookingDate) existing.lastBookingDate = b.createdAt;
      existing.venues.add(b.hallSlot.hall.venue.name);
      existing.statuses.push(b.status);
    }
  }

  const customers = Array.from(customerMap.values()).sort(
    (a, b) => b.lastBookingDate.getTime() - a.lastBookingDate.getTime()
  );

  const exportUrl = `/api/owner/customers/export${search ? `?search=${encodeURIComponent(search)}` : ""}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Customers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{customers.length} unique customer{customers.length !== 1 ? "s" : ""}</p>
        </div>
        <a
          href={exportUrl}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <Download className="h-4 w-4" />
          CSV
        </a>
      </div>

      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.197 5.197a7.5 7.5 0 0 0 10.606 10.606Z" />
          </svg>
          <form method="get">
            <input
              type="search"
              name="search"
              placeholder="Search by name or phone…"
              defaultValue={search}
              className="w-full max-w-sm pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </form>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center">
          <p className="text-zinc-400 text-sm">
            {search ? "No customers match your search." : "No customers yet. Bookings will appear here."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  {["Customer", "Phone", "Bookings", "Total", "Discount", "Paid", "Balance", "Last booking"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {customers.map((c) => {
                  const confirmed = c.statuses.filter(s => s === "CONFIRMED").length;
                  const cancelled = c.statuses.filter(s => s === "CANCELLED").length;
                  const balance = Math.max(0, c.totalPaise - c.discountPaise - c.paidPaise);
                  return (
                    <tr key={c.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      {/* Customer name → links to detail */}
                      <td className="px-4 py-3">
                        <Link href={`/owner/customers/${c.id}`} className="flex items-center gap-3 group">
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
                            {(c.name ?? c.phone)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-amber-600 transition-colors">
                              {c.name ?? "No name"}
                            </div>
                            {c.venues.size > 1 && (
                              <div className="text-[10px] text-zinc-400">{c.venues.size} venues</div>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Phone → tel: link */}
                      <td className="px-4 py-3">
                        <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-amber-600 hover:underline">
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </a>
                      </td>

                      {/* Bookings count */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 w-fit">
                            {c.bookingCount} total
                          </span>
                          {confirmed > 0 && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ {confirmed} confirmed</span>
                          )}
                          {cancelled > 0 && (
                            <span className="text-[10px] text-red-500 dark:text-red-400">✕ {cancelled} cancelled</span>
                          )}
                        </div>
                      </td>

                      {/* Total (net of discount) */}
                      <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                        {c.totalPaise > 0 ? `₹${((c.totalPaise - c.discountPaise) / 100).toLocaleString("en-IN")}` : "—"}
                      </td>

                      {/* Discount */}
                      <td className="px-4 py-3 text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {c.discountPaise > 0 ? `−₹${(c.discountPaise / 100).toLocaleString("en-IN")}` : "—"}
                      </td>

                      {/* Paid */}
                      <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                        {c.paidPaise > 0 ? `₹${(c.paidPaise / 100).toLocaleString("en-IN")}` : "—"}
                      </td>

                      {/* Balance */}
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">
                        {c.totalPaise === 0
                          ? <span className="text-zinc-400">—</span>
                          : balance > 0
                            ? <span className="text-red-600 dark:text-red-400">₹{(balance / 100).toLocaleString("en-IN")}</span>
                            : <span className="text-emerald-600 dark:text-emerald-400 text-xs">Paid</span>}
                      </td>

                      {/* Last booking */}
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                        {c.lastBookingDate.toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
