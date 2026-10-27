import { Phone, MapPin, UtensilsCrossed } from "lucide-react";

type Caterer = {
  id: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  description: string | null;
  cuisines: string[];
};

export function CatererCard({ caterer }: { caterer: Caterer }) {
  const waLink = `https://wa.me/${caterer.phone.replace(/\D/g, "")}`;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Card header with icon */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-bold text-zinc-900 dark:text-zinc-50">{caterer.name}</div>
            <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
              <MapPin className="h-3 w-3" />
              {caterer.city}, {caterer.state}
            </div>
          </div>
          <div className="flex-shrink-0 rounded-xl bg-orange-100 dark:bg-orange-950/40 p-2.5">
            <UtensilsCrossed className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {caterer.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{caterer.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {caterer.cuisines.map((c) => (
            <span key={c} className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-medium">
              {c}
            </span>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <a
            href={`tel:${caterer.phone}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition-colors"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
