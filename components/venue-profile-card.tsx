"use client";

import { useState } from "react";
import { Building2, Pencil, X, Loader2, CheckCircle2, Phone, Mail, MapPin, Globe, MessageCircle } from "lucide-react";

interface VenueProfile {
  id: string;
  name: string;
  phone: string | null;
  whatsappPhone: string | null;
  email: string | null;
  address: string;
  city: string | null;
  websiteUrl: string | null;
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

export function VenueProfileCard({ venue: initial }: { venue: VenueProfile }) {
  const [venue, setVenue] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: initial.name,
    phone: initial.phone ?? "",
    whatsappPhone: initial.whatsappPhone ?? "",
    email: initial.email ?? "",
    address: initial.address,
    city: initial.city ?? "",
    websiteUrl: initial.websiteUrl ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function startEdit() {
    setForm({
      name: venue.name,
      phone: venue.phone ?? "",
      whatsappPhone: venue.whatsappPhone ?? "",
      email: venue.email ?? "",
      address: venue.address,
      city: venue.city ?? "",
      websiteUrl: venue.websiteUrl ?? "",
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

      const res = await fetch(`/api/owner/venues/${venue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: `+91${phone}`,
          whatsappPhone: form.whatsappPhone.replace(/\D/g, "").length === 10
            ? `+91${form.whatsappPhone.replace(/\D/g, "")}`
            : null,
          email: form.email.trim() || null,
          address: form.address.trim(),
          city: form.city.trim() || null,
          websiteUrl: form.websiteUrl.trim() || null,
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

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{venue.name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{[venue.city, "Kerala"].filter(Boolean).join(", ")}</p>
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
          <div>
            <label className={LABEL}>Convention center name *</label>
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
