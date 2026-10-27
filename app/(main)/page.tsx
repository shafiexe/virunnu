import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import { CatererSearchForm } from "@/components/caterer-search-form";
import { VenueCard } from "@/components/venue-card";
import { CatererCard } from "@/components/caterer-card";
import { db } from "@/lib/db";
import { Building2, UtensilsCrossed, CheckCircle2 } from "lucide-react";
import { HeroBackground } from "@/components/hero-background";
import { VirunnuLogo } from "@/components/virunnu-logo";
import { getTranslations } from "next-intl/server";

type Props = { searchParams: Promise<{ city?: string; guests?: string; date?: string; type?: string; lat?: string; lng?: string; radiusKm?: string; catCity?: string; catCuisine?: string }> };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TYPE_KEYWORDS: Record<string, string[]> = {
  convention: ["convention", "conference", "civic"],
  auditorium: ["auditorium", "auditoreum"],
  banquet: ["banquet", "kalyana", "marriage", "reception"],
  wedding: ["wedding", "kalyana", "marriage", "bridal"],
};

export default async function HomePage({ searchParams }: Props) {
  await connection();
  const sp = await searchParams;
  const [th, tv, tc, tCta, tHow] = await Promise.all([
    getTranslations("hero"),
    getTranslations("venues"),
    getTranslations("catering"),
    getTranslations("cta"),
    getTranslations("howItWorks"),
  ]);
  const isFiltering = !!(sp.city || sp.guests || sp.date || sp.type || sp.lat);
  const nearbyFilter = sp.lat && sp.lng && sp.radiusKm
    ? { lat: parseFloat(sp.lat), lng: parseFloat(sp.lng), radiusKm: parseFloat(sp.radiusKm) }
    : null;
  const isCatFiltering = !!(sp.catCity || sp.catCuisine);


  // Build halls.some filter — merge guests capacity + date availability into a single condition
  const filterDate = sp.date ? new Date(sp.date + "T00:00:00.000Z") : null;
  const hallsFilter: Record<string, unknown> = {};
  if (sp.guests) hallsFilter.capacity = { gte: parseInt(sp.guests) };
  if (filterDate) {
    hallsFilter.slotTemplates = {
      some: {
        OR: [
          // No slot materialized for this date → still available (virtual slot)
          { hallSlots: { none: { date: filterDate } } },
          // Slot exists and is AVAILABLE
          { hallSlots: { some: { date: filterDate, status: "AVAILABLE" } } },
        ],
      },
    };
  }

  const [allVenues, allCaterers] = await Promise.all([
    db.venue.findMany({
      where: {
        approved: true,
        org: { disabled: false },
        ...(sp.city ? { city: { contains: sp.city, mode: "insensitive" } } : {}),
        ...(Object.keys(hallsFilter).length > 0 ? { halls: { some: hallsFilter } } : {}),
        ...(sp.type && TYPE_KEYWORDS[sp.type]
          ? {
              OR: TYPE_KEYWORDS[sp.type].map((kw) => ({
                name: { contains: kw, mode: "insensitive" },
              })),
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        address: true,
        lat: true,
        lng: true,
        phone: true,
        googleMapsUrl: true,
        halls: {
          select: {
            id: true,
            name: true,
            capacity: true,
            pricePerSlot: true,
            amenities: true,
            photos: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
          },
          orderBy: { capacity: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.caterer.findMany({
      where: {
        approved: true,
        disabled: false,
        ...(sp.catCity ? { city: { contains: sp.catCity, mode: "insensitive" } } : {}),
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const venuesWithDistance = nearbyFilter
    ? allVenues
        .map((v) => ({ ...v, distanceKm: haversineKm(nearbyFilter.lat, nearbyFilter.lng, v.lat, v.lng) }))
        .filter((v) => v.distanceKm <= nearbyFilter.radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : allVenues.map((v) => ({ ...v, distanceKm: undefined }));
  const venues = venuesWithDistance;

  const caterers = sp.catCuisine
    ? allCaterers.filter((c) =>
        c.cuisines.some((cu) => cu.toLowerCase().includes(sp.catCuisine!.toLowerCase()))
      )
    : allCaterers;

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #D97706 0%, #C96A20 60%, #DB5F2E 100%)" }}>
        <HeroBackground />
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-orange-600/15 pointer-events-none" />
        <div className="absolute top-8 left-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-28 sm:pt-20 sm:pb-32">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-3.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-semibold">{th("badge")}</span>
            </div>
            <h1 className="space-y-3">
              <span className="block">
                <VirunnuLogo fontSize={52} vColor="white" flameColor="#F0A010" textColor="white" />
              </span>
              <span
                className="block text-3xl sm:text-4xl text-white/95 leading-tight whitespace-pre-line"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontWeight: 600 }}
              >
                {th("tagline")}
              </span>
            </h1>
            <p className="text-white/85 text-lg leading-relaxed max-w-lg">
              {th("subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Search card (overlaps hero) ───────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 -mt-16 relative z-10 mb-10">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-5 sm:p-6">
          <SearchForm defaults={{ city: sp.city, guests: sp.guests, date: sp.date, type: sp.type }} />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16 space-y-14">

        {/* ── Venues ───────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {isFiltering ? tv("matching") : tv("heading")}
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                {nearbyFilter
                  ? tv("nearbyResults", { count: venues.length, km: nearbyFilter.radiusKm })
                  : isFiltering
                  ? tv("resultsFound", { count: venues.length })
                  : tv("subtitle")}
              </p>
            </div>
            {venues.length > 0 && (
              <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                {tv("count", { count: venues.length })}
              </span>
            )}
          </div>

          {venues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
              <Building2 className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 font-medium">{tv("noVenues")}</p>
              <p className="text-sm text-zinc-400 mt-1">{tv("noVenuesSub")}</p>
              <Link href="/" className="mt-4 inline-block text-sm font-semibold text-amber-600 hover:underline">
                {tv("clearFilters")}
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map((v) => (
                <VenueCard key={v.id} venue={v} distanceKm={v.distanceKm} />
              ))}
            </div>
          )}
        </section>

        {/* ── Catering ─────────────────────────────────────────── */}
        <section id="catering">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {tc("heading")}
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                {isCatFiltering
                  ? tc("found", { count: caterers.length })
                  : tc("subtitle")}
              </p>
            </div>
            {caterers.length > 0 && (
              <span className="bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 text-xs font-bold px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-800/40 shrink-0">
                {tc("count", { count: caterers.length })}
              </span>
            )}
          </div>

          {/* Catering search */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4 sm:p-5 mb-5">
            <CatererSearchForm defaults={{ catCity: sp.catCity, catCuisine: sp.catCuisine }} />
          </div>

          {caterers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-10 text-center">
              <UtensilsCrossed className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 font-medium">{tc("noCaterers")}</p>
              {isCatFiltering && (
                <>
                  <p className="text-sm text-zinc-400 mt-1">{tc("noCaterersSub")}</p>
                  <Link href={`/?${new URLSearchParams({ ...(sp.city ? { city: sp.city } : {}), ...(sp.guests ? { guests: sp.guests } : {}), ...(sp.date ? { date: sp.date } : {}), ...(sp.type ? { type: sp.type } : {}) })}`} className="mt-4 inline-block text-sm font-semibold text-orange-600 hover:underline">
                    {tc("clearFilters")}
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {caterers.map((c) => (
                <CatererCard key={c.id} caterer={c} />
              ))}
            </div>
          )}
        </section>

        {/* ── List with us ─────────────────────────────────────── */}
        <section>
          <div className="mb-5 text-center">
            <div className="inline-block bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3">
              {tCta("forProviders")}
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {tCta("growHeading")}
            </h2>
            <p className="text-zinc-500 mt-1.5 max-w-lg mx-auto text-sm">
              {tCta("growSub")}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Convention Hall CTA */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mb-5">
                <Building2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                {tCta("hallTitle")}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed flex-1">
                {tCta("hallDesc")}
              </p>
              <ul className="mt-4 space-y-2 mb-6">
                {tCta.raw("hallFeatures").map((f: string) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/apply/venue"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-5 py-2.5 text-sm font-bold text-white transition-colors"
              >
                {tCta("addVenue")}
              </Link>
            </div>

            {/* Caterer CTA */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center mb-5">
                <UtensilsCrossed className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                {tCta("catTitle")}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed flex-1">
                {tCta("catDesc")}
              </p>
              <ul className="mt-4 space-y-2 mb-6">
                {tCta.raw("catFeatures").map((f: string) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/apply/caterer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 px-5 py-2.5 text-sm font-bold text-white transition-colors"
              >
                {tCta("addCatering")}
              </Link>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{tHow("title")}</h2>
            <p className="text-sm text-zinc-500 mt-1">{tHow("subtitle")}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {(tHow.raw("steps") as { num: string; title: string; desc: string }[]).map((step) => (
              <div key={step.num} className="space-y-2">
                <div className="text-3xl font-bold text-amber-400/60">{step.num}</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-50">{step.title}</div>
                <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
