"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const AMENITIES = ["AC", "Projector", "Stage", "Parking", "Catering Kitchen", "Sound System", "Generator Backup", "Dressing Room", "CCTV"];

// Parse lat/lng from a Google Maps URL (place or directions)
function parseGoogleMapsCoords(url: string): { lat: number; lng: number } | null {
  try {
    // Place URL: !3d(lat)!4d(lng) in data section
    const m3d = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (m3d) return { lat: parseFloat(m3d[1]), lng: parseFloat(m3d[2]) };

    // Directions URL destination: !1d(lng)!2d(lat)
    if (url.includes("/maps/dir/")) {
      const m1d = url.match(/!1d(-?\d+\.?\d*)!2d(-?\d+\.?\d*)/);
      if (m1d) return { lat: parseFloat(m1d[2]), lng: parseFloat(m1d[1]) };
    }

    // Fallback: /@lat,lng,zoom in URL path
    const mat = url.match(/\/@(-?\d+\.?\d*),(-?\d+\.?\d*),\d+[zm]/);
    if (mat) return { lat: parseFloat(mat[1]), lng: parseFloat(mat[2]) };
  } catch {
    // ignore parse errors
  }
  return null;
}

type Step1 = {
  venueName: string;
  address: string;
  googleMapsUrl: string;
  lat: string;
  lng: string;
  googleRating: string;
  googleReviewCount: string;
  googleReviewUrl: string;
  websiteUrl: string;
};

type Step2 = {
  hallName: string;
  capacity: string;
  priceRupees: string;
  amenities: string[];
  morningStart: string;
  morningEnd: string;
  hasEvening: boolean;
  eveningStart: string;
  eveningEnd: string;
  minimumAdvanceRupees: string;
  requireFullPayment: boolean;
};

const defaultStep1: Step1 = {
  venueName: "", address: "",
  googleMapsUrl: "", lat: "", lng: "",
  googleRating: "", googleReviewCount: "", googleReviewUrl: "", websiteUrl: "",
};

const defaultStep2: Step2 = {
  hallName: "", capacity: "", priceRupees: "",
  amenities: [],
  morningStart: "09:00", morningEnd: "13:00",
  hasEvening: true,
  eveningStart: "16:00", eveningEnd: "21:00",
  minimumAdvanceRupees: "500",
  requireFullPayment: false,
};

