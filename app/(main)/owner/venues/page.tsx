import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { VenueManager } from "@/components/venue-manager";
import { FacilitiesManager } from "@/components/facilities-manager";
import { VenueProfileCard } from "@/components/venue-profile-card";
import { Plus } from "lucide-react";

export default async function OwnerVenuesPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");

  const [venues, facilities] = await Promise.all([
    db.venue.findMany({
      where: { orgId: session.orgId },
      include: {
        halls: {
          include: {
            slotTemplates: { orderBy: { startTime: "asc" } },
            photos: { orderBy: { sortOrder: "asc" } },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
      // include new fields implicitly via full model select
    }),
    db.facility.findMany({
      where: { orgId: session.orgId },
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-10">
      {/* ── My Venue profile ────────────────────────────────── */}
      {venues.length > 0 && (
        <div>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">My Venue</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Contact details shown to customers and used for notifications</p>
          </div>
          <div className="space-y-3">
            {venues.map((v) => (
              <VenueProfileCard
                key={v.id}
                venue={{
                  id: v.id,
                  name: v.name,
                  venueType: v.venueType,
                  phone: v.phone,
                  whatsappPhone: v.whatsappPhone,
                  email: v.email,
                  address: v.address,
                  city: v.city,
                  websiteUrl: v.websiteUrl,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Halls & Slots section ────────────────────────────── */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Halls &amp; Slots</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Manage halls, time slots, photos and pricing</p>
          </div>
          {venues.length === 0 && (
            <Link
              href="/owner/onboarding"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add venue
            </Link>
          )}
        </div>
        <VenueManager venues={venues} />
      </div>

      {/* ── Facilities / Add-ons section ─────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Amenities &amp; Add-ons</h2>
            <p className="text-sm text-zinc-500 mt-0.5">What your venue offers — add what applies and set a price if it&apos;s extra</p>
          </div>
        </div>
        <FacilitiesManager initial={facilities} isEmpty={facilities.length === 0} />
      </div>
    </div>
  );
}
