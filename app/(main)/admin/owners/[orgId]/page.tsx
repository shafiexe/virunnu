import { connection } from "next/server";
export const instant = false;
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { VenueProfileCard } from "@/components/venue-profile-card";
import { VenueManager } from "@/components/venue-manager";
import { FacilitiesManager } from "@/components/facilities-manager";
import { ArrowLeft } from "lucide-react";

export default async function AdminOwnerDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const { orgId } = await params;

  const [org, facilities] = await Promise.all([
    db.organization.findUnique({
      where: { id: orgId },
      include: {
        users: { where: { role: "OWNER" }, select: { id: true, name: true, phone: true, email: true } },
        venues: {
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
        },
      },
    }),
    db.facility.findMany({
      where: { orgId },
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!org || org.type !== "CONVENTION") notFound();

  const owner = org.users[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-10">
      {/* Back */}
      <Link
        href="/admin/owners"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to owners
      </Link>

      {/* Org header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{org.name}</h1>
        {owner && (
          <p className="text-sm text-zinc-500 mt-1">
            Owner: {owner.name ?? "—"} · {owner.phone}
            {owner.email && ` · ${owner.email}`}
          </p>
        )}
      </div>

      {/* ── Venue profile ───────────────────────────────────── */}
      {org.venues.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">My Venue</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Contact details shown to customers and used for notifications</p>
          </div>
          <div className="space-y-3">
            {org.venues.map((v) => (
              <VenueProfileCard
                key={v.id}
                venue={{
                  id: v.id,
                  name: v.name,
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

      {/* ── Halls & Slots ───────────────────────────────────── */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Halls &amp; Slots</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Manage halls, time slots, photos and pricing</p>
        </div>
        {org.venues.length > 0 ? (
          <VenueManager venues={org.venues} />
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
            <p className="text-sm text-zinc-400">No venues added yet for this organization.</p>
          </div>
        )}
      </div>

      {/* ── Amenities & Add-ons ─────────────────────────────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Amenities &amp; Add-ons</h2>
          <p className="text-sm text-zinc-500 mt-0.5">What the venue offers — add what applies and set a price if it&apos;s extra</p>
        </div>
        <FacilitiesManager initial={facilities} isEmpty={facilities.length === 0} orgId={orgId} />
      </div>
    </div>
  );
}
