"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatererDetailsValue } from "@/lib/caterer-details-value";

const INPUT =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300";
const MEALS: [string, string][] = [["BREAKFAST", "Breakfast"], ["LUNCH", "Lunch"], ["DINNER", "Dinner"], ["SNACKS", "Snacks & Tea"]];
const NOTICE: [string, string][] = [
  ["6", "Same day"], ["24", "1 day before"], ["48", "2 days before"], ["72", "3 days before"], ["168", "1 week before"],
];

const str = (v: string | number | null) => (v === null || v === undefined ? "" : String(v));
const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

export function CatererDetailsCard({ initial, adminCatererId }: { initial: CatererDetailsValue; adminCatererId?: string }) {
  const [f, setF] = useState({
    address: str(initial.address), pincode: str(initial.pincode), googleMapsUrl: str(initial.googleMapsUrl),
    googleRating: str(initial.googleRating), googleReviewCount: str(initial.googleReviewCount),
    serviceRadiusKm: str(initial.serviceRadiusKm), minGuests: str(initial.minGuests), maxGuests: str(initial.maxGuests),
    leadTimeHours: str(initial.leadTimeHours), fssaiNumber: str(initial.fssaiNumber),
    teamSize: str(initial.teamSize), yearsExperience: str(initial.yearsExperience),
    linkedinUrl: str(initial.linkedinUrl), twitterUrl: str(initial.twitterUrl),
  });
  const [areas, setAreas] = useState(initial.serviceAreas);
  const [areaText, setAreaText] = useState("");
  const [meals, setMeals] = useState(initial.mealTypes);
  const [past, setPast] = useState(initial.pastEvents.map((p) => ({ title: p.title, type: p.type ?? "", guests: str(p.guests ?? null), note: p.note ?? "" })));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  function addArea() {
    const t = areaText.trim();
    if (t && t.length <= 60 && !areas.some((a) => a.toLowerCase() === t.toLowerCase())) setAreas([...areas, t]);
    setAreaText("");
  }

  async function save() {
    if (saving) return;
    setError("");
    const min = num(f.minGuests), max = num(f.maxGuests);
    if (min && max && min > max) { setError("Minimum guests can't be more than maximum guests"); return; }
    setSaving(true);
    try {
      const res = await fetch(adminCatererId ? `/api/admin/caterers/${adminCatererId}` : "/api/caterer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: f.address, pincode: f.pincode, googleMapsUrl: f.googleMapsUrl,
          googleRating: num(f.googleRating), googleReviewCount: num(f.googleReviewCount),
          serviceAreas: areas, serviceRadiusKm: num(f.serviceRadiusKm),
          minGuests: min, maxGuests: max, leadTimeHours: num(f.leadTimeHours),
          mealTypes: meals, fssaiNumber: f.fssaiNumber, teamSize: num(f.teamSize), yearsExperience: num(f.yearsExperience),
          linkedinUrl: f.linkedinUrl, twitterUrl: f.twitterUrl,
          pastEvents: past
            .filter((p) => p.title.trim())
            .map((p) => ({ title: p.title.trim(), ...(p.type.trim() && { type: p.type.trim() }), ...(num(p.guests) && { guests: num(p.guests) }), ...(p.note.trim() && { note: p.note.trim() }) })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-5">
      <div>
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Where you serve &amp; how you work</h2>
        <p className="text-xs text-zinc-500 mt-0.5">This is what travellers search on — keep it current.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Address"><input className={INPUT} value={f.address} onChange={set("address")} /></Field>
        <Field label="Pincode"><input className={INPUT} value={f.pincode} onChange={set("pincode")} inputMode="numeric" /></Field>
        <div className="sm:col-span-2">
          <Field label="Google Maps link"><input className={INPUT} value={f.googleMapsUrl} onChange={set("googleMapsUrl")} placeholder="https://maps.app.goo.gl/…" /></Field>
        </div>
        <Field label="Google rating (0–5)"><input className={INPUT} value={f.googleRating} onChange={set("googleRating")} inputMode="decimal" /></Field>
        <Field label="Number of reviews"><input className={INPUT} value={f.googleReviewCount} onChange={set("googleReviewCount")} inputMode="numeric" /></Field>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-zinc-500">Towns / areas you serve</span>
        {areas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-zinc-900">
                {a}
                <button type="button" onClick={() => setAreas(areas.filter((x) => x !== a))} aria-label={`Remove ${a}`}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className={cn(INPUT, "max-w-xs")} value={areaText} placeholder="e.g. Munnar"
            onChange={(e) => setAreaText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArea(); } }}
          />
          <button type="button" onClick={addArea} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600">Add</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Travels up to (km)"><input className={INPUT} value={f.serviceRadiusKm} onChange={set("serviceRadiusKm")} inputMode="numeric" /></Field>
        <Field label="Min guests"><input className={INPUT} value={f.minGuests} onChange={set("minGuests")} inputMode="numeric" /></Field>
        <Field label="Max guests"><input className={INPUT} value={f.maxGuests} onChange={set("maxGuests")} inputMode="numeric" /></Field>
        <Field label="Notice needed">
          <select className={INPUT} value={f.leadTimeHours} onChange={set("leadTimeHours")}>
            <option value="">Not set</option>
            {NOTICE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            {f.leadTimeHours && !NOTICE.some(([v]) => v === f.leadTimeHours) && <option value={f.leadTimeHours}>{f.leadTimeHours} hours</option>}
          </select>
        </Field>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-zinc-500">Meals you serve</span>
        <div className="flex flex-wrap gap-2">
          {MEALS.map(([k, l]) => (
            <button
              key={k} type="button"
              onClick={() => setMeals(meals.includes(k) ? meals.filter((m) => m !== k) : [...meals, k])}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                meals.includes(k) ? "bg-amber-500 text-zinc-900 border-amber-500" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}
            >{l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Team size"><input className={INPUT} value={f.teamSize} onChange={set("teamSize")} inputMode="numeric" /></Field>
        <Field label="Years of experience"><input className={INPUT} value={f.yearsExperience} onChange={set("yearsExperience")} inputMode="numeric" /></Field>
        <Field label="FSSAI number"><input className={INPUT} value={f.fssaiNumber} onChange={set("fssaiNumber")} /></Field>
        <Field label="LinkedIn"><input className={INPUT} value={f.linkedinUrl} onChange={set("linkedinUrl")} placeholder="https://linkedin.com/…" /></Field>
        <Field label="Twitter / X"><input className={INPUT} value={f.twitterUrl} onChange={set("twitterUrl")} placeholder="https://x.com/…" /></Field>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-zinc-500">Work we&apos;ve done</span>
        {past.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
            <input className={INPUT} value={p.title} placeholder="Event, e.g. Wedding at Kumarakom" onChange={(e) => setPast(past.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <input className={INPUT} value={p.type} placeholder="Type" onChange={(e) => setPast(past.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))} />
            <input className={INPUT} value={p.guests} placeholder="Guests" inputMode="numeric" onChange={(e) => setPast(past.map((x, j) => (j === i ? { ...x, guests: e.target.value } : x)))} />
            <button type="button" onClick={() => setPast(past.filter((_, j) => j !== i))} aria-label="Remove" className="text-zinc-500 dark:text-zinc-400 hover:text-red-500"><X className="h-4 w-4" /></button>
          </div>
        ))}
        {past.length < 10 && (
          <button type="button" onClick={() => setPast([...past, { title: "", type: "", guests: "", note: "" }])} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-500 hover:underline">
            <Plus className="h-3.5 w-3.5" /> Add event
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button" onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {saved ? <><Check className="h-4 w-4" /> Saved!</> : saving ? "Saving…" : "Save details"}
        </button>
      </div>
    </div>
  );
}
