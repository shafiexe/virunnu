import Link from "next/link";
import { MapPin, Users, IndianRupee, Navigation } from "lucide-react";

type Hall = {
  id: string;
  name: string;
  capacity: number;
  pricePerSlot: number;
  amenities: string[];
  photos: { url: string }[];
};
type Venue = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  halls: Hall[];
  category?: string;
};

const GRAD_COLORS = [
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-teal-400 to-emerald-500",
  "from-sky-400 to-blue-500",
];

function gradientFor(id: string) {
  const idx = id.charCodeAt(0) % GRAD_COLORS.length;
  return GRAD_COLORS[idx];
}

export function VenueCard({ venue, distanceKm }: { venue: Venue; distanceKm?: number }) {
  const minPrice = venue.halls.length ? Math.min(...venue.halls.map((h) => h.pricePerSlot)) : 0;
  const maxCapacity = venue.halls.length ? Math.max(...venue.halls.map((h) => h.capacity)) : 0;
  const grad = gradientFor(venue.id);

  // First available photo from any hall
  const coverPhoto = venue.halls.flatMap((h) => h.photos).find((p) => p?.url)?.url ?? null;

  const categoryLabel = venue.category ?? inferCategory(venue.name);

  return (
    <Link
      href={`/venues/${venue.id}`}
      className="group block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 hover:border-amber-200 dark:hover:border-amber-800/50 transition-all duration-200"
    >
      {/* Cover */}
      <div className={`h-44 relative overflow-hidden ${!coverPhoto ? `bg-gradient-to-br ${grad}` : ""}`}>
        {coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPhoto}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <svg viewBox="0 0 80 60" className="w-24 fill-white">
                <rect x="5" y="20" width="70" height="35" rx="2" />
                <rect x="15" y="10" width="50" height="15" rx="1" />
                <rect x="30" y="5" width="20" height="10" rx="1" />
                <rect x="20" y="38" width="12" height="17" />
                <rect x="48" y="38" width="12" height="17" />
              </svg>
            </div>
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="text-white text-[10px] font-semibold bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            {categoryLabel}
          </span>
          {distanceKm !== undefined && (
            <span className="text-white text-[10px] font-semibold bg-emerald-600/80 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
              <Navigation className="h-2.5 w-2.5" />
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <span className="text-white text-[10px] font-semibold bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
            <Users className="h-3 w-3" />
            {maxCapacity.toLocaleString()}
          </span>
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-bold text-white text-base drop-shadow leading-snug">{venue.name}</h3>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <MapPin className="h-3 w-3 shrink-0" />
          {venue.address}
        </div>

        {minPrice > 0 && (
          <div className="flex items-baseline gap-0.5">
            <span className="text-[10px] text-zinc-400">from</span>
            <IndianRupee className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
              {(minPrice / 100).toLocaleString("en-IN")}
            </span>
          </div>
        )}

        <div className="pt-0.5 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-semibold text-amber-600 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
            Check availability →
          </span>
        </div>
      </div>
    </Link>
  );
}

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("auditorium")) return "Auditorium";
  if (n.includes("banquet")) return "Banquet Hall";
  if (n.includes("wedding") || n.includes("kalyana") || n.includes("marriage")) return "Wedding Hall";
  if (n.includes("convention") || n.includes("conference")) return "Convention Center";
  return "Convention Hall";
}
