import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { CatererEnquiriesTab } from "@/components/caterer-enquiries-tab";
import { CatererSectionTabs, orderTabs } from "@/components/caterer-section-tabs";

export default async function CatererEnquiriesPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "CATERER") redirect("/login");

  const caterer = session.orgId
    ? await db.caterer.findFirst({
        where: { orgId: session.orgId },
        include: { enquiries: { orderBy: { createdAt: "desc" } } },
      })
    : null;
  if (!caterer) redirect("/caterer/onboarding");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <CatererSectionTabs tabs={orderTabs(caterer.enquiries.filter((e) => e.status === "PENDING").length)} active="enquiries" />
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Enquiries</h1>
      <CatererEnquiriesTab
        initialEnquiries={caterer.enquiries.map((e) => ({
          ...e,
          eventDate: e.eventDate ? e.eventDate.toISOString() : null,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
