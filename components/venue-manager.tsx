"use client";

import { useState, useRef } from "react";
import {
  Plus, Pencil, X, ChevronDown, ChevronUp,
  Building2, Users, IndianRupee, Clock, Camera, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SlotTemplate = { id: string; name: string; startTime: string; endTime: string };
type HallPhoto = { id: string; url: string; caption: string | null };
type Hall = {
  id: string;
  name: string;
  capacity: number;
  pricePerSlot: number;
  minimumAdvancePaise: number;
  requireFullPayment: boolean;
  amenities: string[];
  description?: string | null;
  slotTemplates: SlotTemplate[];
  photos: HallPhoto[];
};
type Venue = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  approved: boolean;
  googleMapsUrl: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  googleReviewUrl: string | null;
  websiteUrl: string | null;
  phone: string | null;
  email: string | null;
  lat: number;
  lng: number;
  halls: Hall[];
};

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

const AMENITIES = [
  "AC", "Projector", "Stage", "Parking", "Catering Kitchen",
  "Sound System", "Generator Backup", "Dressing Room", "CCTV", "Restrooms",
];

function TemplateTag({
  tpl, onDelete,
}: { tpl: SlotTemplate; onDelete: (id: string) => Promise<string | null> }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    const err = await onDelete(tpl.id);
    setLoading(false);
    if (err) { setError(err); setConfirm(false); }
  }

  return (
    <span className={cn(
      "inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
      confirm
        ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
        : error
        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
    )}>
      <Clock className="h-3 w-3 shrink-0 opacity-60" />
      {tpl.name} · {tpl.startTime}–{tpl.endTime}
      {error && <span className="text-[10px]">— {error}</span>}
      {confirm ? (
        <>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="ml-1 text-red-600 font-semibold hover:underline text-[10px] disabled:opacity-50"
          >
            {loading ? "…" : "Delete"}
          </button>
          <button onClick={() => { setConfirm(false); setError(""); }} className="text-zinc-400">
            <X className="h-3 w-3" />
          </button>
        </>
      ) : (
        <button onClick={() => { setConfirm(true); setError(""); }} className="ml-0.5 text-zinc-400 hover:text-red-500 transition-colors">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function AddTemplateForm({ hallId, onAdded }: { hallId: string; onAdded: (tpl: SlotTemplate) => void }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", startTime: "09:00", endTime: "13:00" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/halls/${hallId}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      onAdded(data.template);
      setForm({ name: "", startTime: "09:00", endTime: "13:00" });
      setShow(false);
    } finally {
      setLoading(false);
    }
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
      >
        <Plus className="h-3 w-3" /> Add slot
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 mt-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Slot name</label>
        <input
          type="text"
          placeholder="e.g. Evening"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-28 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          required
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Start</label>
        <input
          type="time"
          value={form.startTime}
          onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
          className="w-28 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">End</label>
        <input
          type="time"
          value={form.endTime}
          onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
          className="w-28 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          required
        />
      </div>
      <div className="flex gap-1.5">
        <button type="submit" disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50">
          {loading ? "…" : "Add"}
        </button>
        <button type="button" onClick={() => setShow(false)}
          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
          Cancel
        </button>
      </div>
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
    </form>
  );
}

function HallCard({
  hall, venueId, onUpdated,
}: {
  hall: Hall;
  venueId: string;
  onUpdated: (updated: Hall) => void;
}) {
  const [templates, setTemplates] = useState<SlotTemplate[]>(hall.slotTemplates);
  const [photos, setPhotos] = useState<HallPhoto[]>(hall.photos ?? []);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: hall.name,
    capacity: String(hall.capacity),
    priceRupees: String(Math.round(hall.pricePerSlot / 100)),
    minimumAdvanceRupees: String(Math.round(hall.minimumAdvancePaise / 100)),
    requireFullPayment: hall.requireFullPayment,
    description: hall.description ?? "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadPhoto(file: File) {
    setUploadingPhoto(true);
    setPhotoError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/owner/halls/${hall.id}/photos`, { method: "POST", body: fd });
    setUploadingPhoto(false);
    if (!res.ok) {
      const d = await res.json();
      setPhotoError(d.error ?? "Upload failed");
      return;
    }
    const photo = await res.json();
    setPhotos((prev) => [...prev, photo]);
  }

  async function uploadPhotoUrl() {
    const urls = photoUrl
      .split(/https:\/\//)
      .filter(Boolean)
      .map((s) => `https://${s.trim()}`)
      .filter((u) => u.length > 10);
    if (!urls.length) { setPhotoError("No valid URLs found"); return; }
    setUploadingPhoto(true);
    setPhotoError("");
    const added: HallPhoto[] = [];
    for (const url of urls) {
      const res = await fetch(`/api/owner/halls/${hall.id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const photo = await res.json();
        added.push(photo);
      }
    }
    setUploadingPhoto(false);
    if (!added.length) { setPhotoError("Failed to add photos"); return; }
    setPhotos((prev) => [...prev, ...added]);
    setPhotoUrl("");
    setShowUrlInput(false);
  }

  async function deletePhoto(photoId: string) {
    const res = await fetch(`/api/owner/halls/${hall.id}/photos/${photoId}`, { method: "DELETE" });
    if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");
    setEditLoading(true);
    try {
      const res = await fetch(`/api/owner/halls/${hall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          capacity: parseInt(editForm.capacity),
          priceRupees: parseInt(editForm.priceRupees),
          minimumAdvanceRupees: parseInt(editForm.minimumAdvanceRupees) || 500,
          requireFullPayment: editForm.requireFullPayment,
          description: editForm.description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error ?? "Error"); return; }
      onUpdated({ ...hall, ...data.hall, minimumAdvancePaise: data.hall.minimumAdvancePaise, requireFullPayment: data.hall.requireFullPayment, slotTemplates: templates, photos });
      setEditing(false);
    } finally {
      setEditLoading(false);
    }
  }

  async function deleteTemplate(templateId: string): Promise<string | null> {
    const res = await fetch(`/api/owner/halls/${hall.id}/templates/${templateId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Could not delete slot";
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Hidden file input — always mounted so ref is valid in both view and edit mode */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadPhoto(file);
          e.target.value = "";
        }}
      />

      {/* Lightbox — uses fixed positioning so works from anywhere in the tree */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightboxIdx].url}
              alt={photos[lightboxIdx].caption ?? "Hall photo"}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            {photos[lightboxIdx].caption && (
              <p className="text-center text-white/80 text-sm mt-2">{photos[lightboxIdx].caption}</p>
            )}
            <button
              onClick={() => setLightboxIdx(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIdx((i) => (i! - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 text-lg font-bold"
                >‹</button>
                <button
                  onClick={() => setLightboxIdx((i) => (i! + 1) % photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 text-lg font-bold"
                >›</button>
              </>
            )}
          </div>
        </div>
      )}

      {editing ? (
        <form onSubmit={saveEdit} className="p-5 space-y-4">
          <div className="flex items-center justify-end">
            <button type="button" onClick={() => setEditing(false)} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Capacity</label>
              <input
                type="number"
                min={1}
                value={editForm.capacity}
                onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Price per slot (₹)</label>
              <input
                type="number"
                min={1}
                value={editForm.priceRupees}
                onChange={(e) => setEditForm((f) => ({ ...f, priceRupees: e.target.value }))}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Minimum advance (₹)</label>
              <input
                type="number"
                min={100}
                step={100}
                value={editForm.minimumAdvanceRupees}
                onChange={(e) => setEditForm((f) => ({ ...f, minimumAdvanceRupees: e.target.value }))}
                placeholder="500"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <p className="text-[10px] text-zinc-400">Minimum amount customer must pay online to confirm booking</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Payment requirement</label>
              <button
                type="button"
                onClick={() => setEditForm((f) => ({ ...f, requireFullPayment: !f.requireFullPayment }))}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors",
                  editForm.requireFullPayment
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                    : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                )}
              >
                <span>{editForm.requireFullPayment ? "Full payment required online" : "Advance only (rest in cash)"}</span>
                <span className={cn(
                  "w-9 h-5 rounded-full relative transition-colors",
                  editForm.requireFullPayment ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-600"
                )}>
                  <span className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                    editForm.requireFullPayment ? "left-4" : "left-0.5"
                  )} />
                </span>
              </button>
              <p className="text-[10px] text-zinc-400">
                {editForm.requireFullPayment ? "Customer must pay full slot price online" : "Customer pays advance online, balance in cash"}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Description</label>
            <textarea
              rows={3}
              placeholder="Describe the hall — layout, special features, ideal events…"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>
          {/* Photos in edit mode */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Photos</label>
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <div key={p.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.caption ?? "Hall photo"} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => deletePhoto(p.id)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:border-amber-400 hover:text-amber-500 disabled:opacity-50 transition-colors shrink-0"
              >
                {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                {!uploadingPhoto && <span className="text-[10px] font-medium">Upload</span>}
              </button>
            </div>
            {/* URL photo input */}
            {showUrlInput ? (
              <div className="space-y-1.5">
                <textarea
                  autoFocus
                  rows={3}
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setShowUrlInput(false); setPhotoUrl(""); } }}
                  placeholder={"Paste one or more photo URLs, one per line\nhttps://lh3.googleusercontent.com/…\nhttps://lh3.googleusercontent.com/…"}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none font-mono"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={uploadPhotoUrl} disabled={uploadingPhoto}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50">
                    {uploadingPhoto ? "Adding…" : "Add photos"}
                  </button>
                  <button type="button" onClick={() => { setShowUrlInput(false); setPhotoUrl(""); }}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowUrlInput(true)}
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                🔗 Add from URL (Google Maps photo)
              </button>
            )}
            {photoError && <p className="text-xs text-red-500">{photoError}</p>}
          </div>
          {editError && <p className="text-sm text-red-500">{editError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={editLoading}
              className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50">
              {editLoading ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {hall.capacity} guests</span>
                <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> {(hall.pricePerSlot / 100).toLocaleString("en-IN")} per slot</span>
              </div>
            </div>
            <button
              onClick={() => { setEditing(true); setEditForm({ name: hall.name, capacity: String(hall.capacity), priceRupees: String(Math.round(hall.pricePerSlot / 100)), minimumAdvanceRupees: String(Math.round(hall.minimumAdvancePaise / 100)), requireFullPayment: hall.requireFullPayment, description: hall.description ?? "" }); setPhotoError(""); }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
              title="Edit details"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Description */}
          {hall.description && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{hall.description}</p>
          )}

          {/* Photo strip */}
          {photos.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setLightboxIdx(idx)}
                    className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:opacity-90 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.caption ?? "Hall photo"} className="w-full h-full object-cover" />
                  </button>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  title="Upload from device"
                  className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex flex-col items-center justify-center text-zinc-400 hover:border-amber-400 hover:text-amber-500 disabled:opacity-50 transition-colors"
                >
                  {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                {!showUrlInput && (
                  <button
                    onClick={() => setShowUrlInput(true)}
                    title="Add from URL"
                    className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex flex-col items-center justify-center text-zinc-400 hover:border-amber-400 hover:text-amber-500 transition-colors text-lg"
                  >
                    🔗
                  </button>
                )}
              </div>
              {/* URL input in view mode strip */}
              {showUrlInput && (
                <div className="space-y-1.5">
                  <textarea
                    autoFocus
                    rows={3}
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { setShowUrlInput(false); setPhotoUrl(""); } }}
                    placeholder={"Paste one or more photo URLs, one per line\nhttps://lh3.googleusercontent.com/…"}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none font-mono"
                  />
                  <div className="flex gap-2">
                    <button onClick={uploadPhotoUrl} disabled={uploadingPhoto}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50">
                      {uploadingPhoto ? "Adding…" : "Add photos"}
                    </button>
                    <button onClick={() => { setShowUrlInput(false); setPhotoUrl(""); }}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {photos.length === 0 && !showUrlInput && (
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
              >
                {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                {uploadingPhoto ? "Uploading…" : "Upload photo"}
              </button>
              <span className="text-zinc-300 dark:text-zinc-600 text-xs">or</span>
              <button onClick={() => setShowUrlInput(true)}
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                🔗 Add from URL
              </button>
            </div>
          )}
          {/* URL input in view mode (no photos yet) */}
          {!editing && showUrlInput && (
            <div className="mt-2 space-y-1.5">
              <textarea
                autoFocus
                rows={3}
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setShowUrlInput(false); setPhotoUrl(""); } }}
                placeholder={"Paste one or more photo URLs, one per line\nhttps://lh3.googleusercontent.com/…"}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none font-mono"
              />
              <div className="flex gap-2">
                <button onClick={uploadPhotoUrl} disabled={uploadingPhoto}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50">
                  {uploadingPhoto ? "Adding…" : "Add photos"}
                </button>
                <button onClick={() => { setShowUrlInput(false); setPhotoUrl(""); }}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}

          {/* Slot templates */}
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">Slots</div>
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <TemplateTag key={tpl.id} tpl={tpl} onDelete={deleteTemplate} />
              ))}
              <AddTemplateForm
                hallId={hall.id}
                onAdded={(tpl) => setTemplates((prev) => [...prev, tpl])}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type VenueForm = {
  name: string;
  address: string;
  googleMapsUrl: string;
  lat: string;
  lng: string;
  googleRating: string;
  googleReviewCount: string;
  googleReviewUrl: string;
  websiteUrl: string;
  phone: string;
  email: string;
};

function venueToForm(v: Venue): VenueForm {
  return {
    name: v.name,
    address: v.address,
    googleMapsUrl: v.googleMapsUrl ?? "",
    lat: v.lat ? String(v.lat) : "",
    lng: v.lng ? String(v.lng) : "",
    googleRating: v.googleRating ? String(v.googleRating) : "",
    googleReviewCount: v.googleReviewCount ? String(v.googleReviewCount) : "",
    googleReviewUrl: v.googleReviewUrl ?? "",
    websiteUrl: v.websiteUrl ?? "",
    phone: v.phone ?? "",
    email: v.email ?? "",
  };
}

function VenueCard({ venue: initialVenue }: { venue: Venue }) {
  const [venue, setVenue] = useState(initialVenue);
  const [halls, setHalls] = useState<Hall[]>(initialVenue.halls);
  const [collapsed, setCollapsed] = useState(false);
  const [editingVenue, setEditingVenue] = useState(false);
  const [venueForm, setVenueForm] = useState<VenueForm>(() => venueToForm(initialVenue));
  const [venueLoading, setVenueLoading] = useState(false);
  const [venueError, setVenueError] = useState("");

  function onHallUpdated(updated: Hall) {
    setHalls((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
  }

  function handleVenueMapsUrl(url: string) {
    const coords = parseMapsCoords(url);
    setVenueForm((f) => ({
      ...f,
      googleMapsUrl: url,
      lat: coords ? coords.lat.toFixed(6) : f.lat,
      lng: coords ? coords.lng.toFixed(6) : f.lng,
    }));
  }

  async function saveVenue(e: React.FormEvent) {
    e.preventDefault();
    setVenueLoading(true);
    setVenueError("");
    try {
      const body: Record<string, unknown> = {
        name: venueForm.name.trim(),
        address: venueForm.address.trim(),
        lat: venueForm.lat ? parseFloat(venueForm.lat) : undefined,
        lng: venueForm.lng ? parseFloat(venueForm.lng) : undefined,
        googleMapsUrl: venueForm.googleMapsUrl.trim() || null,
        googleRating: venueForm.googleRating ? parseFloat(venueForm.googleRating) : null,
        googleReviewCount: venueForm.googleReviewCount ? parseInt(venueForm.googleReviewCount) : null,
        googleReviewUrl: venueForm.googleReviewUrl.trim() || null,
        websiteUrl: venueForm.websiteUrl.trim() || null,
        phone: venueForm.phone.trim() || null,
        email: venueForm.email.trim() || null,
      };
      const res = await fetch(`/api/owner/venues/${venue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setVenueError((data as { error?: string }).error ?? "Error saving"); return; }
      setVenue((v) => ({ ...v, ...(data as { venue: Venue }).venue }));
      setEditingVenue(false);
    } finally {
      setVenueLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Venue header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
          onClick={() => setCollapsed((c) => !c)}
        >
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{venue.name}</div>
            <div className="text-xs text-zinc-500 truncate">
              {venue.address}
            </div>
            {venue.googleRating && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-amber-400 text-[10px]">★</span>
                <span className="text-[10px] text-zinc-500">
                  {venue.googleRating.toFixed(1)}
                  {venue.googleReviewCount ? ` · ${venue.googleReviewCount} reviews` : ""}
                </span>
                {venue.googleMapsUrl && (
                  <a href={venue.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-amber-500 hover:underline ml-1">
                    View on Google ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
            venue.approved
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          )}>
            {venue.approved ? "Listed" : "Pending"}
          </span>
          <button
            onClick={() => { setEditingVenue((v) => !v); setVenueForm(venueToForm(venue)); setVenueError(""); setCollapsed(false); }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
            title="Edit venue info"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {collapsed ? <ChevronDown className="h-4 w-4 text-zinc-400" /> : <ChevronUp className="h-4 w-4 text-zinc-400" />}
          </button>
        </div>
      </div>

      {/* Venue info edit form */}
      {editingVenue && (
        <form onSubmit={saveVenue} className="mx-5 mb-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/10 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Edit venue info</span>
            <button type="button" onClick={() => setEditingVenue(false)} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Convention center name</label>
            <input
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
              value={venueForm.name}
              onChange={(e) => setVenueForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ZAWAJ Convention Centre"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Address</label>
            <input
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
              value={venueForm.address}
              onChange={(e) => setVenueForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Full address"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Google Maps link
              {venueForm.googleMapsUrl && parseMapsCoords(venueForm.googleMapsUrl) && (
                <span className="ml-2 normal-case font-normal text-emerald-600 dark:text-emerald-400">
                  ✓ location parsed
                </span>
              )}
            </label>
            <input
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
              value={venueForm.googleMapsUrl}
              onChange={(e) => handleVenueMapsUrl(e.target.value)}
              placeholder="https://www.google.com/maps/place/..."
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Rating</label>
              <input type="number" step="0.1" min="0" max="5"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                value={venueForm.googleRating}
                onChange={(e) => setVenueForm((f) => ({ ...f, googleRating: e.target.value }))}
                placeholder="4.1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Reviews</label>
              <input type="number" min="0"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                value={venueForm.googleReviewCount}
                onChange={(e) => setVenueForm((f) => ({ ...f, googleReviewCount: e.target.value }))}
                placeholder="16"
              />
            </div>
            <div className="space-y-1" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Google review link</label>
            <input
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
              value={venueForm.googleReviewUrl}
              onChange={(e) => setVenueForm((f) => ({ ...f, googleReviewUrl: e.target.value }))}
              placeholder="https://search.google.com/local/writereview?placeid=..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Website</label>
            <input
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
              value={venueForm.websiteUrl}
              onChange={(e) => setVenueForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              placeholder="https://zawajconvention.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Phone</label>
              <input
                type="tel"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                value={venueForm.phone}
                onChange={(e) => setVenueForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                value={venueForm.email}
                onChange={(e) => setVenueForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="info@zawaj.com"
              />
            </div>
          </div>

          {venueError && <p className="text-xs text-red-500">{venueError}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={venueLoading}
              className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50">
              {venueLoading ? "Saving…" : "Save venue info"}
            </button>
            <button type="button" onClick={() => setEditingVenue(false)}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Hall list */}
      {!collapsed && (
        <div className="px-5 pb-5 space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
          {halls.map((hall) => (
            <HallCard
              key={hall.id}
              hall={hall}
              venueId={venue.id}
              onUpdated={onHallUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function VenueManager({ venues }: { venues: Venue[] }) {
  if (venues.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center">
        <Building2 className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-500">No venues yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {venues.map((venue) => (
        <VenueCard key={venue.id} venue={venue} />
      ))}
    </div>
  );
}
