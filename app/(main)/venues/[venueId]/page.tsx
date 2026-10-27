import { connection } from "next/server";
export const instant = false;
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Users, ArrowLeft, IndianRupee } from "lucide-react";
import { SlotCalendar } from "@/components/slot-calendar";
import { PhotoCarousel } from "@/components/photo-carousel";
import { getVenue, getHallAvailability } from "@/services/venue.service";
import { releaseExpiredHolds } from "@/services/booking.service";

type Props = { params: Promise<{ venueId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { venueId } = await params;
  const venue = await getVenue(venueId);
  if (!venue) return {};

  const city = [venue.city, venue.state].filter(Boolean).join(", ");
  const maxCap = venue.halls.length
    ? Math.max(...venue.halls.map((h) => h.capacity))
    : null;
  const minPrice = venue.halls.length
    ? Math.min(...venue.halls.map((h) => h.pricePerSlot))
    : null;
  const hallTypes = venue.halls.map((h) => h.name).slice(0, 2).join(" & ");

  const title = `${venue.name}${city ? ` — ${city}` : ""} | Virunnu`;
  const description = [
    `Book ${venue.name}${city ? ` in ${city}` : ""} on Virunnu.`,
    hallTypes && `Halls: ${hallTypes}.`,
    maxCap && `Capacity up to ${maxCap.toLocaleString("en-IN")} guests.`,
    minPrice && `Starting from ₹${(minPrice / 100).toLocaleString("en-IN")}.`,
    "Check availability and book instantly.",
  ]
    .filter(Boolean)
    .join(" ");

  const ogImage =
    venue.halls.flatMap((h) => h.photos).find((p) => p?.url)?.url ?? null;

  const url = `https://virunnu.com/venues/${venueId}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "Virunnu",
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: venue.name }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

async function fetchMonthSlots(hallId: string, year: number, month: number) {
  const from = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  await releaseExpiredHolds();
  return getHallAvailability(hallId, from, last);
}

// ── Facility types ────────────────────────────────────────────────────────────
type Facility = { id: string; name: string; icon: string; amountPaise: number; description: string | null };

// ── Keyword → Material Symbols icon name (longest match first for priority)
const AMENITY_ICON_MAP: [string, string][] = [
  // Specific phrases first
  ["air condition", "ac_unit"], ["a/c", "ac_unit"], ["ac/", "ac_unit"], ["ac cooling", "ac_unit"],
  ["sound system", "speaker"], ["pa system", "speaker"],
  ["backup power", "backup"], ["power backup", "backup"], ["ups", "backup"],
  ["security camera", "tv"], ["cctv", "tv"],
  ["catering kitchen", "kitchen"],
  ["video screen", "videocam"], ["led screen", "videocam"], ["projector", "videocam"],
  ["event space", "event"],
  ["child care", "child_care"], ["childcare", "child_care"],
  ["airport shuttle", "airport_shuttle"],
  ["local_gas_station", "local_gas_station"],
  // Single-word / shorter matches
  ["parking", "local_parking"],
  ["wifi", "wifi"], ["wi-fi", "wifi"], ["wireless", "wifi"],
  ["generator", "local_gas_station"],
  ["kitchen", "kitchen"], ["catering", "kitchen"],
  ["garden", "park"], ["lawn", "park"], ["outdoor", "park"],
  ["stage", "celebration"], ["decor", "celebration"],
  ["music", "music_note"], ["audio", "music_note"],
  ["speaker", "speaker"],
  ["projector", "videocam"],
  ["shuttle", "airport_shuttle"], ["transport", "airport_shuttle"],
  ["power", "power"], ["electricity", "power"],
  ["security", "security"],
  ["kids", "child_care"],
  [" ac", "ac_unit"],
];

function AmenityIcon({ name }: { name: string }) {
  const lower = ` ${name.toLowerCase()} `;
  const match = AMENITY_ICON_MAP.find(([kw]) => lower.includes(kw.toLowerCase()));
  const iconName = match?.[1] ?? "check_circle";
  return (
    <span
      className="material-symbols-rounded text-[18px] leading-none text-amber-600 dark:text-amber-400"
      style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
    >
      {iconName}
    </span>
  );
}


export default async function VenuePage({ params }: Props) {
  await connection();
  const { venueId } = await params;
  const venue = await getVenue(venueId);
  if (!venue) notFound();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const initialMonth = `${year}-${String(month + 1).padStart(2, "0")}`;

  const hallsWithSlots = await Promise.all(
    venue.halls.map(async (hall) => {
      const rawSlots = await fetchMonthSlots(hall.id, year, month);
      return {
        ...hall,
        slots: rawSlots.map((s) => ({
          ...s,
          date: s.date instanceof Date ? s.date.toISOString().slice(0, 10) : s.date,
        })),
      };
    })
  );

  // Facilities (from the venue's org, fetched inside getVenue)
  const facilities: Facility[] = (venue.org?.facilities ?? []) as Facility[];
  const includedFacilities = facilities.filter((f) => f.amountPaise === 0);
  const addonFacilities = facilities.filter((f) => f.amountPaise > 0);

  // Collect all photos across all halls for the hero mosaic
  const allPhotos: HallPhoto[] = hallsWithSlots.flatMap((h: Hall) => h.photos ?? []);

  // Capacity range
  const capacities = hallsWithSlots.map((h: Hall) => h.capacity);
  const maxCap = capacities.length ? Math.max(...capacities) : 0;
  const minPrice = hallsWithSlots.length
    ? Math.min(...hallsWithSlots.map((h: Hall) => h.pricePerSlot))
    : 0;

  // OpenStreetMap embed URL using venue coordinates
  const lat: number = venue.lat ?? 10.85;
  const lng: number = venue.lng ?? 76.27;
  const delta = 0.012;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`;
  // Google Maps links — directions prompts user for their location; open page shows the place
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const openInMapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, ${venue.address}, ${venue.city}`)}`;
  const openStreetMapHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EventVenue",
    name: venue.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address,
      addressLocality: venue.city ?? undefined,
      addressRegion: venue.state ?? undefined,
      postalCode: venue.pincode ?? undefined,
      addressCountry: "IN",
    },
    geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
    telephone: venue.phone ?? undefined,
    url: `https://virunnu.com/venues/${venueId}`,
    ...(allPhotos[0]?.url ? { image: allPhotos[0].url } : {}),
    ...(maxCap ? { maximumAttendeeCapacity: maxCap } : {}),
  };

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Back link */}
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          All venues
        </Link>
      </div>

      {/* Hero photo carousel */}
      <div className="mx-auto max-w-6xl px-4 mb-0">
        <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <PhotoCarousel photos={allPhotos} venueName={venue.name} />
        </div>
      </div>

      {/* Venue header */}
      <div className="mx-auto max-w-6xl px-4 pt-5 pb-0">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-6 py-5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
            {venue.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
              {venue.address}
            </span>
            {maxCap > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4 text-amber-500 shrink-0" />
                Up to {maxCap.toLocaleString()} guests
              </span>
            )}
            {minPrice > 0 && (
              <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <IndianRupee className="h-3.5 w-3.5 shrink-0" />
                from {(minPrice / 100).toLocaleString("en-IN")} per slot
              </span>
            )}
          </div>
          {/* Info row — ratings, contact, website */}
          {(venue.googleRating || venue.websiteUrl || venue.googleMapsUrl || venue.googleReviewUrl || venue.phone || venue.email) && (
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              {venue.googleRating && (
                <a
                  href={venue.googleMapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-amber-600 transition-colors"
                >
                  <span className="text-amber-400">★</span>
                  {venue.googleRating.toFixed(1)}
                  {venue.googleReviewCount && (
                    <span className="text-xs font-normal text-zinc-400">({venue.googleReviewCount} Google reviews)</span>
                  )}
                </a>
              )}
              {venue.googleReviewUrl && (
                <a
                  href={venue.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  ✏️ Write a review
                </a>
              )}
              {venue.phone && (
                <a
                  href={`tel:${venue.phone}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  📞 {venue.phone}
                </a>
              )}
              {venue.email && (
                <a
                  href={`mailto:${venue.email}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  ✉️ {venue.email}
                </a>
              )}
              {venue.websiteUrl && (
                <a
                  href={venue.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-500 hover:text-amber-600 transition-colors underline"
                >
                  {venue.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Per-hall sections */}
      <div className="mx-auto max-w-6xl px-4 pt-5 pb-10 space-y-8">
        {hallsWithSlots.map((hall: Hall) => (
          <section key={hall.id} id={`hall-${hall.id}`} className="scroll-mt-4">
            {/* Hall section label */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">{hall.name}</h2>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-sm text-zinc-500">
                  <Users className="h-3.5 w-3.5" />
                  {hall.capacity.toLocaleString()} guests
                </span>
                <span className="flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/40">
                  <IndianRupee className="h-3 w-3" />
                  {(hall.pricePerSlot / 100).toLocaleString("en-IN")}
                  <span className="text-xs font-normal text-zinc-500 ml-0.5">/slot</span>
                </span>
              </div>
            </div>

            {/* Two-column: sticky calendar left, content right */}
            <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">

              {/* LEFT: Calendar (sticky on large screens) */}
              <div className="lg:sticky lg:top-4">
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                  <div className="px-4 pt-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Select a date to book</p>
                  </div>
                  <div className="p-3">
                    <SlotCalendar
                      venueId={venueId}
                      halls={[{ ...hall, slots: hall.slots }]}
                      initialMonth={initialMonth}
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT: Hall details */}
              <div className="space-y-5">

                {/* About — only shown when description exists */}
                {hall.description && (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-5">
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">About</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{hall.description}</p>
                  </div>
                )}

                {/* Included facilities */}
                {includedFacilities.length > 0 && (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Included with booking</h3>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">Free</span>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-2">
                      {includedFacilities.map((f) => (
                        <div key={f.id} className="flex flex-col items-center gap-2 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-3 text-center">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center">
                            <span
                              className="material-symbols-rounded leading-none text-amber-600 dark:text-amber-400"
                              style={{ fontSize: 18, fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
                            >{f.icon}</span>
                          </div>
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 leading-tight">{f.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Paid add-ons */}
                {addonFacilities.length > 0 && (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Available add-ons</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Optional extras you can request when booking</p>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-2">
                      {addonFacilities.map((f) => (
                        <div key={f.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                            <span
                              className="material-symbols-rounded leading-none text-amber-600 dark:text-amber-400"
                              style={{ fontSize: 16, fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
                            >{f.icon}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100 truncate">{f.name}</p>
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">₹{(f.amountPaise / 100).toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


              </div>
            </div>
          </section>
        ))}

        {/* Location section */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Location</h2>
                <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-amber-500" />
                  {venue.address}
                </p>
              </div>
              {/* Navigation action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <MapPin className="h-3 w-3" />
                  Get Directions
                </a>
                <a
                  href={venue.googleMapsUrl ?? openInMapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-3 py-1.5 rounded-lg transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/50"
                >
                  Open in Google Maps
                </a>
                <a
                  href={openStreetMapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2 py-1.5 rounded-lg transition-colors"
                >
                  OpenStreetMap ↗
                </a>
              </div>
            </div>
          </div>
          {/* Embedded map */}
          <div className="relative h-72 sm:h-96">
            <iframe
              src={mapSrc}
              className="w-full h-full border-0"
              loading="lazy"
              title={`Map showing location of ${venue.name}`}
            />
          </div>
        </section>

      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type HallPhoto = { id: string; url: string; caption: string | null };
type Hall = {
  id: string;
  name: string;
  capacity: number;
  pricePerSlot: number;
  minimumAdvancePaise: number;
  requireFullPayment: boolean;
  amenities: string[];
  description?: string | null;
  photos: HallPhoto[];
  slots: SlotData[];
};
type SlotData = {
  id: string;
  date: string;
  status: "AVAILABLE" | "HELD" | "BOOKED";
  template: { name: string; startTime: string; endTime: string };
  priceOverride: number | null;
};

