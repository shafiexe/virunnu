"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, MapPin, ChevronDown, ChevronUp } from "lucide-react";

type Props = { defaults?: { catCity?: string; catCuisine?: string } };

const CUISINE_CHIPS = [
  { label: "All", value: "" },
  { label: "Kerala Sadya", value: "sadya" },
  { label: "Wedding", value: "wedding" },
  { label: "Multi-Cuisine", value: "multi-cuisine" },
  { label: "Veg", value: "veg" },
  { label: "Non-Veg", value: "non-veg" },
];

export function CatererSearchForm({ defaults }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(defaults?.catCity ?? "");
  const [cuisine, setCuisine] = useState(defaults?.catCuisine ?? "");
  const [showManual, setShowManual] = useState(!!(defaults?.catCity || defaults?.catCuisine));

  function search(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (city) p.set("catCity", city);
    if (cuisine) p.set("catCuisine", cuisine);
    router.push(`/?${p.toString()}#catering`);
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
      >
        {showManual ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {showManual ? "Hide filters" : "Filter by location or cuisine"}
      </button>

      {showManual && (
        <form onSubmit={search} className="mt-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <label htmlFor="cat-city" className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <MapPin className="h-3 w-3" /> Location
              </label>
              <input
                id="cat-city"
                type="text"
                placeholder="City or area, e.g. Thrissur"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="flex-1 space-y-1">
              <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Cuisine</span>
              <div className="flex flex-wrap gap-1.5">
                {CUISINE_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setCuisine(chip.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      cuisine === chip.value
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-orange-300"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="flex items-center gap-2 w-full sm:w-auto rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
