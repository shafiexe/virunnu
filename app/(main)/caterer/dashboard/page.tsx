import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { CheckCircle, Clock, MapPin } from "lucide-react";
import { CatererServiceTab } from "@/components/caterer-service-tab";
import { CatererEnquiriesTab } from "@/components/caterer-enquiries-tab";
import { CatererDashboardTabs } from "@/components/caterer-dashboard-tabs";

export default async function CatererDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "CATERER") redirect("/login");

  const caterer = session.orgId
    ? await db.caterer.findFirst({
        where: { orgId: session.orgId },
        include: { menuItems: true, enquiries: { orderBy: { createdAt: "desc" } } },
      })
    : null;

  if (!caterer) redirect("/caterer/onboarding");

  const { tab = "service" } = await searchParams;
  const pendingCount = caterer.enquiries.filter((e) => e.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{caterer.name}</h1>
          <div className="flex items-center gap-1 text-zinc-500 text-sm mt-1">
            <MapPin className="h-4 w-4" />
            {caterer.city}, Kerala
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          caterer.approved
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
        }`}>
          {caterer.approved ? <><CheckCircle className="h-3.5 w-3.5" /> Listed</> : <><Clock className="h-3.5 w-3.5" /> Pending approval</>}
        </span>
      </div>

      {!caterer.approved && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-5">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            Your profile is under review. Our team will approve it within 24–48 hours.
          </p>
        </div>
      )}

      {/* Tabs */}
      <CatererDashboardTabs activeTab={tab} pendingCount={pendingCount} />

      {/* Tab content */}
      {tab === "service" && (
        <CatererServiceTab
          caterer={{
            id: caterer.id,
            name: caterer.name,
            phone: caterer.phone,
            city: caterer.city,
            state: caterer.state,
            description: caterer.description,
            cuisines: caterer.cuisines,
            whatsappNumber: caterer.whatsappNumber,
            email: caterer.email,
            instagramUrl: caterer.instagramUrl,
            facebookUrl: caterer.facebookUrl,
            youtubeUrl: caterer.youtubeUrl,
            websiteUrl: caterer.websiteUrl,
            services: caterer.services,
            photos: caterer.photos,
            menuItems: caterer.menuItems.map((m) => ({
              id: m.id,
              name: m.name,
              category: m.category,
              description: m.description,
              priceRupees: m.priceRupees,
              isVeg: m.isVeg,
              isSpecial: m.isSpecial,
            })),
          }}
        />
      )}
      {tab === "enquiries" && (
        <CatererEnquiriesTab
          initialEnquiries={caterer.enquiries.map((e) => ({
            ...e,
            eventDate: e.eventDate ? e.eventDate.toISOString() : null,
            createdAt: e.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
