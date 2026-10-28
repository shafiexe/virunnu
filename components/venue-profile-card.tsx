"use client";

import { useState } from "react";
import { Building2, Pencil, X, Loader2, CheckCircle2, Phone, Mail, MapPin, Globe, MessageCircle, ChevronDown, ChevronUp, Star, Sparkles } from "lucide-react";
import { VENUE_TYPE_OPTIONS, venueTypeLabel, type VenueTypeKey } from "@/lib/venue-types";

interface VenueProfile {
  id: string;
  name: string;
  venueType: string;
  approved?: boolean;
  phone: string | null;
  whatsappPhone: string | null;
  email: string | null;
  address: string;
  city: string | null;
  websiteUrl: string | null;
  googleMapsUrl?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  googleReviewUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
}

function parseMapsCoords(url: string): { lat: number; lng: number } | null {
  try {
    const m3d = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (m3d) return { lat: parseFloat(m3d[1]), lng: parseFloat(m3d[2]) };
    if (url.includes("/maps/dir/")) {
      const m1d = url.match(/!1d(-?\d+\.?\d*)!2d(-?\d+\.?\d*)/);
      if (m1d) return { lat: parseFloat(m1d[2]), lng: parseFloat(m1d[1]) };
    }
    const mat = url.match(/\/@(-?\d+\.?\d*),(-?\d+\.?\d*),\d+[zm]/);
    if (mat) return { lat: parseFloat(mat[1]), lng: parseFloat(mat[2]) };
  } catch { /* ignore */ }
  return null;
}

const FIELD = "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";
const LABEL = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1";

function PhoneInput({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className={LABEL}>{label}{required && " *"}</label>
      <div className="flex">
        <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-sm shrink-0">+91</span>
        <input
          value={value.replace(/^\+91/, "")}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder={placeholder ?? "9876543210"}
          inputMode="numeric"
          maxLength={10}
          required={required}
          className={`${FIELD} rounded-l-none`}
        />
      </div>
    </div>
  );
}

function InfoRow({ icon, value, href, label }: { icon: React.ReactNode; value: string | null; href?: string; label?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-zinc-400 shrink-0">{icon}</span>
      <div className="min-w-0">
        {label && <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">{label}</p>}
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-600 dark:text-amber-400 hover:underline break-all">{value}</a>
        ) : (
          <span className="text-sm text-zinc-700 dark:text-zinc-300">{value}</span>
        )}
      </div>
    </div>
  );
}

