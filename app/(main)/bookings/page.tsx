import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { GST_RATE } from "@/lib/gst";
import { Calendar, MapPin, ArrowRight } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  PENDING:      "Awaiting payment",
  ADVANCE_PAID: "Advance paid",
  CONFIRMED:    "Confirmed",
  CANCELLED:    "Cancelled",
  EXPIRED:      "Expired",
};

const STATUS_DOT: Record<string, string> = {
  PENDING:      "bg-amber-400",
  ADVANCE_PAID: "bg-blue-400",
  CONFIRMED:    "bg-emerald-500",
  CANCELLED:    "bg-red-400",
  EXPIRED:      "bg-zinc-400",
};

export default async function MyBookingsPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const bookings = await db.booking.findMany({
    where: { userId: session.userId },
    include: {
      hallSlot: {
        include: {
          template: true,
          hall: { include: { venue: { select: { name: true, city: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">My bookings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{bookings.length} booking{bookings.length !== 1 ? "s" : ""} found</p>
        </div>
        {bookings.length > 0 && (
          <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm font-bold px-3 py-1 rounded-full">
            {bookings.filter(b => b.status === "CONFIRMED").length} confirmed
          </span>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center space-y-4">
          <div className="text-4xl">🏛️</div>
          <div>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">No bookings yet</p>
            <p className="text-sm text-zinc-500 mt-1">Find a hall that suits your celebration.</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
          >
            Browse halls
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const venue = b.hallSlot.hall.venue;
            const hall = b.hallSlot.hall;
            const tmpl = b.hallSlot.template;
            const date = new Date(b.hallSlot.date).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            const statusStyle: Record<string, string> = {
              CONFIRMED:    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
              ADVANCE_PAID: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
              PENDING:      "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
              CANCELLED:    "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
              EXPIRED:      "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
            };

            // Back-compute base from GST-inclusive total (customer bookings always go through withGST)
            const basePaise = Math.round(b.totalPaise / (1 + GST_RATE / 100));
            const gstPaise = b.totalPaise - basePaise;

            return (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="flex items-center gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-300 dark:hover:border-amber-700/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5"
              >
                <div className={`w-1 self-stretch rounded-full ${STATUS_DOT[b.status] ?? "bg-zinc-300"}`} />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{hall.name}</div>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {venue.name}, {venue.city}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {date} · {tmpl.name} ({tmpl.startTime}–{tmpl.endTime})
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle[b.status] ?? statusStyle.EXPIRED}`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      ₹{(basePaise / 100).toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      +₹{(gstPaise / 100).toLocaleString("en-IN")} GST
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-amber-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
