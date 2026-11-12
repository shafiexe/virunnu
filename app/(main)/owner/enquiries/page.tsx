import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { getSession } from "@/lib/session";
import { pendingRequests } from "@/lib/owner-pending";
import { PendingRequests } from "@/components/pending-requests";

export default async function OwnerEnquiriesPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");

  const bookings = await pendingRequests(session.orgId);
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Enquiries</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Customers who asked to book a date. The slot is held for them until you approve or reject.</p>
      </div>
      {bookings.length > 0 ? <PendingRequests bookings={bookings} /> : (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-sm text-zinc-500">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
          No enquiries waiting. When a customer presses Request to Book, it shows up here.
        </div>
      )}
    </div>
  );
}