export function OwnerOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [s1, setS1] = useState<Step1>(defaultStep1);
  const [s2, setS2] = useState<Step2>(defaultStep2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualGeo, setManualGeo] = useState(false);

  function handleMapsUrl(url: string) {
    const coords = parseGoogleMapsCoords(url);
    setS1((prev) => ({
      ...prev,
      googleMapsUrl: url,
      lat: coords ? coords.lat.toFixed(6) : prev.lat,
      lng: coords ? coords.lng.toFixed(6) : prev.lng,
    }));
  }

  function toggleAmenity(a: string) {
    setS2((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));
  }

  function step1Valid() {
    return s1.venueName.trim().length >= 2 && s1.address.trim().length >= 3;
  }

  function step2Valid() {
    return parseInt(s2.capacity) > 0 && parseInt(s2.priceRupees) > 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!step2Valid()) return;
    setError("");
    setLoading(true);

    const slots = [{ name: "Morning", startTime: s2.morningStart, endTime: s2.morningEnd }];
    if (s2.hasEvening) slots.push({ name: "Evening", startTime: s2.eveningStart, endTime: s2.eveningEnd });

    const body: Record<string, unknown> = {
      orgName: s1.venueName.trim(),
      venueName: s1.venueName.trim(),
      address: s1.address.trim(),
      lat: s1.lat ? parseFloat(s1.lat) : 0,
      lng: s1.lng ? parseFloat(s1.lng) : 0,
      hallName: s2.hallName.trim(),
      capacity: parseInt(s2.capacity),
      priceRupees: parseInt(s2.priceRupees),
      minimumAdvancePaise: Math.round(parseFloat(s2.minimumAdvanceRupees || "500") * 100),
      requireFullPayment: s2.requireFullPayment,
      amenities: s2.amenities,
      slots,
    };
    if (s1.googleMapsUrl.trim()) body.googleMapsUrl = s1.googleMapsUrl.trim();
    if (s1.googleRating.trim()) body.googleRating = parseFloat(s1.googleRating);
    if (s1.googleReviewCount.trim()) body.googleReviewCount = parseInt(s1.googleReviewCount);
    if (s1.googleReviewUrl.trim()) body.googleReviewUrl = s1.googleReviewUrl.trim();
    if (s1.websiteUrl.trim()) body.websiteUrl = s1.websiteUrl.trim();

    const res = await fetch("/api/owner/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (!res.ok) {
      setError("Something went wrong. Please check your inputs and try again.");
      return;
    }

    router.push("/owner/dashboard");
    router.refresh();
  }

  const hasPin = !!(s1.lat && s1.lng && parseFloat(s1.lat) !== 0 && parseFloat(s1.lng) !== 0);
  const urlParsedOk = !!(s1.googleMapsUrl && parseGoogleMapsCoords(s1.googleMapsUrl));

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 sm:p-8">
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[
          { n: 1, label: "Venue details" },
          { n: 2, label: "Slots & amenities" },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              n === step
                ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                : n < step
                ? "bg-emerald-500 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
            }`}>
              {n < step ? "✓" : n}
            </div>
            <span className={`text-sm ${n === step ? "text-zinc-900 dark:text-zinc-50 font-medium" : "text-zinc-400"}`}>
              {label}
            </span>
            {n < 2 && <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-700" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-1">
            <Label htmlFor="venueName">Convention center name</Label>
            <Input id="venueName" placeholder="e.g. ZAWAJ Convention Centre" value={s1.venueName}
              onChange={(e) => setS1({ ...s1, venueName: e.target.value })} />
          </div>

          {/* Google Maps URL — primary location method */}
          <div className="space-y-2">
            <Label htmlFor="googleMapsUrl">
              Google Maps link
              <span className="ml-1.5 text-zinc-400 font-normal text-xs">— paste to auto-locate on map</span>
            </Label>
            <div className="relative">
              <Input
                id="googleMapsUrl"
                placeholder="https://www.google.com/maps/place/..."
                value={s1.googleMapsUrl}
                onChange={(e) => handleMapsUrl(e.target.value)}
                className={urlParsedOk ? "pr-36 border-emerald-400 dark:border-emerald-500" : ""}
              />
              {s1.googleMapsUrl && (
                <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none ${
                  urlParsedOk ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
                }`}>
                  {urlParsedOk
                    ? `📍 ${parseFloat(s1.lat).toFixed(4)}, ${parseFloat(s1.lng).toFixed(4)}`
                    : "URL not recognised"}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Search your venue on Google Maps → copy URL from address bar → paste here.
              Lat &amp; lng will be auto-detected.
            </p>
          </div>

          {/* Map preview */}
          {hasPin && (
            <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
              <iframe
                key={`${s1.lat},${s1.lng}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(s1.lng)-0.008},${parseFloat(s1.lat)-0.008},${parseFloat(s1.lng)+0.008},${parseFloat(s1.lat)+0.008}&layer=mapnik&marker=${s1.lat},${s1.lng}`}
                className="w-full h-44 border-0"
                loading="lazy"
                title="Location preview"
              />
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ {parseFloat(s1.lat).toFixed(5)}, {parseFloat(s1.lng).toFixed(5)}
                </span>
                <button type="button"
                  onClick={() => { setS1((p) => ({ ...p, lat: "", lng: "" })); setManualGeo(false); }}
                  className="text-xs text-zinc-400 hover:text-red-500 transition-colors">
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Manual lat/lng fallback */}
          {!hasPin && (
            <div className="space-y-2">
              <button type="button" onClick={() => setManualGeo((v) => !v)}
                className="text-xs text-zinc-400 underline hover:text-zinc-600">
                {manualGeo ? "Hide manual entry" : "Enter coordinates manually instead"}
              </button>
              {manualGeo && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="lat">Latitude</Label>
                    <Input id="lat" type="number" step="any" placeholder="11.1452"
                      value={s1.lat} onChange={(e) => setS1({ ...s1, lat: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lng">Longitude</Label>
                    <Input id="lng" type="number" step="any" placeholder="75.9622"
                      value={s1.lng} onChange={(e) => setS1({ ...s1, lng: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Address — copy from Google Maps page */}
          <div className="space-y-1">
            <Label htmlFor="address">
              Address
              <span className="ml-1.5 text-zinc-400 font-normal text-xs">— copy from Google Maps page</span>
            </Label>
            <Input id="address" placeholder="4XW6+3WR, Kodimaram Rd, Kondotty, Kerala 673638" value={s1.address}
              onChange={(e) => setS1({ ...s1, address: e.target.value })} />
          </div>

          {/* Google reviews + website */}
          <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Google info (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="googleRating" className="text-xs">Rating (e.g. 4.1)</Label>
                <Input id="googleRating" type="number" step="0.1" min="0" max="5" placeholder="4.1"
                  value={s1.googleRating} onChange={(e) => setS1({ ...s1, googleRating: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="googleReviewCount" className="text-xs">No. of reviews</Label>
                <Input id="googleReviewCount" type="number" min="0" placeholder="16"
                  value={s1.googleReviewCount} onChange={(e) => setS1({ ...s1, googleReviewCount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="googleReviewUrl" className="text-xs">
                Google review link
                <span className="ml-1 font-normal text-zinc-400">— link that opens "Write a review"</span>
              </Label>
              <Input id="googleReviewUrl" type="url" placeholder="https://search.google.com/local/writereview?placeid=..."
                value={s1.googleReviewUrl} onChange={(e) => setS1({ ...s1, googleReviewUrl: e.target.value })} />
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Google Maps → your venue → click &quot;Write a review&quot; → copy URL from browser
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="websiteUrl" className="text-xs">Website</Label>
              <Input id="websiteUrl" type="url" placeholder="https://zawajconvention.com"
                value={s1.websiteUrl} onChange={(e) => setS1({ ...s1, websiteUrl: e.target.value })} />
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!step1Valid()}
            onClick={() => {
              setS2((prev) => ({ ...prev, hallName: s1.venueName.trim() }));
              setStep(2);
            }}
          >
            Next — Slots &amp; amenities
          </Button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="capacity">Seating capacity</Label>
              <Input id="capacity" type="number" min="1" placeholder="200"
                value={s2.capacity} onChange={(e) => setS2({ ...s2, capacity: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="price">Price per slot (₹)</Label>
              <Input id="price" type="number" min="1" placeholder="5000"
                value={s2.priceRupees} onChange={(e) => setS2({ ...s2, priceRupees: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="minAdvance">Minimum advance amount (₹)</Label>
              <Input id="minAdvance" type="number" min="0" placeholder="500"
                value={s2.minimumAdvanceRupees}
                onChange={(e) => setS2({ ...s2, minimumAdvanceRupees: e.target.value })} />
              <p className="text-xs text-zinc-400">Minimum amount customer must pay online to confirm booking</p>
            </div>
            <div className="flex flex-col justify-center space-y-2 pt-1">
              <Label>Payment requirement</Label>
              <button
                type="button"
                onClick={() => setS2({ ...s2, requireFullPayment: !s2.requireFullPayment })}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                  s2.requireFullPayment
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                }`}
              >
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  s2.requireFullPayment ? "border-amber-500 bg-amber-500" : "border-zinc-300"
                }`}>
                  {s2.requireFullPayment && <span className="w-2 h-2 bg-white rounded-full" />}
                </span>
                <span className="text-sm">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {s2.requireFullPayment ? "Full payment required" : "Advance payment only"}
                  </span>
                  <span className="block text-xs text-zinc-500 mt-0.5">
                    {s2.requireFullPayment
                      ? "Customer must pay the full slot amount online"
                      : "Customer pays advance online; rest in cash"}
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    s2.amenities.includes(a)
                      ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-50"
                      : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Slot times</Label>

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">☀ Morning slot</div>
              <div className="flex items-center gap-3">
                <input type="time" value={s2.morningStart}
                  onChange={(e) => setS2({ ...s2, morningStart: e.target.value })}
                  className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm" />
                <span className="text-zinc-400 text-sm">to</span>
                <input type="time" value={s2.morningEnd}
                  onChange={(e) => setS2({ ...s2, morningEnd: e.target.value })}
                  className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">🌙 Evening slot</div>
                <label className="flex items-center gap-2 text-sm text-zinc-500 cursor-pointer">
                  <input type="checkbox" checked={s2.hasEvening}
                    onChange={(e) => setS2({ ...s2, hasEvening: e.target.checked })}
                    className="rounded" />
                  Enable
                </label>
              </div>
              {s2.hasEvening && (
                <div className="flex items-center gap-3">
                  <input type="time" value={s2.eveningStart}
                    onChange={(e) => setS2({ ...s2, eveningStart: e.target.value })}
                    className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm" />
                  <span className="text-zinc-400 text-sm">to</span>
                  <input type="time" value={s2.eveningEnd}
                    onChange={(e) => setS2({ ...s2, eveningEnd: e.target.value })}
                    className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm" />
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !step2Valid()}>
              {loading ? "Setting up…" : "Add my venue →"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
