"use client";

import Link from "next/link";

import { PrefillSources, type PrefillReport } from "@/components/prefill-sources";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, ImagePlus, Plus, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseGoogleMapsCoords } from "@/lib/maps";

const INPUT =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300";
const BAD = "border-red-400 focus:ring-red-300";

const SERVICES: [string, string][] = [
  ["FOOD", "Food & Catering"],
  ["SERVING_STAFF", "Serving Staff"],
  ["DECORATION", "Decoration"],
  ["TENT_SHAMIANA", "Tent / Shamiana"],
  ["SOUND_LIGHT", "Sound & Lighting"],
  ["TRANSPORT", "Transport"],
];
const MEALS: [string, string][] = [
  ["BREAKFAST", "Breakfast"], ["LUNCH", "Lunch"], ["DINNER", "Dinner"], ["SNACKS", "Snacks & Tea"],
];
const CUISINES = ["Kerala", "Malabar", "North Indian", "Chinese", "Arabic", "Continental", "Bakery & Snacks"];
const NOTICE: [string, string][] = [
  ["6", "Same day"], ["24", "1 day before"], ["48", "2 days before"], ["72", "3 days before"], ["168", "1 week before"],
];

type Pkg = { name: string; pricePerPlate: string; isVeg: boolean; dishes: string };
type Item = { name: string; category: string; priceRupees: string; isVeg: boolean };
type Past = { title: string; type: string; guests: string; note: string };
type MenuImage = { mediaType: "image/jpeg"; data: string; preview: string };

const EMPTY = {
  name: "", description: "", phone: "", whatsappPhone: "", email: "",
  googleMapsUrl: "", lat: "", lng: "", address: "", city: "", pincode: "",
  serviceRadiusKm: "", minGuests: "", maxGuests: "", leadTimeHours: "",
  fssaiNumber: "", teamSize: "", yearsExperience: "",
  googleRating: "", googleReviewCount: "",
  websiteUrl: "", instagramUrl: "", facebookUrl: "", youtubeUrl: "", linkedinUrl: "", twitterUrl: "",
};
type FormKey = keyof typeof EMPTY;

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

function Chip({ on, suggestion, onClick, children }: { on: boolean; suggestion?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full border text-xs font-medium transition-colors inline-flex items-center gap-1",
        on
          ? "bg-amber-500 border-amber-500 text-white"
          : suggestion
            ? "border-dashed border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300"
      )}
    >
      {suggestion && !on && <Sparkles className="h-3 w-3" />}
      {children}
    </button>
  );
}

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState("");
  function add() {
    const t = text.trim();
    if (t && t.length <= 60 && !values.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...values, t]);
    setText("");
  }
  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className={cn(INPUT, "max-w-xs")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <button type="button" onClick={add} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 hover:text-zinc-900">
          Add
        </button>
      </div>
    </div>
  );
}

async function toJpeg(file: File): Promise<MenuImage> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { mediaType: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl };
}

// What would fill each missing detail, so the person knows which link to add
const HINT: Record<string, string> = {
  Name: "any link, or type it", Phone: "the Google details, or the website's contact page", Email: "the website's contact page or footer", City: "the Google details", Address: "the Google details",
  "Google rating": "the Google details (the rating is in the panel)", Photos: "your website or Instagram page",
  "areas you serve": "the website or Facebook About page", "guest range": "the website, or paste the brochure text", "a package with price per plate": "menu card photos, or paste the price list",
};

