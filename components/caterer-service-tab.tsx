"use client";

import { useState } from "react";
import { Check, Plus, X, Link2, Globe, Phone, Mail, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { MenuManager } from "@/components/menu-manager";
import { cn } from "@/lib/utils";

type MenuItem = {
  id: string; name: string; category: string | null; description: string | null;
  priceRupees: number; isVeg: boolean; isSpecial: boolean;
};

type Caterer = {
  id: string; name: string; phone: string; city: string; state: string;
  description: string | null; cuisines: string[];
  whatsappNumber: string | null; email: string | null;
  instagramUrl: string | null; facebookUrl: string | null;
  youtubeUrl: string | null; websiteUrl: string | null;
  services: string[]; photos: string[];
  menuItems: MenuItem[];
};

const ALL_SERVICES = [
  { key: "FOOD", label: "Food & Catering", icon: "🍽️" },
  { key: "DECORATION", label: "Decoration", icon: "🌸" },
  { key: "SERVING_STAFF", label: "Serving Staff", icon: "🧑‍🍳" },
  { key: "TENT_SHAMIANA", label: "Tent / Shamiana", icon: "⛺" },
  { key: "SOUND_LIGHT", label: "Sound & Lighting", icon: "🎤" },
  { key: "TRANSPORT", label: "Transport", icon: "🚐" },
];

const CUISINE_OPTIONS = ["Kerala Sadhya", "North Indian", "South Indian", "Chinese", "Mughlai", "Continental", "Snacks & Tea", "Custom Menu"];

export function CatererServiceTab({ caterer, adminCatererId }: { caterer: Caterer; adminCatererId?: string }) {
  const [form, setForm] = useState({
    whatsappNumber: caterer.whatsappNumber ?? "",
    email: caterer.email ?? "",
    instagramUrl: caterer.instagramUrl ?? "",
    facebookUrl: caterer.facebookUrl ?? "",
    youtubeUrl: caterer.youtubeUrl ?? "",
    websiteUrl: caterer.websiteUrl ?? "",
    description: caterer.description ?? "",
    cuisines: caterer.cuisines,
    services: caterer.services,
    photos: caterer.photos,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoInput, setPhotoInput] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiUrl, setAiUrl] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ menuItems?: Array<{ name: string; category: string; description?: string; priceRupees: number; isVeg: boolean; isSpecial: boolean }> } | null>(null);
  const [aiError, setAiError] = useState("");
  const [addingMenus, setAddingMenus] = useState(false);

  function toggleService(key: string) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(key)
        ? f.services.filter((s) => s !== key)
        : [...f.services, key],
    }));
  }

  function toggleCuisine(c: string) {
    setForm((f) => ({
      ...f,
      cuisines: f.cuisines.includes(c)
        ? f.cuisines.filter((x) => x !== c)
        : [...f.cuisines, c],
    }));
  }

  function addPhoto() {
    const url = photoInput.trim();
    if (!url) return;
    if (!url.startsWith("http")) { setPhotoError("Enter a valid URL starting with http"); return; }
    setPhotoError("");
    setForm((f) => ({ ...f, photos: [...f.photos, url] }));
    setPhotoInput("");
  }

  function removePhoto(idx: number) {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  }

  async function aiExtract() {
    if (aiLoading || (!aiText.trim() && !aiUrl.trim())) return;
    setAiError("");
    setAiResult(null);
    setAiLoading(true);
    try {
      const res = await fetch("/api/caterer/ai-prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: aiText, url: aiUrl.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error ?? "Failed"); return; }
      const e = data.extracted;
      // Prefill form fields from AI extraction
      setForm((f) => ({
        ...f,
        whatsappNumber: e.whatsappNumber ?? f.whatsappNumber,
        email: e.email ?? f.email,
        instagramUrl: e.instagramUrl ?? f.instagramUrl,
        facebookUrl: e.facebookUrl ?? f.facebookUrl,
        youtubeUrl: e.youtubeUrl ?? f.youtubeUrl,
        websiteUrl: e.websiteUrl ?? f.websiteUrl,
        description: e.description ?? f.description,
        cuisines: e.cuisines?.length ? e.cuisines : f.cuisines,
        services: e.services?.length ? e.services : f.services,
        photos: f.photos,
      }));
      setAiResult(e);
    } finally {
      setAiLoading(false);
    }
  }

  async function addAiMenuItems() {
    if (!aiResult?.menuItems?.length || addingMenus) return;
    setAddingMenus(true);
    try {
      await fetch("/api/caterer/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: aiResult.menuItems,
          ...(adminCatererId ? { catererId: adminCatererId } : {}),
        }),
      });
      setAiResult((prev) => prev ? { ...prev, menuItems: [] } : null);
    } finally {
      setAddingMenus(false);
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const url = adminCatererId
        ? `/api/admin/caterers/${adminCatererId}`
        : "/api/caterer/profile";
      await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Prefill */}
      <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20 overflow-hidden">
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">AI Prefill</span>
            <span className="text-xs text-zinc-500">Paste raw details — AI will extract and fill all fields</span>
          </div>
          {aiOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </button>

        {aiOpen && (
          <div className="border-t border-violet-100 dark:border-violet-900 px-5 py-4 space-y-3">
            {/* URL input */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Google Maps / Website URL <span className="font-normal text-zinc-400">(optional)</span></label>
              <input
                value={aiUrl}
                onChange={(e) => setAiUrl(e.target.value)}
                placeholder="https://maps.google.com/… or caterer website URL"
                className="w-full rounded-xl border border-violet-200 dark:border-violet-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-zinc-400"
              />
              <p className="text-[11px] text-zinc-400">Paste a Google Maps place URL, Instagram page, Facebook page, or the caterer&apos;s own website. The server will fetch and read it. You&apos;ll verify and save the result — just a quick way to avoid manual typing.</p>
            </div>

            {/* Text paste */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Or paste raw text <span className="font-normal text-zinc-400">(WhatsApp message, bio, any text)</span></label>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                rows={4}
                placeholder={"e.g. \"We are Kahani Caterers from Malappuram. Kerala Sadhya specialists. WhatsApp: 9886167582. Sadhya ₹150/plate. Instagram: @kahani_caters_events\""}
                className="w-full rounded-xl border border-violet-200 dark:border-violet-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-zinc-400"
              />
            </div>

            {aiError && <p className="text-xs text-red-500">{aiError}</p>}
            <button
              type="button"
              onClick={aiExtract}
              disabled={aiLoading || (!aiText.trim() && !aiUrl.trim())}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiLoading ? "Fetching & extracting…" : "Extract & Prefill"}
            </button>

            {aiResult && (
              <div className="rounded-xl bg-white dark:bg-zinc-900 border border-violet-100 dark:border-violet-800 p-4 space-y-2">
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">✓ Fields prefilled from AI extraction</p>
                {aiResult.menuItems && aiResult.menuItems.length > 0 && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {aiResult.menuItems.length} menu item{aiResult.menuItems.length !== 1 ? "s" : ""} found —
                      <span className="font-medium"> {aiResult.menuItems.slice(0, 3).map((m) => m.name).join(", ")}{aiResult.menuItems.length > 3 ? `…` : ""}</span>
                    </p>
                    <button
                      type="button"
                      onClick={addAiMenuItems}
                      disabled={addingMenus}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {addingMenus ? "Adding…" : "Add to menu"}
                    </button>
                  </div>
                )}
                {aiResult.menuItems?.length === 0 && (
                  <p className="text-xs text-zinc-400">Menu items added successfully — refresh to see them.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contact & Social */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Contact & Social</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Phone className="h-3 w-3" /> WhatsApp number</span>
            <input
              value={form.whatsappNumber}
              onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
              placeholder="+91XXXXXXXXXX (if different from login)"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Link2 className="h-3 w-3" /> Instagram</span>
            <input
              value={form.instagramUrl}
              onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
              placeholder="https://instagram.com/yourpage"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Link2 className="h-3 w-3" /> Facebook</span>
            <input
              value={form.facebookUrl}
              onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))}
              placeholder="https://facebook.com/yourpage"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Link2 className="h-3 w-3" /> YouTube</span>
            <input
              value={form.youtubeUrl}
              onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
              placeholder="https://youtube.com/@yourchannel"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Globe className="h-3 w-3" /> Website</span>
            <input
              value={form.websiteUrl}
              onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              placeholder="https://yourwebsite.com"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>
        </div>
      </div>

      {/* About & Cuisines */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">About your service</h2>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-zinc-500">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="Years of experience, specialties, notable events…"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </label>
        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-500">Cuisines offered</span>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCuisine(c)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  form.cuisines.includes(c)
                    ? "bg-amber-500 text-white border-amber-500"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Services offered</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_SERVICES.map((s) => {
            const on = form.services.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleService(s.key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors text-left",
                  on
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-200"
                )}
              >
                <span className="text-base">{s.icon}</span>
                <span className="leading-tight">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Photos */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Photos</h2>
        <div className="flex gap-2">
          <input
            value={photoInput}
            onChange={(e) => setPhotoInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPhoto()}
            placeholder="Paste image URL and press Enter…"
            className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button
            type="button"
            onClick={addPhoto}
            className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {photoError && <p className="text-xs text-red-500">{photoError}</p>}
        {form.photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {form.photos.map((url, idx) => (
              <div key={idx} className="relative group aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {form.photos.length === 0 && (
          <p className="text-xs text-zinc-400">No photos yet — paste an image URL above to add one.</p>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {saved ? <><Check className="h-4 w-4" /> Saved!</> : saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Menu — only shown in caterer self-service mode, not in admin mode */}
      {!adminCatererId && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Menu items</h2>
          <MenuManager initialItems={caterer.menuItems} />
        </div>
      )}
    </div>
  );
}
