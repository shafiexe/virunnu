"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ChevronDown, ChevronUp, CheckCircle2, Building2, Users, Zap, IndianRupee, RotateCcw, ImageIcon } from "lucide-react";
import { VENUE_TYPE_OPTIONS, type VenueTypeKey } from "@/lib/venue-types";

type Hall = { name: string; capacitySeated?: number | null; capacityStanding?: number | null; priceRupees?: number | null };

type ExtractedData = {
  name?: string | null;
  phone?: string | null;
  whatsappPhone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  googleMapsUrl?: string | null;
  venueType?: string | null;
  amenities?: string[];
  halls?: Hall[];
  photos?: string[];
};

export function AdminAiSetup({ orgId, hasVenue }: { orgId: string; hasVenue: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  // Input
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");

  // Preview
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [venueType, setVenueType] = useState<VenueTypeKey>("CONVENTION_CENTER");
  const [hallPrices, setHallPrices] = useState<Record<number, string>>({});
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  // Apply
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applied, setApplied] = useState(false);

  async function handleExtract() {
    if (!url.trim() && !text.trim()) { setExtractError("Enter a URL or paste some text"); return; }
    setExtracting(true);
    setExtractError("");
    setExtracted(null);
    try {
      const res = await fetch("/api/owner/ai-prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), rawText: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setExtractError(data.error ?? "Failed to extract"); return; }
      const e: ExtractedData = data.extracted ?? {};
      setExtracted(e);

      // Default prices from AI (if any)
      const prices: Record<number, string> = {};
      (e.halls ?? []).forEach((h, i) => { prices[i] = h.priceRupees ? String(h.priceRupees) : ""; });
      setHallPrices(prices);
      setSelectedAmenities(new Set(e.amenities ?? []));
      setSelectedPhotos(new Set(e.photos ?? []));

      if (e.venueType) {
        const vt = e.venueType.toUpperCase().replace(/\s+/g, "_") as VenueTypeKey;
        if (VENUE_TYPE_OPTIONS.some(o => o.key === vt)) setVenueType(vt);
      }
    } catch {
      setExtractError("Something went wrong. Try again.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleApply() {
    if (!extracted) return;
    setApplying(true);
    setApplyError("");
    try {
      const phone = (extracted.phone ?? "").replace(/^\+91/, "").replace(/\D/g, "");
      const wp = (extracted.whatsappPhone ?? "").replace(/^\+91/, "").replace(/\D/g, "");

      const halls = (extracted.halls ?? []).map((h, i) => ({
        name: h.name || `Hall ${i + 1}`,
        capacitySeated: h.capacitySeated || h.capacityStanding || 100,
        priceRupees: parseInt(hallPrices[i] ?? "0") || 10000,
      }));

      const res = await fetch("/api/admin/ai-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          venue: {
            name: extracted.name || "",
            venueType,
            address: extracted.address || "",
            city: extracted.city ?? null,
            phone: phone.length === 10 ? `+91${phone}` : null,
            whatsappPhone: wp.length === 10 ? `+91${wp}` : null,
            email: extracted.email ?? null,
            websiteUrl: extracted.websiteUrl ?? null,
            instagramUrl: extracted.instagramUrl ?? null,
            facebookUrl: extracted.facebookUrl ?? null,
            googleMapsUrl: extracted.googleMapsUrl ?? null,
          },
          halls,
          amenities: Array.from(selectedAmenities),
          photos: Array.from(selectedPhotos),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setApplyError(data.error ?? "Failed to apply"); return; }
      setApplied(true);
      setTimeout(() => router.refresh(), 1200);
    } finally {
      setApplying(false);
    }
  }

  function reset() {
    setExtracted(null);
    setApplyError("");
    setApplied(false);
  }

  const halls = extracted?.halls ?? [];
  const amenities = extracted?.amenities ?? [];
  const photos = extracted?.photos ?? [];
  const hasContent = !!(extracted?.name || extracted?.address || halls.length || amenities.length);

  return (
    <div className="rounded-2xl border-2 border-purple-200 dark:border-purple-800/60 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-zinc-900 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
            <Sparkles className="h-[18px] w-[18px] text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="font-semibold text-purple-900 dark:text-purple-100">AI Quick Setup</p>
            <p className="text-xs text-purple-500 dark:text-purple-400">
              Paste a URL or text — fills venue profile, halls &amp; amenities at once
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {applied && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {open ? <ChevronUp className="h-4 w-4 text-purple-400" /> : <ChevronDown className="h-4 w-4 text-purple-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-purple-200 dark:border-purple-800/40">

          {/* ── Phase 1: Input ── */}
          {!extracted && (
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                  URL <span className="font-normal text-purple-400">(Google Maps, Instagram, Facebook, website)</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleExtract()}
                  placeholder="https://www.google.com/maps/place/Zawaj+Convention+Centre/..."
                  className="w-full rounded-xl border border-purple-200 dark:border-purple-700 bg-white dark:bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                  Or paste any text <span className="font-normal text-purple-400">(brochure copy, Google listing, description…)</span>
                </label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={4}
                  placeholder="Paste anything — name, address, hall capacities, prices, amenities, contact info…"
                  className="w-full rounded-xl border border-purple-200 dark:border-purple-700 bg-white dark:bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>
              {extractError && <p className="text-xs text-red-500">{extractError}</p>}
              <button
                type="button"
                onClick={handleExtract}
                disabled={extracting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {extracting ? "Extracting…" : "Extract & Preview"}
              </button>
            </div>
          )}

          {/* ── Phase 2: Preview & Apply ── */}
          {extracted && (
            <div className="px-5 py-4 space-y-5">

              {!hasContent && (
                <p className="text-sm text-zinc-500">AI couldn&apos;t extract enough info. Try pasting more text or a different URL.</p>
              )}

              {/* Venue Profile preview */}
              {(extracted.name || extracted.address || extracted.phone || extracted.email) && (
                <section>
                  <div className="flex items-center gap-2 mb-2.5">
                    <Building2 className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">Venue Profile</span>
                  </div>

                  {/* Venue type picker */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {VENUE_TYPE_OPTIONS.map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setVenueType(t.key)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                          venueType === t.key
                            ? "bg-purple-600 border-purple-600 text-white"
                            : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-purple-300"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl bg-white dark:bg-zinc-800/50 border border-purple-100 dark:border-purple-900/40 divide-y divide-purple-50 dark:divide-purple-900/30">
                    {extracted.name && <PreviewRow label="Name" value={extracted.name} />}
                    {extracted.address && <PreviewRow label="Address" value={extracted.address} />}
                    {extracted.city && <PreviewRow label="City" value={extracted.city} />}
                    {extracted.phone && <PreviewRow label="Phone" value={extracted.phone} />}
                    {extracted.email && <PreviewRow label="Email" value={extracted.email} />}
                    {extracted.websiteUrl && <PreviewRow label="Website" value={extracted.websiteUrl} truncate />}
                    {extracted.googleMapsUrl && <PreviewRow label="Maps" value="✓ Google Maps URL found" />}
                    {extracted.instagramUrl && <PreviewRow label="Instagram" value="✓ found" />}
                    {extracted.facebookUrl && <PreviewRow label="Facebook" value="✓ found" />}
                  </div>
                </section>
              )}

              {/* Halls */}
              {halls.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2.5">
                    <Users className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">Halls</span>
                    <span className="text-[11px] text-zinc-400 ml-1">Set a price per slot for each hall</span>
                  </div>
                  <div className="space-y-2">
                    {halls.map((hall, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl bg-white dark:bg-zinc-800/50 border border-purple-100 dark:border-purple-900/40 px-3.5 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{hall.name || `Hall ${i + 1}`}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {hall.capacitySeated ? `${hall.capacitySeated} seated` : ""}
                            {hall.capacitySeated && hall.capacityStanding ? " · " : ""}
                            {hall.capacityStanding ? `${hall.capacityStanding} standing` : ""}
                            {!hall.capacitySeated && !hall.capacityStanding && "Capacity not specified"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <IndianRupee className="h-3 w-3 text-zinc-400" />
                          <input
                            type="number"
                            min="0"
                            placeholder="Price / slot"
                            value={hallPrices[i] ?? ""}
                            onChange={e => setHallPrices(p => ({ ...p, [i]: e.target.value }))}
                            className="w-28 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1.5">
                    Each hall gets Morning (8am–2pm) and Evening (2pm–10pm) slots for 90 days. Adjust after setup.
                  </p>
                </section>
              )}

              {/* Amenities */}
              {amenities.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2.5">
                    <Zap className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">Amenities</span>
                    <span className="text-[11px] text-zinc-400 ml-1">Tap to deselect any that don't apply</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map(amenity => {
                      const on = selectedAmenities.has(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => setSelectedAmenities(s => {
                            const n = new Set(s);
                            on ? n.delete(amenity) : n.add(amenity);
                            return n;
                          })}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            on
                              ? "bg-purple-600 border-purple-600 text-white"
                              : "border-zinc-200 dark:border-zinc-700 text-zinc-400 line-through"
                          }`}
                        >
                          {amenity}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Photos */}
              {photos.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2.5">
                    <ImageIcon className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">Photos Found</span>
                    <span className="text-[11px] text-zinc-400 ml-1">Tap to deselect any to exclude · added to first hall</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {photos.map(photoUrl => {
                      const on = selectedPhotos.has(photoUrl);
                      return (
                        <button
                          key={photoUrl}
                          type="button"
                          onClick={() => setSelectedPhotos(s => {
                            const n = new Set(s);
                            on ? n.delete(photoUrl) : n.add(photoUrl);
                            return n;
                          })}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                            on ? "border-purple-500" : "border-transparent opacity-40"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                          {on && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Success */}
              {applied && (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-4 py-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">
                    Setup applied! Page refreshing…
                  </span>
                </div>
              )}

              {applyError && <p className="text-sm text-red-500">{applyError}</p>}

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying || applied || !hasContent}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {applying ? "Applying…" : hasVenue ? "Update & Add" : "Create Full Setup"}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Re-extract
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewRow({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex gap-3 px-3.5 py-2">
      <span className="text-[11px] font-medium text-zinc-400 w-16 shrink-0 mt-px">{label}</span>
      <span className={`text-xs text-zinc-700 dark:text-zinc-300 ${truncate ? "truncate" : "break-all"}`}>{value}</span>
    </div>
  );
}