export function VenueProfileCard({
  venue: initial,
  embedded,
  collapsed,
  onToggleCollapse,
}: {
  venue: VenueProfile;
  embedded?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const [venue, setVenue] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [venueType, setVenueType] = useState<VenueTypeKey>(
    (initial.venueType as VenueTypeKey) ?? "CONVENTION_CENTER"
  );
  const [form, setForm] = useState({
    name: initial.name,
    phone: initial.phone ?? "",
    whatsappPhone: initial.whatsappPhone ?? "",
    email: initial.email ?? "",
    address: initial.address,
    city: initial.city ?? "",
    websiteUrl: initial.websiteUrl ?? "",
    googleMapsUrl: initial.googleMapsUrl ?? "",
    googleRating: initial.googleRating ? String(initial.googleRating) : "",
    googleReviewCount: initial.googleReviewCount ? String(initial.googleReviewCount) : "",
    googleReviewUrl: initial.googleReviewUrl ?? "",
    instagramUrl: initial.instagramUrl ?? "",
    facebookUrl: initial.facebookUrl ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // AI prefill state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiUrl, setAiUrl] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiAmenities, setAiAmenities] = useState<string[]>([]);

  async function handleAiPrefill() {
    if (!aiUrl.trim() && !aiText.trim()) {
      setAiError("Enter a URL or paste some text to extract from");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiAmenities([]);
    try {
      const res = await fetch("/api/owner/ai-prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: aiUrl.trim(), rawText: aiText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error ?? "Failed to extract"); return; }
      const e = data.extracted ?? {};

      setForm((f) => ({
        ...f,
        name: e.name || f.name,
        phone: e.phone ? e.phone.replace(/^\+91/, "").replace(/\D/g, "").slice(0, 10) : f.phone,
        whatsappPhone: e.whatsappPhone ? e.whatsappPhone.replace(/^\+91/, "").replace(/\D/g, "").slice(0, 10) : f.whatsappPhone,
        email: e.email || f.email,
        address: e.address || f.address,
        city: e.city || f.city,
        websiteUrl: e.websiteUrl || f.websiteUrl,
        instagramUrl: e.instagramUrl || f.instagramUrl,
        facebookUrl: e.facebookUrl || f.facebookUrl,
        googleMapsUrl: e.googleMapsUrl || f.googleMapsUrl,
      }));

      if (e.venueType) {
        const vt = e.venueType.toUpperCase().replace(/\s+/g, "_") as VenueTypeKey;
        if (VENUE_TYPE_OPTIONS.some((o) => o.key === vt)) setVenueType(vt);
      }

      if (e.amenities?.length) setAiAmenities(e.amenities);
    } catch {
      setAiError("Something went wrong. Try again or paste the text manually.");
    } finally {
      setAiLoading(false);
    }
  }

  function startEdit() {
    setVenueType((venue.venueType as VenueTypeKey) ?? "CONVENTION_CENTER");
    setForm({
      name: venue.name,
      phone: venue.phone ?? "",
      whatsappPhone: venue.whatsappPhone ?? "",
      email: venue.email ?? "",
      address: venue.address,
      city: venue.city ?? "",
      websiteUrl: venue.websiteUrl ?? "",
      googleMapsUrl: venue.googleMapsUrl ?? "",
      googleRating: venue.googleRating ? String(venue.googleRating) : "",
      googleReviewCount: venue.googleReviewCount ? String(venue.googleReviewCount) : "",
      googleReviewUrl: venue.googleReviewUrl ?? "",
      instagramUrl: venue.instagramUrl ?? "",
      facebookUrl: venue.facebookUrl ?? "",
    });
    setError("");
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const phone = form.phone.replace(/\D/g, "");
      if (phone.length !== 10) { setError("Phone number must be 10 digits"); setLoading(false); return; }

      const mapsUrl = form.googleMapsUrl.trim() || null;
      const coords = mapsUrl ? parseMapsCoords(mapsUrl) : null;
      const res = await fetch(`/api/owner/venues/${venue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          venueType,
          phone: `+91${phone}`,
          whatsappPhone: form.whatsappPhone.replace(/\D/g, "").length === 10
            ? `+91${form.whatsappPhone.replace(/\D/g, "")}`
            : null,
          email: form.email.trim() || null,
          address: form.address.trim(),
          city: form.city.trim() || null,
          websiteUrl: form.websiteUrl.trim() || null,
          googleMapsUrl: mapsUrl,
          googleRating: form.googleRating ? parseFloat(form.googleRating) : null,
          googleReviewCount: form.googleReviewCount ? parseInt(form.googleReviewCount) : null,
          googleReviewUrl: form.googleReviewUrl.trim() || null,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
          instagramUrl: form.instagramUrl.trim() || null,
          facebookUrl: form.facebookUrl.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError((data as { error?: string }).error ?? "Failed to save"); return; }
      setVenue((data as { venue: VenueProfile }).venue);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setLoading(false);
    }
  }

  // Show the WhatsApp number only if it's different from phone
  const whatsappDisplay = venue.whatsappPhone && venue.whatsappPhone !== venue.phone
    ? venue.whatsappPhone
    : null;

  const wrapperClass = embedded
    ? "overflow-hidden"
    : "rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden";

  return (
    <div className={wrapperClass}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{venue.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                {venueTypeLabel(venue.venueType)}
              </span>
              {venue.approved !== undefined && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  venue.approved
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}>
                  {venue.approved ? "Listed" : "Pending"}
                </span>
              )}
              {venue.city && <span className="text-xs text-zinc-400">{venue.city}, Kerala</span>}
            </div>
            {venue.googleRating && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-[11px] text-zinc-500">
                  {venue.googleRating.toFixed(1)}
                  {venue.googleReviewCount ? ` · ${venue.googleReviewCount} reviews` : ""}
                </span>
                {venue.googleMapsUrl && (
                  <a href={venue.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-amber-500 hover:underline ml-1">
                    Google Maps ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {!editing ? (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          ) : (
            <button onClick={() => setEditing(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
              <X className="h-4 w-4" />
            </button>
          )}
          {embedded && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {collapsed
                ? <ChevronDown className="h-4 w-4 text-zinc-400" />
                : <ChevronUp className="h-4 w-4 text-zinc-400" />}
            </button>
          )}
        </div>
      </div>

      {/* View mode */}
      {!editing && (
        <div className="px-5 pb-5 space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
          <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} value={[venue.address, venue.city].filter(Boolean).join(", ")} />
          <InfoRow icon={<Phone className="h-3.5 w-3.5" />} value={venue.phone} href={venue.phone ? `tel:${venue.phone}` : undefined} label="Phone" />
          {whatsappDisplay && (
            <InfoRow icon={<MessageCircle className="h-3.5 w-3.5" />} value={whatsappDisplay} href={`https://wa.me/${whatsappDisplay.replace(/\D/g, "")}`} label="WhatsApp" />
          )}
          <InfoRow icon={<Mail className="h-3.5 w-3.5" />} value={venue.email} href={venue.email ? `mailto:${venue.email}` : undefined} />
          <InfoRow icon={<Globe className="h-3.5 w-3.5" />} value={venue.websiteUrl} href={venue.websiteUrl ?? undefined} />
          {(venue.instagramUrl || venue.facebookUrl) && (
            <div className="flex items-center gap-3 pt-1">
              {venue.instagramUrl && (
                <a href={venue.instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-[#E1306C] transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
                  Instagram
                </a>
              )}
              {venue.facebookUrl && (
                <a href={venue.facebookUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-[#1877F2] transition-colors">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  Facebook
                </a>
              )}
            </div>
          )}
          {!venue.phone && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              ⚠ No phone number — tap Edit to add one
            </p>
          )}
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <form onSubmit={handleSave} className="px-5 pb-5 space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
          {/* AI Prefill */}
          <div className="rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-950/20 overflow-hidden">
            <button
              type="button"
              onClick={() => { setAiOpen((v) => !v); setAiError(""); }}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">AI Prefill</span>
                <span className="text-xs text-purple-500 dark:text-purple-400">Paste a URL or text to auto-fill fields</span>
              </div>
              {aiOpen ? <ChevronUp className="h-4 w-4 text-purple-400" /> : <ChevronDown className="h-4 w-4 text-purple-400" />}
            </button>

            {aiOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-purple-200 dark:border-purple-800/40 pt-3">
                <div>
                  <label className="block text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                    URL (Google Maps, Instagram, Facebook, website)
                  </label>
                  <input
                    type="url"
                    value={aiUrl}
                    onChange={(e) => setAiUrl(e.target.value)}
                    placeholder="https://www.google.com/maps/place/..."
                    className="w-full rounded-xl border border-purple-200 dark:border-purple-700 bg-white dark:bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                    Or paste any text (brochure, description, Google listing text…)
                  </label>
                  <textarea
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    rows={3}
                    placeholder="Paste any info about the venue here…"
                    className="w-full rounded-xl border border-purple-200 dark:border-purple-700 bg-white dark:bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  />
                </div>
                {aiError && <p className="text-xs text-red-500">{aiError}</p>}
                {aiAmenities.length > 0 && (
                  <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 px-3 py-2">
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Amenities found (add these in Facilities section):</p>
                    <p className="text-xs text-purple-700 dark:text-purple-300">{aiAmenities.join(" · ")}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAiPrefill}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {aiLoading ? "Extracting…" : "Extract & Prefill"}
                </button>
              </div>
            )}
          </div>

          {/* Venue type chips */}
          <div>
            <label className={LABEL}>Type of space</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {VENUE_TYPE_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setVenueType(t.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    venueType === t.key
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300 dark:hover:border-amber-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Name *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required minLength={2} placeholder="e.g. Zawaj Convention Centre" className={FIELD} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PhoneInput
              label="Phone number"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              required
            />
            <PhoneInput
              label="WhatsApp (if different)"
              value={form.whatsappPhone}
              onChange={(v) => setForm((f) => ({ ...f, whatsappPhone: v }))}
              placeholder="Leave blank if same as phone"
            />
          </div>

          <div>
            <label className={LABEL}>Email address</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com (optional)" className={FIELD} />
            <p className="text-[10px] text-zinc-400 mt-1">Email notifications are only sent when an email is set here.</p>
          </div>

          <div>
            <label className={LABEL}>Address *</label>
            <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required minLength={5} rows={2} placeholder="Full address of the convention center" className={`${FIELD} resize-none`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>City</label>
              <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Kozhikode" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Website (optional)</label>
              <input type="url" value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://yoursite.com" className={FIELD} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Instagram (optional)</label>
              <input type="url" value={form.instagramUrl} onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))} placeholder="https://instagram.com/yourpage" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Facebook (optional)</label>
              <input type="url" value={form.facebookUrl} onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))} placeholder="https://facebook.com/yourpage" className={FIELD} />
            </div>
          </div>

          <div>
            <label className={LABEL}>
              Google Maps link
              {form.googleMapsUrl && parseMapsCoords(form.googleMapsUrl) && (
                <span className="ml-2 normal-case font-normal text-emerald-600 dark:text-emerald-400">✓ location parsed</span>
              )}
            </label>
            <input
              type="url"
              value={form.googleMapsUrl}
              onChange={(e) => setForm((f) => ({ ...f, googleMapsUrl: e.target.value }))}
              placeholder="https://www.google.com/maps/place/..."
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Google rating (0–5)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={form.googleRating}
                onChange={(e) => setForm((f) => ({ ...f, googleRating: e.target.value }))}
                placeholder="4.1"
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>Review count</label>
              <input
                type="number"
                min="0"
                value={form.googleReviewCount}
                onChange={(e) => setForm((f) => ({ ...f, googleReviewCount: e.target.value }))}
                placeholder="120"
                className={FIELD}
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>Google review link (optional)</label>
            <input
              type="url"
              value={form.googleReviewUrl}
              onChange={(e) => setForm((f) => ({ ...f, googleReviewUrl: e.target.value }))}
              placeholder="https://search.google.com/local/writereview?placeid=..."
              className={FIELD}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
