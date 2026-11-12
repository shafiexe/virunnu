"use client";

import { PrefillSources, type PrefillReport } from "@/components/prefill-sources";
import { useState } from "react";
import { CheckCircle2, Copy, Plus, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseGoogleMapsCoords } from "@/lib/maps";
import { VENUE_TYPE_OPTIONS, type VenueTypeKey } from "@/lib/venue-types";

const AMENITIES = ["AC", "Projector", "Stage", "Parking", "Catering Kitchen", "Sound System", "Generator Backup", "Dressing Room", "CCTV"];

const INPUT =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300";

type Slot = { name: string; startTime: string; endTime: string };

const EMPTY = {
  name: "", phone: "", whatsappPhone: "", email: "",
  googleMapsUrl: "", lat: "", lng: "", address: "", city: "", pincode: "",
  googleRating: "", googleReviewCount: "", websiteUrl: "", instagramUrl: "", facebookUrl: "", youtubeUrl: "", linkedinUrl: "", twitterUrl: "",
  hallName: "", capacity: "", priceRupees: "",
};

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-500">
        {label}{required && <span className="text-red-500"> *</span>}
        {hint && <span className="font-normal text-zinc-400"> — {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{title}</div>
      {children}
    </div>
  );
}

// What would fill each missing detail, so the person knows which link to add
const HINT: Record<string, string> = {
  Name: "any link, or type it", Phone: "the Google details, or the website's contact page", Email: "the website's contact page or footer",
  Address: "the Google details", City: "the Google details", Capacity: "the website, or paste the brochure text", "Price per slot": "paste the price list text",
  "Google rating": "the Google details (the rating is in the panel)", Photos: "your website or Instagram page",
};

