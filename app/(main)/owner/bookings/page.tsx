import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { pendingRequestCount } from "@/lib/owner-pending";
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

  const waiting = await pendingRequestCount(session.orgId);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* requests are not bookings: they wait in Enquiries until approved */}
      <Link href="/owner/enquiries" className={waiting > 0
        ? "mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm hover:bg-amber-100/60"
        : "mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-amber-700"}>
        {waiting > 0
          ? <><span className="inline-flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200"><Inbox className="h-4 w-4" /> {waiting} request{waiting === 1 ? "" : "s"} to book waiting for you</span><span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Open Enquiries →</span></>
          : <><Inbox className="h-3.5 w-3.5" /> Requests to book are in Enquiries →</>}
      </Link>
      <OwnerBookingsTable initial={{ status, search: (sp.search ?? "").slice(0, 100), page, pageSize }} />
    </div>
  );
}
