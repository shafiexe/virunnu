import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { OwnerBookingsTable } from "@/components/owner-bookings-table";

const STATUSES = ["ALL", "ADVANCE_PAID", "CONFIRMED", "CANCELLED"];
const PAGE_SIZES = [25, 50, 100, 200, 500];

export default async function OwnerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string; pageSize?: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");

  const sp = await searchParams;
  const status = sp.status && STATUSES.includes(sp.status) ? sp.status : "ALL";
  const page = Math.max(1, parseInt(sp.page ?? "") || 1);
  const pageSize = PAGE_SIZES.includes(parseInt(sp.pageSize ?? "")) ? parseInt(sp.pageSize!) : 50;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <OwnerBookingsTable initial={{ status, search: (sp.search ?? "").slice(0, 100), page, pageSize }} />
    </div>
  );
}
