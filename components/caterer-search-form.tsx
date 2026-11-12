"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, MapPin, CalendarDays, Users, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";

type Props = { defaults?: { catCity?: string; catCuisine?: string; catGuests?: string; catDate?: string; catMeal?: string } };

const MEALS = [
  { label: "Any meal", value: "" },
  { label: "Breakfast", value: "BREAKFAST" },
  { label: "Lunch", value: "LUNCH" },
  { label: "Dinner", value: "DINNER" },
  { label: "Snacks & tea", value: "SNACKS" },
];

const CUISINE_CHIPS = [
  { label: "All", value: "" },
  { label: "Kerala Sadya", value: "sadya" },
  { label: "Wedding", value: "wedding" },
  { label: "Multi-Cuisine", value: "multi-cuisine" },
  { label: "Veg", value: "veg" },
  { label: "Non-Veg", value: "non-veg" },
];

const inputCls =
  "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition";

export function CatererSearchForm({ defaults }: Props) {
  const router = useRouter();
  const [place, setPlace] = useState(defaults?.catCity ?? "");
  const [date, setDate] = useState(defaults?.catDate ?? "");
  const [guests, setGuests] = useState(defaults?.catGuests ?? "");
  const [meal, setMeal] = useState(defaults?.catMeal ?? "");
  const [cuisine, setCuisine] = useState(defaults?.catCuisine ?? "");
  // Collapsed until asked for, but open when the page was reached with filters applied
  const [open, setOpen] = useState(!!(defaults?.catCity || defaults?.catDate || defaults?.catGuests || defaults?.catMeal || defaults?.catCuisine));
  const activeCount = [place.trim(), date, guests, meal, cuisine].filter(Boolean).length;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  function search(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (place.trim()) p.set("catCity", place.trim());
    if (date) p.set("catDate", date);
    if (guests) p.set("catGuests", guests);
    if (meal) p.set("catMeal", meal);
    if (cuisine) p.set("catCuisine", cuisine);
    router.push(`/?${p.toString()}#catering`);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {open ? "Hide filters" : "Filter by place, date, guests or meal"}
        {!open && activeCount > 0 && (
          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{activeCount}</span>
        )}
        {open ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
      </button>

      {open && (
    <form onSubmit={search} className="space-y-3 mt-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="col-span-2 lg:col-span-1 space-y-1">
          <span className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400"><MapPin className="h-3 w-3" /> Where is the event?</span>
          <input type="text" placeholder="Town or area, e.g. Munnar" value={place} onChange={(e) => setPlace(e.target.value)} className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400"><CalendarDays className="h-3 w-3" /> Date</span>
          <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400"><Users className="h-3 w-3" /> Guests</span>
          <input type="number" min={1} inputMode="numeric" placeholder="e.g. 40" value={guests} onChange={(e) => setGuests(e.target.value)} className={inputCls} />
        </label>
        <label className="col-span-2 lg:col-span-1 space-y-1">
          <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Meal</span>
          <select value={meal} onChange={(e) => setMeal(e.target.value)} className={inputCls}>
            {MEALS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
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
        <button
          type="submit"
          className="ml-auto flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          <Search className="h-4 w-4" />
          Find caterers
        </button>
      </div>
    </form>
      )}
    </div>
  );
}
