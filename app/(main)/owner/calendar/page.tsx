import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { OwnerCalendar } from "@/components/owner-calendar";

export default async function OwnerCalendarPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");

  if (!session.orgId) redirect("/owner/onboarding");

  const venues = await db.venue.findMany({
    where: { orgId: session.orgId },
    include: {
      halls: {
        include: { slotTemplates: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  if (venues.length === 0) redirect("/owner/onboarding");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Schedule</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          View and manage bookings across all your halls
        </p>
      </div>
      <OwnerCalendar venues={venues} />
    </div>
  );
}