export function CenterForm({ mode, onClose }: { mode: "admin" | "apply"; onClose?: () => void }) {
  const isAdmin = mode === "admin";
  const [venueType, setVenueType] = useState<VenueTypeKey>("CONVENTION_CENTER");
  const [f, setF] = useState(EMPTY);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [extraAmenities, setExtraAmenities] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [customAmenity, setCustomAmenity] = useState("");
  const [photoOptions, setPhotoOptions] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [brokenPhotos, setBrokenPhotos] = useState<string[]>([]);
  const [photoLink, setPhotoLink] = useState("");
  const [slots, setSlots] = useState<Slot[]>([
    { name: "Morning", startTime: "08:00", endTime: "14:00" },
    { name: "Evening", startTime: "14:00", endTime: "22:00" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ orgId?: string; phone?: string; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [aiReport, setAiReport] = useState<PrefillReport | null>(null);
  const [checked, setChecked] = useState(false);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  function onMapsUrl(url: string) {
    const coords = parseGoogleMapsCoords(url);
    setF((p) => ({
      ...p,
      googleMapsUrl: url,
      lat: coords ? coords.lat.toFixed(6) : p.lat,
      lng: coords ? coords.lng.toFixed(6) : p.lng,
    }));
  }

  function addPhotoLink() {
    const u = photoLink.trim();
    if (!/^https?:\/\//i.test(u)) return;
    setPhotoOptions((p) => (p.includes(u) ? p : [u, ...p]));
    setSelectedPhotos((p) => (p.includes(u) ? p : [u, ...p]));
    setBrokenPhotos((p) => p.filter((x) => x !== u));
    setPhotoLink("");
  }

  function addCustomAmenity() {
    const t = customAmenity.trim();
    if (!t || t.length > 40) return;
    if (!AMENITIES.includes(t) && !extraAmenities.includes(t)) setExtraAmenities((p) => [...p, t]);
    setAmenities((p) => (p.includes(t) ? p : [...p, t]));
    setCustomAmenity("");
  }

  function updateSlot(i: number, patch: Partial<Slot>) {
    setSlots((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  const REQUIRED: [keyof typeof EMPTY, string][] = [
    ["name", "Name"], ["phone", "Phone"],
    ...(isAdmin ? ([["email", "Email"]] as [keyof typeof EMPTY, string][]) : []),
    ["address", "Address"],
    ...(isAdmin ? [] : ([["city", "City"]] as [keyof typeof EMPTY, string][])),
    ["capacity", "Capacity"], ["priceRupees", "Price per slot"],
  ];

  async function fillWithAi() {
    if (aiLoading) return;
    setAiLoading(true);
    setAiNote(null);
    setAiReport(null);
    try {
      const res = await fetch(isAdmin ? "/api/admin/ai-center-prefill" : "/api/apply/ai-prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAiNote({ ok: false, text: data.error ?? "AI could not read that. Try again." });
        return;
      }
      const x = data.extracted ?? {};
      const str = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : String(v));
      const next = { ...f };
      const map: [keyof typeof EMPTY, unknown][] = [
        ["name", x.name], ["phone", x.phone], ["email", x.email], ["address", x.address],
        ["city", x.city], ["pincode", x.pincode], ["googleMapsUrl", x.googleMapsUrl],
        ["lat", x.lat], ["lng", x.lng], ["googleRating", x.googleRating],
        ["googleReviewCount", x.googleReviewCount], ["websiteUrl", x.websiteUrl],
        ["instagramUrl", x.instagramUrl], ["facebookUrl", x.facebookUrl],
        ["youtubeUrl", x.youtubeUrl], ["linkedinUrl", x.linkedinUrl], ["twitterUrl", x.twitterUrl],
        ["hallName", x.hallName], ["capacity", x.capacity], ["priceRupees", x.priceRupees],
      ];
      let filled = 0;
      for (const [k, v] of map) {
        const val = str(v);
        if (val !== undefined) {
          next[k] = k === "lat" || k === "lng" ? Number(val).toFixed(6) : val;
          filled++;
        }
      }
      setF(next);
      const found: string[] = Array.isArray(x.amenities) ? x.amenities : [];
      const ideas: string[] = Array.isArray(x.suggestedAmenities) ? x.suggestedAmenities : [];
      if (found.length) setAmenities(found);
      setSuggested(ideas);
      const pics: string[] = Array.isArray(data.photos) ? data.photos : [];
      if (pics.length) {
        setPhotoOptions(pics);
        setSelectedPhotos(pics);
        setBrokenPhotos([]);
      }
      setExtraAmenities([...found, ...ideas].filter((a) => !AMENITIES.includes(a)));
      if (typeof x.description === "string" && x.description.trim()) setDescription(x.description.trim());
      if (Array.isArray(x.slots) && x.slots.length) {
        setSlots(x.slots.filter((sl: Slot) => sl?.name && sl?.startTime && sl?.endTime));
      }
      setChecked(true);
      const missing = REQUIRED.filter(([k]) => !next[k]).map(([, label]) => label);
      const unreadable: string[] = Array.isArray(data.unreadable) ? data.unreadable : [];
      const gp = data.googlePlace as { name: string; address: string | null } | null;
      const googleNote = gp
        ? ` Rating & pin from Google: “${gp.name}”${gp.address ? `, ${gp.address}` : ""} — check it's the right place.`
        : !data.placesConfigured && !next.googleRating
          ? " Rating not found — paste the Google panel text, or enable the Google Places key to fetch it automatically."
          : "";
      const skipped = unreadable.length
        ? ` Couldn't read ${unreadable.map((u) => u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)).join(", ")} — open it, select all (Cmd/Ctrl+A), copy, and paste the text here instead.`
        : "";
      const labels: Partial<Record<keyof typeof EMPTY, string>> = {
        name: "Name", phone: "Phone", email: "Email", address: "Address", city: "City", pincode: "Pincode", googleMapsUrl: "Map link", lat: "Map pin",
        googleRating: "Google rating", websiteUrl: "Website", instagramUrl: "Instagram", facebookUrl: "Facebook", youtubeUrl: "YouTube", hallName: "Hall name", capacity: "Capacity", priceRupees: "Price per slot",
      };
      const src = (data.sources ?? {}) as Record<string, "google" | "website" | "text" | "ai">;
      const filledLabels: { label: string; from?: "google" | "website" | "text" | "ai" }[] = map
        .filter(([k, v]) => str(v) !== undefined && labels[k] && labels[k] !== "Map pin")
        .map(([k]) => ({ label: labels[k] as string, from: src[k as string] }));
      if (found.length) filledLabels.push({ label: `${found.length} amenities`, from: "text" });
      if (Array.isArray(x.slots) && x.slots.length) filledLabels.push({ label: "Slot timings", from: "text" });
      const wanted = [...missing, ...(!next.googleRating ? ["Google rating"] : []), ...(!pics.length ? ["Photos"] : [])];
      setAiReport({
        filled: filledLabels,
        missing: wanted.map((label) => ({ label, hint: HINT[label] ?? "paste the details" })),
        unreadable, photos: pics.length, descriptionWritten: typeof x.description === "string" && !!x.description.trim(),
        googleNote: gp ? `Rating and map pin came from Google: “${gp.name}”${gp.address ? `, ${gp.address}` : ""}. Check it is the right place.` : undefined,
      });
      setAiNote(
        missing.length
          ? { ok: false, text: `Filled ${filled} fields. Still needed: ${missing.join(", ")}.${googleNote}${skipped}` }
          : { ok: !skipped && !googleNote.includes("not found"), text: `Filled ${filled} fields. All required details found — review and ${isAdmin ? "create" : "submit"}.${googleNote}${skipped}` }
      );
    } catch {
      setAiNote({ ok: false, text: "Something went wrong. Please try again." });
    } finally {
      setAiLoading(false);
    }
  }

  const bad = (k: keyof typeof EMPTY) => checked && !f[k] && REQUIRED.some(([r]) => r === k);

  async function submit() {
    if (loading) return;
    setError("");
    const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
    setLoading(true);
    try {
      const res = await fetch(isAdmin ? "/api/admin/owners" : "/api/apply/venue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name,
          venueType,
          phone: f.phone.replace(/\D/g, "").length >= 10 && !f.phone.trim().startsWith("+") ? f.phone.replace(/\D/g, "") : f.phone,
          whatsappPhone: f.whatsappPhone,
          email: f.email,
          address: f.address,
          city: f.city,
          pincode: f.pincode,
          googleMapsUrl: f.googleMapsUrl,
          lat: num(f.lat) ?? 0,
          lng: num(f.lng) ?? 0,
          googleRating: num(f.googleRating),
          googleReviewCount: num(f.googleReviewCount),
          websiteUrl: f.websiteUrl,
          instagramUrl: f.instagramUrl,
          facebookUrl: f.facebookUrl,
          youtubeUrl: f.youtubeUrl,
          linkedinUrl: f.linkedinUrl,
          twitterUrl: f.twitterUrl,
          hallName: f.hallName,
          description,
          photos: selectedPhotos.filter((u) => !brokenPhotos.includes(u)),
          capacity: num(f.capacity) ?? 0,
          priceRupees: num(f.priceRupees) ?? 0,
          amenities,
          slots,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Please check the highlighted details and try again");
        return;
      }
      setCreated(data);
    } finally {
      setLoading(false);
    }
  }

  if (created && !isAdmin) {
    return (
      <div className="max-w-md mx-auto text-center space-y-5 py-10">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Application submitted!</h2>
        <p className="text-sm leading-relaxed text-zinc-500">
          Thank you for registering {f.name} on Virunnu. Our team will review your details and get back to you within 1–2 business days.
          Once approved, your listing goes live and your login is sent to your WhatsApp{f.email ? " and email" : ""}.
          You can update everything later from your dashboard.
        </p>
        <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors">
          Back to home
        </a>
      </div>
    );
  }

  if (created && isAdmin) {
    const text = `Phone: ${created.phone}\nPassword: ${created.password}`;
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/70 dark:bg-emerald-950/20 p-5 space-y-4">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
          <CheckCircle2 className="h-5 w-5" />
          {f.name} is live
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-white dark:bg-zinc-900 p-4 font-mono text-sm space-y-1">
          <div>Phone: <span className="font-semibold">{created.phone}</span></div>
          <div>Password: <span className="font-semibold">{created.password}</span></div>
        </div>
        <p className="text-xs text-zinc-500">
          Shown only once. We also sent these to {f.email} and WhatsApp {created.phone}.
        </p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* ignore */ }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy login"}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const hasPin = f.lat !== "" && f.lng !== "" && Number(f.lat) !== 0;

  return (
    <div className={cn(
      "rounded-2xl border p-5 space-y-6",
      isAdmin
        ? "border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20"
        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sm:p-7"
    )}>
      {isAdmin && (
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Add convention center</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      <PrefillSources kind="center" onChange={setAiText} onFill={fillWithAi} loading={aiLoading} note={aiNote} report={aiReport} />

      <Section title="Basics">
        <Field label="Type of space">
          <div className="flex flex-wrap gap-2">
            {VENUE_TYPE_OPTIONS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setVenueType(t.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                  venueType === t.key
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Convention center name" required>
          <input className={cn(INPUT, bad("name") && "border-red-400 focus:ring-red-300")} value={f.name} onChange={set("name")} placeholder="e.g. ZAWAJ Convention Centre" />
        </Field>
      </Section>

      <Section title={isAdmin ? "Contact (also used to log in)" : "Contact (used to log in once approved)"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Phone" required>
            <input className={cn(INPUT, bad("phone") && "border-red-400 focus:ring-red-300")} value={f.phone} onChange={set("phone")} placeholder="98xxxxxxxx" inputMode="tel" />
          </Field>
          <Field label="WhatsApp" hint="if different from phone">
            <input className={INPUT} value={f.whatsappPhone} onChange={set("whatsappPhone")} placeholder="98xxxxxxxx" inputMode="tel" />
          </Field>
          <Field label="Email" required={isAdmin} hint={isAdmin ? undefined : "optional — for email notifications"}>
            <input className={cn(INPUT, bad("email") && "border-red-400 focus:ring-red-300")} value={f.email} onChange={set("email")} placeholder="hello@example.com" type="email" />
          </Field>
        </div>
      </Section>

      <Section title="Location">
        <Field label="Google Maps link" hint="paste to auto-locate on map">
          <input className={INPUT} value={f.googleMapsUrl} onChange={(e) => onMapsUrl(e.target.value)} placeholder="https://www.google.com/maps/place/…" />
        </Field>
        {f.googleMapsUrl && (
          <p className={cn("text-xs", hasPin ? "text-emerald-600" : "text-amber-600")}>
            {hasPin ? `📍 ${Number(f.lat).toFixed(4)}, ${Number(f.lng).toFixed(4)}` : "Couldn't read coordinates from this link — enter them below"}
          </p>
        )}
        {!hasPin && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude"><input className={INPUT} value={f.lat} onChange={set("lat")} placeholder="11.1452" inputMode="decimal" /></Field>
            <Field label="Longitude"><input className={INPUT} value={f.lng} onChange={set("lng")} placeholder="75.9622" inputMode="decimal" /></Field>
          </div>
        )}
        <Field label="Address" required>
          <input className={cn(INPUT, bad("address") && "border-red-400 focus:ring-red-300")} value={f.address} onChange={set("address")} placeholder="Copy from Google Maps page" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" required={!isAdmin}><input className={cn(INPUT, bad("city") && "border-red-400 focus:ring-red-300")} value={f.city} onChange={set("city")} placeholder="Kondotty" /></Field>
          <Field label="Pincode"><input className={INPUT} value={f.pincode} onChange={set("pincode")} placeholder="673638" inputMode="numeric" /></Field>
        </div>
      </Section>

      <Section title="Online presence (optional)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Google rating"><input className={INPUT} value={f.googleRating} onChange={set("googleRating")} placeholder="4.1" inputMode="decimal" /></Field>
          <Field label="No. of reviews"><input className={INPUT} value={f.googleReviewCount} onChange={set("googleReviewCount")} placeholder="16" inputMode="numeric" /></Field>
          <Field label="Website"><input className={INPUT} value={f.websiteUrl} onChange={set("websiteUrl")} placeholder="https://…" /></Field>
          <Field label="Instagram"><input className={INPUT} value={f.instagramUrl} onChange={set("instagramUrl")} placeholder="https://instagram.com/…" /></Field>
          <Field label="Facebook"><input className={INPUT} value={f.facebookUrl} onChange={set("facebookUrl")} placeholder="https://facebook.com/…" /></Field>
          <Field label="YouTube"><input className={INPUT} value={f.youtubeUrl} onChange={set("youtubeUrl")} placeholder="https://youtube.com/@…" /></Field>
          <Field label="LinkedIn"><input className={INPUT} value={f.linkedinUrl} onChange={set("linkedinUrl")} placeholder="https://linkedin.com/company/…" /></Field>
          <Field label="Twitter / X"><input className={INPUT} value={f.twitterUrl} onChange={set("twitterUrl")} placeholder="https://x.com/…" /></Field>
        </div>
      </Section>

      <Section title="Hall & pricing">
        <Field label="Hall name" hint="optional — defaults to the convention center name">
          <input className={INPUT} value={f.hallName} onChange={set("hallName")} placeholder="e.g. Main Hall" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacity (guests)" required>
            <input className={cn(INPUT, bad("capacity") && "border-red-400 focus:ring-red-300")} value={f.capacity} onChange={set("capacity")} placeholder="800" inputMode="numeric" />
          </Field>
          <Field label="Price per slot (₹)" required>
            <input className={cn(INPUT, bad("priceRupees") && "border-red-400 focus:ring-red-300")} value={f.priceRupees} onChange={set("priceRupees")} placeholder="60000" inputMode="numeric" />
          </Field>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-500">Slots</span>
          {slots.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
              <input className={INPUT} value={s.name} onChange={(e) => updateSlot(i, { name: e.target.value })} placeholder="Slot name" />
              <input className={cn(INPUT, "w-28")} type="time" value={s.startTime} onChange={(e) => updateSlot(i, { startTime: e.target.value })} />
              <input className={cn(INPUT, "w-28")} type="time" value={s.endTime} onChange={(e) => updateSlot(i, { endTime: e.target.value })} />
              <button
                onClick={() => setSlots((p) => p.filter((_, idx) => idx !== i))}
                disabled={slots.length === 1}
                className="p-1.5 text-zinc-400 hover:text-red-500 disabled:opacity-30"
                aria-label="Remove slot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setSlots((p) => [...p, { name: "", startTime: "09:00", endTime: "13:00" }])}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add slot
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-500">
            Photos {photoOptions.length > 0 && <span className="font-normal text-zinc-400">— tap to include or remove ({selectedPhotos.filter((u) => !brokenPhotos.includes(u)).length} selected). The first selected is the cover; the center can change these later</span>}
          </span>
          {photoOptions.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photoOptions.filter((u) => !brokenPhotos.includes(u)).map((u) => {
                const on = selectedPhotos.includes(u);
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setSelectedPhotos((p) => (on ? p.filter((x) => x !== u) : [...p, u]))}
                    className={cn(
                      "relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all",
                      on ? "border-amber-500" : "border-transparent opacity-50 hover:opacity-80"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u}
                      alt=""
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={() => setBrokenPhotos((p) => [...p, u])}
                      className="h-full w-full object-cover"
                    />
                    {on && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <input
              className={cn(INPUT, "max-w-md")}
              value={photoLink}
              onChange={(e) => setPhotoLink(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPhotoLink(); } }}
              placeholder="Add a photo link (right-click an image → Copy image address)"
            />
            <button type="button" onClick={addPhotoLink} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 hover:text-zinc-900">
              Add
            </button>
          </div>
        </div>

        <Field label="About" hint="shown to customers on the venue page — edit freely">
          <textarea
            className={cn(INPUT, "resize-y")}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of the convention center (AI can draft this from the links you paste)"
          />
        </Field>

        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-500">
            Amenities <span className="font-normal text-zinc-400">— saved as the center's Amenities &amp; Add-ons (free by default); the center can edit or price them later</span>
            {suggested.length > 0 && <span className="font-normal text-zinc-400"> — tap to include or remove; <Sparkles className="inline h-3 w-3 text-amber-500" /> are AI suggestions, not from the source</span>}
          </span>
          <div className="flex flex-wrap gap-2">
            {[...AMENITIES, ...extraAmenities.filter((a) => !AMENITIES.includes(a))].map((a) => {
              const on = amenities.includes(a);
              const isSuggestion = suggested.includes(a) && !on;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmenities((p) => (on ? p.filter((x) => x !== a) : [...p, a]))}
                  className={cn(
                    "px-3 py-1 rounded-full border text-xs font-medium transition-colors inline-flex items-center gap-1",
                    on
                      ? "bg-amber-500 border-amber-500 text-white"
                      : isSuggestion
                        ? "border-dashed border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300"
                  )}
                >
                  {isSuggestion && <Sparkles className="h-3 w-3" />}
                  {a}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              className={cn(INPUT, "max-w-[14rem]")}
              value={customAmenity}
              onChange={(e) => setCustomAmenity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addCustomAmenity(); }
              }}
              placeholder="Add another amenity"
            />
            <button type="button" onClick={addCustomAmenity} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 hover:text-zinc-900">
              Add
            </button>
          </div>
        </div>
      </Section>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {loading ? (isAdmin ? "Creating…" : "Submitting…") : isAdmin ? "Create & publish" : "Submit application"}
        </button>
        {isAdmin && (
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
