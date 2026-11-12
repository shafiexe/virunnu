import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getCatererForSession } from "@/lib/caterer-session";
import { CatererOrdersTable } from "@/components/caterer-orders-table";
import { CatererSectionTabs, orderTabs } from "@/components/caterer-section-tabs";
import { db } from "@/lib/db";

const STATUSES = ["ALL", "CONFIRMED", "DUES", "COMPLETED", "CANCELLED"];
const PAGE_SIZES = [25, 50, 100, 200, 500];

export default async function CatererOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string; pageSize?: string }>;
}) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");

  const sp = await searchParams;
  const status = sp.status && STATUSES.includes(sp.status) ? sp.status : "ALL";
  const page = Math.max(1, parseInt(sp.page ?? "") || 1);
  const pageSize = PAGE_SIZES.includes(parseInt(sp.pageSize ?? "")) ? parseInt(sp.pageSize!) : 50;

  const pending = await db.cateringEnquiry.count({ where: { catererId: ctx.caterer.id, status: "PENDING" } });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4">
      <CatererSectionTabs tabs={orderTabs(pending)} active="orders" />
      <CatererOrdersTable initial={{ status, search: (sp.search ?? "").slice(0, 100), page, pageSize }} />
    </div>
  );
}