export function CatererForm({ mode, onClose }: { mode: "admin" | "apply"; onClose?: () => void }) {
  const isAdmin = mode === "admin";
  const [f, setF] = useState(EMPTY);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>(["FOOD"]);
  const [suggestedServices, setSuggestedServices] = useState<string[]>([]);
  // lunch and dinner are ticked to start; untick or add breakfast and snacks
  const [mealTypes, setMealTypes] = useState<string[]>(["LUNCH", "DINNER"]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  // the city is offered as the first area served, until the person edits the list
  const areasTouched = useRef(false);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [pastEvents, setPastEvents] = useState<Past[]>([]);
  const [photoOptions, setPhotoOptions] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [brokenPhotos, setBrokenPhotos] = useState<string[]>([]);
  const [photoLink, setPhotoLink] = useState("");
  const [menuImages, setMenuImages] = useState<MenuImage[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [aiReport, setAiReport] = useState<PrefillReport | null>(null);
  useEffect(() => { if (!areasTouched.current && f.city.trim()) setServiceAreas([f.city.trim()]); }, [f.city]);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ phone?: string; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: FormKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const REQUIRED: [FormKey, string][] = [
    ["name", "Name"], ["phone", "Phone"], ["email", "Email"], ["city", "City"],
    ...(isAdmin ? [] : ([["address", "Address"]] as [FormKey, string][])),
  ];
  const bad = (k: FormKey) => checked && !f[k] && REQUIRED.some(([r]) => r === k);

  function onMapsUrl(url: string) {
    const c = parseGoogleMapsCoords(url);
    setF((p) => ({ ...p, googleMapsUrl: url, lat: c ? c.lat.toFixed(6) : p.lat, lng: c ? c.lng.toFixed(6) : p.lng }));
  }

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function addPhotoLink() {
    const u = photoLink.trim();
    if (!/^https?:\/\//i.test(u)) return;
    setPhotoOptions((p) => (p.includes(u) ? p : [u, ...p]));
    setSelectedPhotos((p) => (p.includes(u) ? p : [u, ...p]));
    setBrokenPhotos((p) => p.filter((x) => x !== u));
    setPhotoLink("");
  }

  async function onMenuFiles(files: FileList | null) {
    if (!files) return;
    const picked = [...files].filter((x) => x.type.startsWith("image/")).slice(0, 3 - menuImages.length);
    try {
      const out = await Promise.all(picked.map(toJpeg));
      setMenuImages((p) => [...p, ...out].slice(0, 3));
    } catch {
      setAiNote({ ok: false, text: "Couldn't read that image. Try a JPG or PNG." });
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function fillWithAi() {
    if (aiLoading) return;
    setAiLoading(true);
    setAiNote(null);
    setAiReport(null);
    try {
      const res = await fetch(isAdmin ? "/api/admin/ai-caterer-prefill" : "/api/apply/ai-caterer-prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: aiText,
          images: menuImages.map(({ mediaType, data }) => ({ mediaType, data })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAiNote({ ok: false, text: data.error ?? "AI could not read that. Try again." });
        return;
      }
      const x = data.extracted ?? {};
      const s = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : String(v));
      const next = { ...f };
      const map: [FormKey, unknown][] = [
        ["name", x.name], ["description", x.description], ["phone", x.phone], ["whatsappPhone", x.whatsappPhone],
        ["email", x.email], ["googleMapsUrl", x.googleMapsUrl], ["lat", x.lat], ["lng", x.lng],
        ["address", x.address], ["city", x.city], ["pincode", x.pincode],
        ["serviceRadiusKm", x.serviceRadiusKm], ["minGuests", x.minGuests], ["maxGuests", x.maxGuests],
        ["leadTimeHours", x.leadTimeHours], ["fssaiNumber", x.fssaiNumber], ["teamSize", x.teamSize],
        ["yearsExperience", x.yearsExperience], ["googleRating", x.googleRating], ["googleReviewCount", x.googleReviewCount],
        ["websiteUrl", x.websiteUrl], ["instagramUrl", x.instagramUrl], ["facebookUrl", x.facebookUrl],
        ["youtubeUrl", x.youtubeUrl], ["linkedinUrl", x.linkedinUrl], ["twitterUrl", x.twitterUrl],
      ];
      let filled = 0;
      for (const [k, v] of map) {
        const val = s(v);
        if (val !== undefined) {
          next[k] = k === "lat" || k === "lng" ? Number(val).toFixed(6) : val;
          filled++;
        }
      }
      setF(next);

      const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((i) => typeof i === "string") : []);
      if (list(x.cuisines).length) setCuisines(list(x.cuisines));
      if (list(x.services).length) setServices(list(x.services));
      setSuggestedServices(list(x.suggestedServices));
      if (list(x.mealTypes).length) setMealTypes(list(x.mealTypes));
      if (list(x.serviceAreas).length) { areasTouched.current = true; setServiceAreas(list(x.serviceAreas)); }

      if (Array.isArray(x.packages) && x.packages.length) {
        setPackages(
          x.packages.map((p: { name: string; pricePerPlate: number; isVeg: boolean; dishes?: string[] }) => ({
            name: p.name, pricePerPlate: String(p.pricePerPlate), isVeg: p.isVeg !== false, dishes: (p.dishes ?? []).join(", "),
          }))
        );
      }
      if (Array.isArray(x.items) && x.items.length) {
        setItems(
          x.items.map((i: { name: string; category?: string; priceRupees: number; isVeg: boolean }) => ({
            name: i.name, category: i.category ?? "", priceRupees: String(i.priceRupees), isVeg: i.isVeg !== false,
          }))
        );
      }
      if (Array.isArray(x.pastEvents) && x.pastEvents.length) {
        setPastEvents(
          x.pastEvents.map((e: { title: string; type?: string; guests?: number; note?: string }) => ({
            title: e.title, type: e.type ?? "", guests: e.guests ? String(e.guests) : "", note: e.note ?? "",
          }))
        );
      }
      const pics: string[] = Array.isArray(data.photos) ? data.photos : [];
      if (pics.length) {
        setPhotoOptions(pics);
        setSelectedPhotos(pics);
        setBrokenPhotos([]);
      }

      setChecked(true);
      const missing = REQUIRED.filter(([k]) => !next[k]).map(([, label]) => label);
      const nudges = [
        !(list(x.serviceAreas).length || serviceAreas.length) && "areas you serve",
        !(next.minGuests || next.maxGuests) && "guest range",
        !(Array.isArray(x.packages) && x.packages.length) && packages.length === 0 && "a package with price per plate",
      ].filter(Boolean) as string[];
      const unreadable: string[] = Array.isArray(data.unreadable) ? data.unreadable : [];
      const skipped = unreadable.length
        ? ` Couldn't read ${unreadable.map((u) => u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)).join(", ")} — open it, select all (Cmd/Ctrl+A), copy, and paste the text here instead.`
        : "";
      const gp = data.googlePlace as { name: string; address: string | null } | null;
      const googleNote = gp ? ` Rating & pin from Google: “${gp.name}” — check it's the right place.` : "";
      const tail = nudges.length ? ` Worth adding: ${nudges.join(", ")}.` : "";
      const labels: Partial<Record<FormKey, string>> = {
        name: "Name", description: "About", phone: "Phone", whatsappPhone: "WhatsApp", email: "Email", googleMapsUrl: "Map link", address: "Address", city: "City", pincode: "Pincode",
        serviceRadiusKm: "Service radius", minGuests: "Guest range", maxGuests: "Guest range", leadTimeHours: "Notice needed", fssaiNumber: "FSSAI number", teamSize: "Team size", yearsExperience: "Experience",
        googleRating: "Google rating", websiteUrl: "Website", instagramUrl: "Instagram", facebookUrl: "Facebook", youtubeUrl: "YouTube",
      };
      const src = (data.sources ?? {}) as Record<string, "google" | "website" | "text" | "ai">;
      const filledLabels: { label: string; from?: "google" | "website" | "text" | "ai" }[] = map
        .filter(([k, v]) => s(v) !== undefined && labels[k] && labels[k] !== "About")
        .map(([k]) => ({ label: labels[k] as string, from: src[k as string] }));
      const add = (label: string) => filledLabels.push({ label, from: "text" });
      if (list(x.cuisines).length) add("Cuisines");
      if (list(x.services).length) add("Services");
      if (list(x.serviceAreas).length) add("Areas served");
      if (Array.isArray(x.packages) && x.packages.length) add(`${x.packages.length} packages`);
      if (Array.isArray(x.items) && x.items.length) add(`${x.items.length} menu items`);
      if (Array.isArray(x.pastEvents) && x.pastEvents.length) add("Past events");
      const wanted: { label: string; hint: string }[] = [
        ...missing.map((label) => ({ label, hint: HINT[label] ?? "paste the details" })),
        ...nudges.map((label) => ({ label: label[0].toUpperCase() + label.slice(1), hint: HINT[label] ?? "the website, or paste the menu text" })),
        ...(!next.googleRating ? [{ label: "Google rating", hint: HINT["Google rating"] }] : []),
        ...(!pics.length ? [{ label: "Photos", hint: HINT.Photos }] : []),
      ];
      setAiReport({
        filled: filledLabels, missing: wanted, unreadable, photos: pics.length,
        descriptionWritten: typeof x.description === "string" && !!x.description.trim(),
        googleNote: gp ? `Rating and map pin came from Google: “${gp.name}”. Check it is the right place.` : undefined,
      });
      setAiNote(
        missing.length
          ? { ok: false, text: `Filled ${filled} fields. Still needed: ${missing.join(", ")}.${tail}${googleNote}${skipped}` }
          : { ok: !skipped, text: `Filled ${filled} fields. Review and ${isAdmin ? "create" : "submit"}.${tail}${googleNote}${skipped}` }
      );
    } catch {
      setAiNote({ ok: false, text: "Something went wrong. Please try again." });
    } finally {
      setAiLoading(false);
    }
  }

  async function submit() {
    if (loading) return;
    setError("");
    setChecked(true);
    const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? undefined : Number(v));
    const split = (v: string) => v.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    setLoading(true);
    try {
      const res = await fetch(isAdmin ? "/api/admin/caterers" : "/api/apply/caterer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name,
          description: f.description,
          phone: f.phone.replace(/\D/g, "").length >= 10 && !f.phone.trim().startsWith("+") ? f.phone.replace(/\D/g, "") : f.phone,
          whatsappPhone: f.whatsappPhone,
          email: f.email,
          city: f.city,
          pincode: f.pincode,
          address: f.address,
          googleMapsUrl: f.googleMapsUrl,
          lat: num(f.lat),
          lng: num(f.lng),
          googleRating: num(f.googleRating),
          googleReviewCount: num(f.googleReviewCount),
          websiteUrl: f.websiteUrl,
          instagramUrl: f.instagramUrl,
          facebookUrl: f.facebookUrl,
          youtubeUrl: f.youtubeUrl,
          linkedinUrl: f.linkedinUrl,
          twitterUrl: f.twitterUrl,
          cuisines,
          services,
          mealTypes,
          serviceAreas,
          serviceRadiusKm: num(f.serviceRadiusKm),
          minGuests: num(f.minGuests),
          maxGuests: num(f.maxGuests),
          leadTimeHours: num(f.leadTimeHours),
          fssaiNumber: f.fssaiNumber,
          teamSize: num(f.teamSize),
          yearsExperience: num(f.yearsExperience),
          packages: packages
            .filter((p) => p.name.trim() && num(p.pricePerPlate))
            .map((p) => ({ name: p.name, pricePerPlate: num(p.pricePerPlate), isVeg: p.isVeg, dishes: split(p.dishes) })),
          items: items
            .filter((i) => i.name.trim() && num(i.priceRupees))
            .map((i) => ({ name: i.name, category: i.category, priceRupees: num(i.priceRupees), isVeg: i.isVeg })),
          pastEvents: pastEvents
            .filter((e) => e.title.trim())
            .map((e) => ({ title: e.title, type: e.type, guests: num(e.guests), note: e.note })),
          photos: selectedPhotos.filter((u) => !brokenPhotos.includes(u)),
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
          Once approved, your profile goes live and your login is sent to your WhatsApp and email. You can update everything later from your dashboard.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors">
          Back to home
        </Link>
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
        <p className="text-xs text-zinc-500">Shown only once. We also sent these to {f.email} and WhatsApp {created.phone}.</p>
        <div className="flex gap-2">
          <button
            onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* ignore */ } }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy login"}
          </button>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">
            Done
          </button>
        </div>
      </div>
    );
  }

  const hasPin = f.lat !== "" && f.lng !== "" && Number(f.lat) !== 0;
  const visiblePhotos = photoOptions.filter((u) => !brokenPhotos.includes(u));
  const allCuisines = [...CUISINES, ...cuisines.filter((c) => !CUISINES.includes(c))];

  return (
    <div className={cn(
      "rounded-2xl border p-5 space-y-6",
      isAdmin
        ? "border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20"
        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sm:p-7"
    )}>
      {isAdmin && (
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Add catering team</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button>
        </div>
      )}

            {/* AI fill */}
      <PrefillSources kind="caterer" onChange={setAiText} onFill={fillWithAi} loading={aiLoading} note={aiNote} report={aiReport}>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 space-y-1.5">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Menu card or price list photos <span className="text-[11px] font-normal text-zinc-500">· gives: dishes, packages and prices</span></div>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onMenuFiles(e.target.files)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={menuImages.length >= 3}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
          >
            <ImagePlus className="h-3.5 w-3.5" /> Menu card photos ({menuImages.length}/3)
          </button>
          {menuImages.map((m, i) => (
            <span key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.preview} alt="" className="h-10 w-10 rounded-md object-cover border border-zinc-200 dark:border-zinc-700" />
              <button
                type="button"
                onClick={() => setMenuImages((p) => p.filter((_, idx) => idx !== i))}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-zinc-900 p-0.5 text-white"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        </div>
      </PrefillSources>

      <Section title="Basics">
        <Field label="Catering team name" required>
          <input className={cn(INPUT, bad("name") && BAD)} value={f.name} onChange={set("name")} placeholder="e.g. Malabar Spice Caterers" />
        </Field>
        <Field label="About" hint="shown to customers — edit freely">
          <textarea className={cn(INPUT, "resize-y")} rows={3} value={f.description} onChange={set("description")} placeholder="What you cook, who you serve, how long you've been doing it" />
        </Field>
      </Section>

      <Section title={isAdmin ? "Contact (also used to log in)" : "Contact (used to log in once approved)"}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Phone" required>
            <input className={cn(INPUT, bad("phone") && BAD)} value={f.phone} onChange={set("phone")} placeholder="98xxxxxxxx" inputMode="tel" />
          </Field>
          <Field label="WhatsApp" hint="if different">
            <input className={INPUT} value={f.whatsappPhone} onChange={set("whatsappPhone")} placeholder="98xxxxxxxx" inputMode="tel" />
          </Field>
          <Field label="Email" required>
            <input className={cn(INPUT, bad("email") && BAD)} value={f.email} onChange={set("email")} placeholder="hello@example.com" type="email" />
          </Field>
        </div>
      </Section>

      <Section title="Location & areas you serve">
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
            <Field label="Latitude"><input className={INPUT} value={f.lat} onChange={set("lat")} placeholder="11.2588" inputMode="decimal" /></Field>
            <Field label="Longitude"><input className={INPUT} value={f.lng} onChange={set("lng")} placeholder="75.7804" inputMode="decimal" /></Field>
          </div>
        )}
        <Field label="Address" required={!isAdmin}>
          <input className={cn(INPUT, bad("address") && BAD)} value={f.address} onChange={set("address")} placeholder="Kitchen / office address" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City / town" required>
            <input className={cn(INPUT, bad("city") && BAD)} value={f.city} onChange={set("city")} placeholder="Kozhikode" />
          </Field>
          <Field label="Pincode"><input className={INPUT} value={f.pincode} onChange={set("pincode")} placeholder="673001" inputMode="numeric" /></Field>
        </div>
        <Field label="Towns / districts you serve" hint="travellers search by these — type one and press Enter">
          <TagInput values={serviceAreas} onChange={(v) => { areasTouched.current = true; setServiceAreas(v); }} placeholder="e.g. Wayanad, Kalpetta" />
        </Field>
        <Field label="Will travel up to (km)" hint="optional">
          <input className={cn(INPUT, "max-w-[10rem]")} value={f.serviceRadiusKm} onChange={set("serviceRadiusKm")} placeholder="100" inputMode="numeric" />
        </Field>
      </Section>

      <Section title="Group size & timing">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Min guests"><input className={INPUT} value={f.minGuests} onChange={set("minGuests")} placeholder="20" inputMode="numeric" /></Field>
          <Field label="Max guests"><input className={INPUT} value={f.maxGuests} onChange={set("maxGuests")} placeholder="500" inputMode="numeric" /></Field>
          <div className="col-span-2">
            <Field label="Notice needed">
              <select className={INPUT} value={f.leadTimeHours} onChange={set("leadTimeHours")}>
                <option value="">Not specified</option>
                {NOTICE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                {f.leadTimeHours && !NOTICE.some(([v]) => v === f.leadTimeHours) && (
                  <option value={f.leadTimeHours}>{f.leadTimeHours} hours before</option>
                )}
              </select>
            </Field>
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-500">Meals you serve</span>
          <div className="flex flex-wrap gap-2">
            {MEALS.map(([k, l]) => <Chip key={k} on={mealTypes.includes(k)} onClick={() => toggle(mealTypes, setMealTypes, k)}>{l}</Chip>)}
          </div>
        </div>
      </Section>

      <Section title="Menu & pricing">
        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-500">Cuisines</span>
          <div className="flex flex-wrap gap-2">
            {allCuisines.map((c) => <Chip key={c} on={cuisines.includes(c)} onClick={() => toggle(cuisines, setCuisines, c)}>{c}</Chip>)}
          </div>
          <TagInput values={[]} onChange={(v) => v[0] && setCuisines((p) => (p.includes(v[0]) ? p : [...p, v[0]]))} placeholder="Add another cuisine" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-500">Packages <span className="font-normal text-zinc-400">— set menus priced per plate; travellers see “from ₹X per plate”</span></span>
          {packages.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem_auto_auto] gap-2 items-start rounded-lg border border-zinc-100 dark:border-zinc-800 p-2">
              <div className="space-y-2">
                <input className={INPUT} value={p.name} onChange={(e) => setPackages((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="e.g. Veg Sadya" />
                <input className={INPUT} value={p.dishes} onChange={(e) => setPackages((l) => l.map((x, j) => (j === i ? { ...x, dishes: e.target.value } : x)))} placeholder="Dishes, comma separated" />
              </div>
              <input className={INPUT} value={p.pricePerPlate} onChange={(e) => setPackages((l) => l.map((x, j) => (j === i ? { ...x, pricePerPlate: e.target.value } : x)))} placeholder="₹ / plate" inputMode="numeric" />
              <button type="button" onClick={() => setPackages((l) => l.map((x, j) => (j === i ? { ...x, isVeg: !x.isVeg } : x)))}
                className={cn("rounded-lg border px-2 py-2 text-xs font-semibold", p.isVeg ? "border-emerald-300 text-emerald-600" : "border-red-300 text-red-600")}>
                {p.isVeg ? "Veg" : "Non-veg"}
              </button>
              <button type="button" onClick={() => setPackages((l) => l.filter((_, j) => j !== i))} className="p-2 text-zinc-400 hover:text-red-500" aria-label="Remove package">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setPackages((l) => [...l, { name: "", pricePerPlate: "", isVeg: true, dishes: "" }])}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline">
            <Plus className="h-3.5 w-3.5" /> Add package
          </button>
        </div>

        {items.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-500">Individually priced items ({items.length})</span>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_8rem_6rem_auto_auto] gap-2 items-center">
                <input className={INPUT} value={it.name} onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Dish" />
                <input className={INPUT} value={it.category} onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))} placeholder="Category" />
                <input className={INPUT} value={it.priceRupees} onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, priceRupees: e.target.value } : x)))} placeholder="₹" inputMode="numeric" />
                <button type="button" onClick={() => setItems((l) => l.map((x, j) => (j === i ? { ...x, isVeg: !x.isVeg } : x)))}
                  className={cn("rounded-lg border px-2 py-2 text-xs font-semibold", it.isVeg ? "border-emerald-300 text-emerald-600" : "border-red-300 text-red-600")}>
                  {it.isVeg ? "Veg" : "Non-veg"}
                </button>
                <button type="button" onClick={() => setItems((l) => l.filter((_, j) => j !== i))} className="p-2 text-zinc-400 hover:text-red-500" aria-label="Remove item">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Services">
        <div className="flex flex-wrap gap-2">
          {SERVICES.map(([k, l]) => (
            <Chip key={k} on={services.includes(k)} suggestion={suggestedServices.includes(k)} onClick={() => toggle(services, setServices, k)}>{l}</Chip>
          ))}
        </div>
        {suggestedServices.length > 0 && <p className="text-xs text-zinc-400">Dashed chips are AI suggestions that weren&apos;t in your source — tap to include.</p>}
      </Section>

      <Section title="Team & credentials">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Team size"><input className={INPUT} value={f.teamSize} onChange={set("teamSize")} placeholder="25" inputMode="numeric" /></Field>
          <Field label="Years of experience"><input className={INPUT} value={f.yearsExperience} onChange={set("yearsExperience")} placeholder="10" inputMode="numeric" /></Field>
          <Field label="FSSAI licence no."><input className={INPUT} value={f.fssaiNumber} onChange={set("fssaiNumber")} placeholder="14-digit number" inputMode="numeric" /></Field>
        </div>
      </Section>

      <Section title="Work you've done">
        {pastEvents.map((e, i) => (
          <div key={i} className="grid grid-cols-[1fr_8rem_6rem_auto] gap-2 items-center">
            <input className={INPUT} value={e.title} onChange={(ev) => setPastEvents((l) => l.map((x, j) => (j === i ? { ...x, title: ev.target.value } : x)))} placeholder="e.g. Wedding reception, Kozhikode" />
            <input className={INPUT} value={e.type} onChange={(ev) => setPastEvents((l) => l.map((x, j) => (j === i ? { ...x, type: ev.target.value } : x)))} placeholder="Type" />
            <input className={INPUT} value={e.guests} onChange={(ev) => setPastEvents((l) => l.map((x, j) => (j === i ? { ...x, guests: ev.target.value } : x)))} placeholder="Guests" inputMode="numeric" />
            <button type="button" onClick={() => setPastEvents((l) => l.filter((_, j) => j !== i))} className="p-2 text-zinc-400 hover:text-red-500" aria-label="Remove event">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setPastEvents((l) => [...l, { title: "", type: "", guests: "", note: "" }])}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline">
          <Plus className="h-3.5 w-3.5" /> Add an event
        </button>
      </Section>

      <Section title="Photos">
        {visiblePhotos.length > 0 && (
          <>
            <p className="text-xs text-zinc-400">Tap to include or remove ({selectedPhotos.filter((u) => !brokenPhotos.includes(u)).length} selected).</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {visiblePhotos.map((u) => {
                const on = selectedPhotos.includes(u);
                return (
                  <button key={u} type="button"
                    onClick={() => setSelectedPhotos((p) => (on ? p.filter((x) => x !== u) : [...p, u]))}
                    className={cn("relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all", on ? "border-amber-500" : "border-transparent opacity-50 hover:opacity-80")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setBrokenPhotos((p) => [...p, u])} className="h-full w-full object-cover" />
                    {on && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="flex gap-2">
          <input className={cn(INPUT, "max-w-md")} value={photoLink} onChange={(e) => setPhotoLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPhotoLink(); } }}
            placeholder="Add a photo link (right-click an image → Copy image address)" />
          <button type="button" onClick={addPhotoLink} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 hover:text-zinc-900">Add</button>
        </div>
      </Section>

      <Section title="Online presence (optional)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Google rating"><input className={INPUT} value={f.googleRating} onChange={set("googleRating")} placeholder="4.7" inputMode="decimal" /></Field>
          <Field label="No. of reviews"><input className={INPUT} value={f.googleReviewCount} onChange={set("googleReviewCount")} placeholder="120" inputMode="numeric" /></Field>
          <Field label="Website"><input className={INPUT} value={f.websiteUrl} onChange={set("websiteUrl")} placeholder="https://…" /></Field>
          <Field label="Instagram"><input className={INPUT} value={f.instagramUrl} onChange={set("instagramUrl")} placeholder="https://instagram.com/…" /></Field>
          <Field label="Facebook"><input className={INPUT} value={f.facebookUrl} onChange={set("facebookUrl")} placeholder="https://facebook.com/…" /></Field>
          <Field label="YouTube"><input className={INPUT} value={f.youtubeUrl} onChange={set("youtubeUrl")} placeholder="https://youtube.com/@…" /></Field>
          <Field label="LinkedIn"><input className={INPUT} value={f.linkedinUrl} onChange={set("linkedinUrl")} placeholder="https://linkedin.com/company/…" /></Field>
          <Field label="Twitter / X"><input className={INPUT} value={f.twitterUrl} onChange={set("twitterUrl")} placeholder="https://x.com/…" /></Field>
        </div>
      </Section>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button onClick={submit} disabled={loading}
          className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-60">
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
