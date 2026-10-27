"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

type Props = { defaults?: { city?: string; guests?: string; date?: string; type?: string } };

const KERALA_CITIES = [
  "Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam",
  "Kannur", "Palakkad", "Alappuzha", "Malappuram", "Kottayam",
  "Pathanamthitta", "Wayanad", "Idukki", "Kasaragod",
];

export const VENUE_TYPES = [
  { label: "All Spaces", value: "" },
  { label: "Convention Center", value: "convention" },
  { label: "Auditorium", value: "auditorium" },
  { label: "Banquet Hall", value: "banquet" },
  { label: "Wedding Hall", value: "wedding" },
];

export function SearchForm({ defaults }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(defaults?.city ?? "");
  const [guests, setGuests] = useState(defaults?.guests ?? "");
  const [date, setDate] = useState(defaults?.date ?? "");
  const [type, setType] = useState(defaults?.type ?? "");

  function search(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (guests) params.set("guests", guests);
    if (date) params.set("date", date);
    if (type) params.set("type", type);
    router.push(`/?${params}`);
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition";

  return (
    <form onSubmit={search} className="space-y-4">
      {/* Type chips */}
      <div className="flex flex-wrap gap-2">
        {VENUE_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              type === t.value
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-amber-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Fields row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 space-y-1.5">
          <label htmlFor="city" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            City
          </label>
          <select
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputCls}
          >
            <option value="">All Kerala</option>
            {KERALA_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 space-y-1.5">
          <label htmlFor="date" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Event date
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
        <div className="flex-1 space-y-1.5">
          <label htmlFor="guests" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Guests
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
  );
}
