import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { OwnerBookingsTable } from "@/components/owner-bookings-table";

export default async function OwnerBookingsPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <OwnerBookingsTable />
    </div>
  );
}
