"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Building2 } from "lucide-react";
import { VENUE_TYPE_OPTIONS, type VenueTypeKey } from "@/lib/venue-types";

const FIELD = "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";
const LABEL = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1";

function parseMapsCoords(url: string): { lat: number; lng: number } | null {
  try {
    const m3d = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (m3d) return { lat: parseFloat(m3d[1]), lng: parseFloat(m3d[2]) };
    const mat = url.match(/\/@(-?\d+\.?\d*),(-?\d+\.?\d*),\d+[zm]/);
    if (mat) return { lat: parseFloat(mat[1]), lng: parseFloat(mat[2]) };
  } catch { /* ignore */ }
  return null;
}

export function AdminCreateVenueForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [venueType, setVenueType] = useState<VenueTypeKey>("CONVENTION_CENTER");
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    whatsappPhone: "",
    email: "",
    websiteUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    googleMapsUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) {
      setError("Name and address are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const phone = form.phone.replace(/\D/g, "");
      const wp = form.whatsappPhone.replace(/\D/g, "");
      const mapsUrl = form.googleMapsUrl.trim() || null;
      const coords = mapsUrl ? parseMapsCoords(mapsUrl) : null;

      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          name: form.name.trim(),
          venueType,
          address: form.address.trim(),
          city: form.city.trim() || null,
          phone: phone.length === 10 ? `+91${phone}` : null,
          whatsappPhone: wp.length === 10 ? `+91${wp}` : null,
          email: form.email.trim() || null,
          websiteUrl: form.websiteUrl.trim() || null,
          instagramUrl: form.instagramUrl.trim() || null,
          facebookUrl: form.facebookUrl.trim() || null,
          googleMapsUrl: mapsUrl,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create venue"); return; }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Create Venue Profile</h3>
          <p className="text-xs text-zinc-400 mt-0.5">No venue added yet — create one to enable bookings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
        {/* Venue type */}
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

        {/* Name */}
        <div>
          <label className={LABEL}>Name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            minLength={2}
            placeholder="e.g. Zawaj Convention Centre"
            className={FIELD}
          />
        </div>

        {/* Address + City */}
        <div>
          <label className={LABEL}>Address *</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            required
            minLength={3}
            rows={2}
            placeholder="Full address of the venue"
            className={`${FIELD} resize-none`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>City</label>
            <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Kozhikode" className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Phone</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-sm shrink-0">+91</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                placeholder="9876543210"
                inputMode="numeric"
                maxLength={10}
                className={`${FIELD} rounded-l-none`}
              />
            </div>
          </div>
        </div>

        {/* Email + Website */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="info@venue.com" className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Website</label>
            <input type="url" value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://yoursite.com" className={FIELD} />
          </div>
        </div>

        {/* Social */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Instagram</label>
            <input type="url" value={form.instagramUrl} onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))} placeholder="https://instagram.com/..." className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Facebook</label>
            <input type="url" value={form.facebookUrl} onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))} placeholder="https://facebook.com/..." className={FIELD} />
          </div>
        </div>

        {/* Google Maps */}
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

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {loading ? "Creating…" : "Create Venue"}
        </button>
      </form>
    </div>
  );
}
