"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, UtensilsCrossed, X, Check,
  CheckCircle, ExternalLink, Settings, Phone, Mail, Link2, Globe } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Caterer = {
  id: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  description: string | null;
  cuisines: string[];
  whatsappNumber: string | null;
  email: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  websiteUrl: string | null;
  services: string[];
  photos: string[];
  approved: boolean;
  disabled: boolean;
  createdAt: Date;
};

const ALL_SERVICES = [
  { key: "FOOD", label: "Food & Catering" },
  { key: "DECORATION", label: "Decoration" },
  { key: "SERVING_STAFF", label: "Serving Staff" },
  { key: "TENT_SHAMIANA", label: "Tent / Shamiana" },
  { key: "SOUND_LIGHT", label: "Sound & Lighting" },
  { key: "TRANSPORT", label: "Transport" },
];

const EMPTY_FORM = {
  name: "", phone: "", city: "", state: "Kerala", description: "", cuisines: "",
  whatsappNumber: "", email: "", instagramUrl: "", facebookUrl: "", youtubeUrl: "", websiteUrl: "",
};

export function AdminCaterersClient({ initialCaterers }: { initialCaterers: Caterer[] }) {
  const [caterers, setCaterers] = useState(initialCaterers);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [services, setServices] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingActing, setDeletingActing] = useState(false);

  const filtered = caterers.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.city.toLowerCase().includes(q);
  });

  function openEdit(c: Caterer) {
    setForm({
      name: c.name, phone: c.phone, city: c.city, state: c.state,
      description: c.description ?? "", cuisines: c.cuisines.join(", "),
      whatsappNumber: c.whatsappNumber ?? "", email: c.email ?? "",
      instagramUrl: c.instagramUrl ?? "", facebookUrl: c.facebookUrl ?? "",
      youtubeUrl: c.youtubeUrl ?? "", websiteUrl: c.websiteUrl ?? "",
    });
    setServices(c.services ?? []);
    setPhotos(c.photos ?? []);
    setPhotoInput("");
    setEditId(c.id);
    setError("");
  }

  function closeForm() {
    setShowAdd(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setServices([]);
    setPhotos([]);
    setPhotoInput("");
    setError("");
  }

  function toggleService(key: string) {
    setServices((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]);
  }

  function addPhoto() {
    const url = photoInput.trim();
    if (!url || !url.startsWith("http")) return;
    setPhotos((prev) => [...prev, url]);
    setPhotoInput("");
  }

  function formToPayload() {
    return {
      name: form.name,
      phone: form.phone,
      city: form.city,
      state: form.state,
      description: form.description || null,
      cuisines: form.cuisines.split(",").map((s) => s.trim()).filter(Boolean),
      whatsappNumber: form.whatsappNumber || null,
      email: form.email || null,
      instagramUrl: form.instagramUrl || null,
      facebookUrl: form.facebookUrl || null,
      youtubeUrl: form.youtubeUrl || null,
      websiteUrl: form.websiteUrl || null,
      services,
      photos,
    };
  }

  async function handleAdd() {
    if (formLoading) return;
    setError("");
    setFormLoading(true);
    try {
      const res = await fetch("/api/admin/caterers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload()),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      closeForm();
      window.location.reload();
    } finally {
      setFormLoading(false);
    }
  }

  async function handleEdit() {
    if (!editId || formLoading) return;
    setError("");
    setFormLoading(true);
    try {
      const res = await fetch(`/api/admin/caterers/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload()),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      closeForm();
      window.location.reload();
    } finally {
      setFormLoading(false);
    }
  }

  async function handleToggle(catererId: string) {
    if (togglingId) return;
    setTogglingId(catererId);
    try {
      const res = await fetch(`/api/admin/caterers/${catererId}/toggle`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setCaterers((prev) => prev.map((c) => c.id === catererId ? { ...c, disabled: data.disabled } : c));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleApprove(catererId: string) {
    if (approvingId) return;
    setApprovingId(catererId);
    try {
      const res = await fetch(`/api/admin/caterers/${catererId}/approve`, { method: "POST" });
      if (res.ok) setCaterers((prev) => prev.map((c) => c.id === catererId ? { ...c, approved: true } : c));
    } finally {
      setApprovingId(null);
    }
  }

  async function handleDelete(catererId: string) {
    if (deletingActing) return;
    setDeletingActing(true);
    try {
      const res = await fetch(`/api/admin/caterers/${catererId}`, { method: "DELETE" });
      if (res.ok) { setCaterers((prev) => prev.filter((c) => c.id !== catererId)); setDeleteId(null); }
    } finally {
      setDeletingActing(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300";
  const labelCls = "text-xs font-medium text-zinc-500 flex items-center gap-1";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Caterers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{caterers.length} registered</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setForm(EMPTY_FORM); setServices([]); setPhotos([]); setError(""); }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add caterer
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, phone or city…"
        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
      />

      {(showAdd || editId) && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{showAdd ? "Add caterer" : "Edit caterer"}</h2>
            <button onClick={closeForm} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button>
          </div>

          {/* Basic info */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Basic info</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([["Name", "name", "Catering service name"], ["Phone", "phone", "+91…"], ["City", "city", "Kozhikode"],
                ["State", "state", "Kerala"]] as const).map(([label, field, placeholder]) => (
                <label key={field} className="space-y-1">
                  <span className={labelCls}>{label}</span>
                  <input value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} placeholder={placeholder} className={inputCls} />
                </label>
              ))}
              <label className="space-y-1 sm:col-span-2">
                <span className={labelCls}>Cuisines (comma-separated)</span>
                <input value={form.cuisines} onChange={(e) => setForm((f) => ({ ...f, cuisines: e.target.value }))} placeholder="Kerala, Mughlai, Chinese" className={inputCls} />
              </label>
            </div>
            <label className="block space-y-1 mt-3">
              <span className={labelCls}>Description</span>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description…" rows={2} className={cn(inputCls, "resize-none")} />
            </label>
          </div>

          {/* Contact & Social */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Contact & Social</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className={labelCls}><Phone className="h-3 w-3" /> WhatsApp number</span>
                <input value={form.whatsappNumber} onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))} placeholder="+91XXXXXXXXXX" className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className={labelCls}><Mail className="h-3 w-3" /> Email</span>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="contact@example.com" className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className={labelCls}><Link2 className="h-3 w-3" /> Instagram</span>
                <input value={form.instagramUrl} onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))} placeholder="https://instagram.com/…" className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className={labelCls}><Link2 className="h-3 w-3" /> Facebook</span>
                <input value={form.facebookUrl} onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))} placeholder="https://facebook.com/…" className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className={labelCls}><Link2 className="h-3 w-3" /> YouTube</span>
                <input value={form.youtubeUrl} onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/@…" className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className={labelCls}><Globe className="h-3 w-3" /> Website</span>
                <input value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://yourwebsite.com" className={inputCls} />
              </label>
            </div>
          </div>

          {/* Services */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Services offered</p>
            <div className="flex flex-wrap gap-2">
              {ALL_SERVICES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleService(s.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    services.includes(s.key)
                      ? "bg-amber-500 text-white border-amber-500"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Photos</p>
            <div className="flex gap-2">
              <input
                value={photoInput}
                onChange={(e) => setPhotoInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPhoto()}
                placeholder="Paste image URL and press Enter…"
                className={cn(inputCls, "flex-1")}
              />
              <button type="button" onClick={addPhoto} className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">
                Add
              </button>
            </div>
            {photos.length > 0 && (
              <div className="mt-2 space-y-1">
                {photos.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 rounded-lg px-3 py-1.5 border border-zinc-200 dark:border-zinc-700">
                    <span className="flex-1 truncate">{url}</span>
                    <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={showAdd ? handleAdd : handleEdit}
              disabled={formLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" />
              {formLoading ? "Saving…" : showAdd ? "Create" : "Save changes"}
            </button>
            <button onClick={closeForm} className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center text-zinc-400">
            {search ? "No caterers match your search." : "No caterers yet."}
          </div>
        )}
        {filtered.map((c) => {
          const isDeleting = deleteId === c.id;
          return (
            <div
              key={c.id}
              className={cn(
                "rounded-2xl border bg-white dark:bg-zinc-900 p-4",
                c.disabled ? "border-zinc-300 dark:border-zinc-700 opacity-60" : "border-zinc-200 dark:border-zinc-800"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">{c.name}</span>
                      {!c.approved && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">PENDING</span>
                      )}
                      {c.disabled && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">DISABLED</span>
                      )}
                    </div>
                    <div className="text-sm text-zinc-500">{c.phone} · {c.city}, {c.state}</div>
                    {c.cuisines.length > 0 && (
                      <div className="text-xs text-zinc-400">{c.cuisines.join(", ")}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isDeleting ? (
                    <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-1.5">
                      <span className="text-xs text-red-700 dark:text-red-400 font-medium">Delete?</span>
                      <button onClick={() => handleDelete(c.id)} disabled={deletingActing} className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50">Yes</button>
                      <button onClick={() => setDeleteId(null)} className="text-xs text-zinc-400 hover:text-zinc-600">No</button>
                    </div>
                  ) : (
                    <>
                      {!c.approved && (
                        <button
                          onClick={() => handleApprove(c.id)}
                          disabled={!!approvingId}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          title="Approve"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </button>
                      )}
                      <Link
                        href={`/admin/caterers/${c.id}`}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                        title="Manage caterer"
                      >
                        <Settings className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/caterers/${c.id}`}
                        target="_blank"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                        title="View public profile"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleToggle(c.id)}
                        disabled={togglingId === c.id}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors disabled:opacity-40",
                          c.disabled
                            ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            : "text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                        )}
                        title={c.disabled ? "Enable" : "Disable"}
                      >
                        {c.disabled ? <ToggleRight className="h-4.5 w-4.5" /> : <ToggleLeft className="h-4.5 w-4.5" />}
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(c.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
