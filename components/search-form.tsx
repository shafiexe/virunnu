"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, MapPin, Users, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { AISearchBar } from "@/components/ai-search-bar";
import { useTranslations } from "next-intl";

type Props = { defaults?: { city?: string; guests?: string; date?: string; type?: string } };


export function SearchForm({ defaults }: Props) {
  const router = useRouter();
  const t = useTranslations("search");
  const [city, setCity] = useState(defaults?.city ?? "");
  const [guests, setGuests] = useState(defaults?.guests ?? "");
  const [date, setDate] = useState(defaults?.date ?? "");
  const [type, setType] = useState(defaults?.type ?? ""); // set by AI parse only
  const [showManual, setShowManual] = useState(
    !!(defaults?.city || defaults?.guests || defaults?.date || defaults?.type)
  );

  function buildParams(overrides: Record<string, string> = {}) {
    const p: Record<string, string> = {};
    if (city) p.city = city;
    if (guests) p.guests = guests;
    if (date) p.date = date;
    if (type) p.type = type;
    return new URLSearchParams({ ...p, ...overrides }).toString();
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/?${buildParams()}`);
  }

  function handleAIParsed(result: {
    intent?: string;
    city?: string | null;
    guests?: number | null;
    date?: string | null;
    type?: string | null;
    nearby?: boolean;
    radiusKm?: number | null;
    userLat?: number;
    userLng?: number;
    cuisine?: string | null;
  }) {
    const p: Record<string, string> = {};

    if (result.intent === "catering") {
      // Route to catering section
      if (result.city) p.catCity = result.city;
      if (result.cuisine) p.catCuisine = result.cuisine;
      router.push(`/?${new URLSearchParams(p).toString()}#catering`);
      return;
    }

    // Venue intent
    if (result.city) { setCity(result.city); setShowManual(true); }
    if (result.guests) { setGuests(String(result.guests)); setShowManual(true); }
    if (result.date) { setDate(result.date); setShowManual(true); }
    if (result.type) setType(result.type);

    if (result.city) p.city = result.city;
    if (result.guests) p.guests = String(result.guests);
    if (result.date) p.date = result.date;
    if (result.type) p.type = result.type;
    if (result.nearby && result.userLat !== undefined && result.userLng !== undefined) {
      p.lat = String(result.userLat);
      p.lng = String(result.userLng);
      p.radiusKm = String(result.radiusKm ?? 10);
    }
    if (Object.keys(p).length > 0) router.push(`/?${new URLSearchParams(p).toString()}`);
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition";

  return (
    <div className="space-y-4">
      {/* AI bar */}
      <AISearchBar onParsed={handleAIParsed} />

      {/* Manual filters toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          {showManual ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showManual ? t("filterHide") : t("filterShow")}
        </button>

        {showManual && (
          <form onSubmit={search} className="mt-3 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Free-text location */}
              <div className="flex-1 space-y-1">
                <label htmlFor="city" className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <MapPin className="h-3 w-3" /> Location
                </label>
                <input
                  id="city"
                  type="text"
                  placeholder="City or area, e.g. Kochi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="flex-1 space-y-1">
                <label htmlFor="date" className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <CalendarDays className="h-3 w-3" /> Event date
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className={inputCls}
                />
              </div>

              <div className="flex-1 space-y-1">
                <label htmlFor="guests" className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <Users className="h-3 w-3" /> Guests
                </label>
                <input
                  id="guests"
                  type="number"
                  placeholder="e.g. 300"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  min={1}
                  className={inputCls}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 w-full sm:w-auto rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
