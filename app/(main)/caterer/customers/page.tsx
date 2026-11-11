import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getCatererForSession } from "@/lib/caterer-session";
import { customerPage } from "@/lib/caterer-customers";
import { parsePaging, queryOf } from "@/lib/paging";
import { CatererCustomersTable } from "@/components/caterer-customers-table";
import { CatererSectionTabs, partyTabs } from "@/components/caterer-section-tabs";

export default async function CatererCustomersPage({ searchParams }: { searchParams: Promise<{ search?: string; due?: string; page?: string; pageSize?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const sp = await searchParams;
  const search = (sp.search ?? "").slice(0, 100);
  const dueOnly = sp.due === "1";

  const paged = await customerPage(ctx.caterer.id, { search, dueOnly, ...parsePaging(sp) });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      <CatererSectionTabs tabs={partyTabs()} active="customers" />
      <CatererCustomersTable
        customers={paged.rows} totalCustomers={paged.totalCustomers} totalDuePaise={paged.totalDuePaise}
        search={search} dueOnly={dueOnly} paging={{ page: paged.page, totalPages: paged.totalPages, total: paged.total, pageSize: paged.pageSize }}
        query={queryOf({ search, due: dueOnly ? "1" : undefined })}
      />
    </div>
  );
}
