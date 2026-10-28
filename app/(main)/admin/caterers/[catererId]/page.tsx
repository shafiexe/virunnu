import { connection } from "next/server";
export const instant = false;
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { CatererServiceTab } from "@/components/caterer-service-tab";
import { MenuManager } from "@/components/menu-manager";

export default async function AdminCatererDetailPage({
  params,
}: {
  params: Promise<{ catererId: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const { catererId } = await params;

  const caterer = await db.caterer.findUnique({
    where: { id: catererId },
    include: { menuItems: { orderBy: { category: "asc" } } },
  });

  if (!caterer) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-8">
      {/* Back */}
      <Link
        href="/admin/caterers"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to caterers
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{caterer.name}</h1>
        <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{caterer.city}, {caterer.state}</span>
          <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{caterer.phone}</span>
          {!caterer.approved && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">PENDING</span>
          )}
          {caterer.disabled && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">DISABLED</span>
          )}
        </div>
      </div>

      {/* Service profile — admin PATCH route via /api/caterer/profile (session-based)
          so we render CatererServiceTab which calls that endpoint.
          Admin must be logged in as the caterer org to use that endpoint;
          instead we embed a note and use the separate admin edit form on the list page.
          For menu, admin can add/delete using the catererId prop. */}

      {/* Service Profile */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">Service Profile</h2>
        <p className="text-sm text-zinc-500 mb-4">Edit contact info, social links, services, cuisines and photos</p>
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
          adminCatererId={catererId}
        />
      </div>

      {/* Menu */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">Menu Items</h2>
        <p className="text-sm text-zinc-500 mb-4">Add, remove or review menu items for this caterer</p>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <MenuManager initialItems={caterer.menuItems} catererId={catererId} />
        </div>
      </div>
    </div>
  );
}
