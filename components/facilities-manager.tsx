"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Loader2, ChevronDown, ToggleLeft, ToggleRight } from "lucide-react";

export type Facility = {
  id: string;
  name: string;
  description: string | null;
  amountPaise: number;
  category: string;
  icon: string;
  isCustom: boolean;
  isActive: boolean;
};

// ── Predefined amenity catalog ────────────────────────────────────────────────
const CATALOG: { icon: string; name: string; category: string; description: string }[] = [
  { icon: "ac_unit",          name: "Air Conditioning",    category: "VENUE",      description: "Full AC coverage for all guests" },
  { icon: "local_parking",    name: "Parking",             category: "PARKING",    description: "Dedicated vehicle parking area" },
  { icon: "wifi",             name: "Wi-Fi",               category: "VENUE",      description: "High-speed wireless internet" },
  { icon: "local_gas_station",name: "Generator",           category: "VENUE",      description: "Diesel generator for power backup" },
  { icon: "backup",           name: "Backup Power / UPS",  category: "VENUE",      description: "Uninterrupted power supply" },
  { icon: "tv",               name: "CCTV",                category: "VENUE",      description: "24/7 security surveillance cameras" },
  { icon: "security",         name: "Security Guard",      category: "SERVICES",   description: "On-site security personnel" },
  { icon: "kitchen",          name: "Kitchen",             category: "SERVICES",   description: "Fully equipped catering kitchen" },
  { icon: "celebration",      name: "Stage & Decor",       category: "DECORATION", description: "Elevated stage with backdrop" },
  { icon: "speaker",          name: "Sound System",        category: "AV",         description: "Professional PA with microphones" },
  { icon: "music_note",       name: "Music / DJ Setup",    category: "AV",         description: "DJ equipment and music system" },
  { icon: "event",            name: "Event Coordination",  category: "SERVICES",   description: "On-site event coordinator" },
  { icon: "child_care",       name: "Child Care",          category: "SERVICES",   description: "Dedicated kids area and supervision" },
  { icon: "videocam",         name: "Projector & Screen",  category: "AV",         description: "HD projector with large screen" },
  { icon: "park",             name: "Garden / Lawn",       category: "VENUE",      description: "Open outdoor lawn space" },
  { icon: "power",            name: "Extra Power Points",  category: "VENUE",      description: "Additional power sockets and boards" },
  { icon: "airport_shuttle",  name: "Shuttle Service",     category: "SERVICES",   description: "Guest pickup and drop service" },
  { icon: "restaurant",       name: "Catering Service",    category: "SERVICES",   description: "In-house food and beverage service" },
  { icon: "photo_camera",     name: "Photography",         category: "MEDIA",      description: "Professional event photographer" },
  { icon: "local_florist",    name: "Flower Decoration",   category: "DECORATION", description: "Floral arrangements and bouquets" },
  { icon: "cake",             name: "Cake & Sweets",       category: "SERVICES",   description: "Custom cakes and dessert table" },
  { icon: "chair",            name: "Extra Seating",       category: "VENUE",      description: "Additional chairs and tables" },
  { icon: "accessible",       name: "Accessibility",       category: "VENUE",      description: "Ramps and accessible facilities" },
  { icon: "two_wheeler",      name: "Bike Parking",        category: "PARKING",    description: "Two-wheeler parking area" },
  { icon: "local_bar",        name: "Beverages Counter",   category: "SERVICES",   description: "Soft drinks, tea and coffee station" },
];

// ── Category meta ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "ALL",        label: "All" },
  { key: "VENUE",      label: "Venue" },
  { key: "AV",         label: "Audio / Visual" },
  { key: "DECORATION", label: "Decoration" },
  { key: "MEDIA",      label: "Photography & Media" },
  { key: "PARKING",    label: "Parking" },
  { key: "SERVICES",   label: "Services" },
  { key: "GENERAL",    label: "General" },
];

const CAT_COLORS: Record<string, string> = {
  VENUE:      "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  AV:         "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  DECORATION: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400",
  MEDIA:      "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  PARKING:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  SERVICES:   "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
  GENERAL:    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

// ── Icon renderer ─────────────────────────────────────────────────────────────
function FacilityIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  return (
    <span
      className="material-symbols-rounded leading-none text-amber-600 dark:text-amber-400"
      style={{
        fontSize: size,
        fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20",
      }}
    >
      {icon}
    </span>
  );
}

// ── Edit form ─────────────────────────────────────────────────────────────────
type EditForm = { description: string; amountRupees: string };

interface Props {
  initial: Facility[];
  isEmpty: boolean;
  orgId?: string;
}

export function FacilitiesManager({ initial, orgId }: Props) {
  const [facilities, setFacilities] = useState<Facility[]>(initial);
  const [activeTab, setActiveTab] = useState("ALL");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [dropQ, setDropQ] = useState("");
  const [selected, setSelected] = useState<(typeof CATALOG)[0] | null>(null);
  const [addType, setAddType] = useState<"free" | "paid">("free");
  const [addPrice, setAddPrice] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Facility | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ description: "", amountRupees: "0" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const filtered = activeTab === "ALL" ? facilities : facilities.filter((f) => f.category === activeTab);
  const includedFacilities = filtered.filter((f) => f.amountPaise === 0);
  const addonFacilities = filtered.filter((f) => f.amountPaise > 0);

  const dropResults = useMemo(() => {
    const q = dropQ.toLowerCase().trim();
    const base = q ? CATALOG.filter((c) => c.name.toLowerCase().includes(q)) : CATALOG;
    const addedNames = new Set(facilities.map((f) => f.name.toLowerCase()));
    return base.filter((c) => !addedNames.has(c.name.toLowerCase()));
  }, [dropQ, facilities]);

  function openAdd() {
    setSelected(null);
    setDropQ("");
    setDropOpen(false);
    setAddType("free");
    setAddPrice("");
    setAddDescription("");
    setAddError("");
    setShowAdd(true);
  }

  function pickItem(item: (typeof CATALOG)[0]) {
    setSelected(item);
    setAddDescription(item.description);
    setDropQ(item.name);
    setDropOpen(false);
  }

  async function handleAdd() {
    const name = selected ? selected.name : dropQ.trim();
    if (!name) { setAddError("Choose or type an amenity name"); return; }
    const paise = addType === "paid" ? Math.round((parseFloat(addPrice) || 0) * 100) : 0;
    if (addType === "paid" && paise <= 0) { setAddError("Enter a price greater than 0"); return; }
    setAdding(true);
    setAddError("");
    const payload: Record<string, unknown> = {
      name,
      description: addDescription.trim() || null,
      amountPaise: paise,
      category: selected?.category ?? "GENERAL",
      icon: selected?.icon ?? "stars",
      isCustom: !selected,
    };
    if (orgId) payload.orgId = orgId;
    const res = await fetch("/api/owner/facilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setAdding(false);
    if (!res.ok) { const d = await res.json(); setAddError(d.error ?? "Failed"); return; }
    const created = await res.json();
    setFacilities((prev) => [...prev, created]);
    setShowAdd(false);
  }

  function openEdit(f: Facility) {
    setEditTarget(f);
    setEditForm({ description: f.description ?? "", amountRupees: String(f.amountPaise / 100) });
    setEditError("");
  }

  async function saveEdit() {
    if (!editTarget) return;
    const amount = parseFloat(editForm.amountRupees);
    if (isNaN(amount) || amount < 0) { setEditError("Enter a valid amount (0 or more)"); return; }
    setEditLoading(true);
    setEditError("");
    const res = await fetch(`/api/owner/facilities/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: editForm.description.trim() || null,
        amountPaise: Math.round(amount * 100),
      }),
    });
    setEditLoading(false);
    if (!res.ok) { const d = await res.json(); setEditError(d.error ?? "Failed"); return; }
    const updated = await res.json();
    setFacilities((prev) => prev.map((f) => f.id === updated.id ? updated : f));
    setEditTarget(null);
  }

  async function handleToggle(f: Facility) {
    const res = await fetch(`/api/owner/facilities/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !f.isActive }),
    });
    if (res.ok) {
      setFacilities((prev) => prev.map((x) => x.id === f.id ? { ...x, isActive: !x.isActive } : x));
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/owner/facilities/${deleteId}`, { method: "DELETE" });
    setDeleteLoading(false);
    if (res.ok) {
      setFacilities((prev) => prev.filter((f) => f.id !== deleteId));
      setDeleteId(null);
    }
  }

  const catLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? key;

  return (
    <div className="space-y-5">

      {/* Empty state */}
      {facilities.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 mx-auto flex items-center justify-center">
            <FacilityIcon icon="add_circle" size={28} />
          </div>
          <div>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">No amenities added yet</p>
            <p className="text-sm text-zinc-400 mt-1">Search and add what your venue offers — all are free by default.</p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors mx-auto"
          >
            <Plus className="h-4 w-4" />
            Add amenity
          </button>
        </div>
      )}

      {/* Category tabs + grid */}
      {facilities.length > 0 && (
        <>
          {/* Add button row */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 overflow-x-auto pb-1 flex-wrap">
              {CATEGORIES.filter((c) =>
                c.key === "ALL" || facilities.some((f) => f.category === c.key)
              ).map((c) => (
                <button
                  key={c.key}
                  onClick={() => setActiveTab(c.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeTab === c.key
                      ? "bg-amber-500 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {c.label}
                  {c.key !== "ALL" && (
                    <span className="ml-1 opacity-70">
                      ({facilities.filter((f) => f.category === c.key).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={openAdd}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors ml-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          {/* ── Included with booking ─────────────────────────── */}
          {includedFacilities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Included with booking
                </span>
                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
              </div>
              <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {includedFacilities.map((f) => (
                    <div
                      key={f.id}
                      className={`flex items-center gap-3 rounded-xl border bg-white dark:bg-zinc-900 px-3 py-2.5 transition-opacity ${
                        f.isActive
                          ? "border-zinc-200 dark:border-zinc-800"
                          : "border-zinc-100 dark:border-zinc-800/50 opacity-50"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                        <FacilityIcon icon={f.icon} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{f.name}</p>
                        {f.description && (
                          <p className="text-xs text-zinc-400 truncate">{f.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => handleToggle(f)} title={f.isActive ? "Deactivate" : "Activate"}>
                          {f.isActive
                            ? <ToggleRight className="h-4 w-4 text-emerald-500" />
                            : <ToggleLeft className="h-4 w-4 text-zinc-400" />}
                        </button>
                        <button onClick={() => openEdit(f)} className="p-1 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => setDeleteId(f.id)} className="p-1 text-zinc-300 hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Paid add-ons ──────────────────────────────────── */}
          {addonFacilities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Paid add-ons
                </span>
                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {addonFacilities.map((f) => (
                  <div
                    key={f.id}
                    className={`rounded-2xl border bg-white dark:bg-zinc-900 p-4 space-y-3 transition-opacity ${
                      f.isActive
                        ? "border-zinc-200 dark:border-zinc-800"
                        : "border-zinc-100 dark:border-zinc-800/50 opacity-55"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                          <FacilityIcon icon={f.icon} size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm leading-tight truncate">{f.name}</p>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${CAT_COLORS[f.category] ?? CAT_COLORS.GENERAL}`}>
                            {catLabel(f.category)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle(f)}
                        className="shrink-0 mt-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        title={f.isActive ? "Deactivate" : "Activate"}
                      >
                        {f.isActive
                          ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                          : <ToggleLeft className="h-5 w-5" />}
                      </button>
                    </div>

                    {f.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">{f.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          ₹{(f.amountPaise / 100).toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-zinc-400">add-on</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && facilities.length > 0 && (
            <p className="text-center text-sm text-zinc-400 py-6">No facilities in this category.</p>
          )}
        </>
      )}

      {/* ── Add modal ──────────────────────────────────────────── */}
      {showAdd && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Add amenity</h3>
              <button onClick={() => setShowAdd(false)}><X className="h-4 w-4 text-zinc-400" /></button>
            </div>

            {/* Dropdown picker */}
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Select amenity</label>
              <div ref={dropRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDropOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {selected && (
                      <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                        <FacilityIcon icon={selected.icon} size={14} />
                      </div>
                    )}
                    <span className={selected ? "text-zinc-800 dark:text-zinc-100 truncate" : "text-zinc-400"}>
                      {selected ? selected.name : "Choose from list…"}
                    </span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 shrink-0 transition-transform ${dropOpen ? "rotate-180" : ""}`} />
                </button>

                {dropOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                      <input
                        autoFocus
                        type="text"
                        value={dropQ}
                        onChange={(e) => setDropQ(e.target.value)}
                        placeholder="Type to filter…"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <ul className="max-h-48 overflow-y-auto py-1">
                      {dropResults.length === 0 && (
                        <li className="px-3 py-2 text-xs text-zinc-400">No more options — type above to add custom</li>
                      )}
                      {dropResults.map((item) => (
                        <li key={item.name}>
                          <button
                            type="button"
                            onClick={() => pickItem(item)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-left"
                          >
                            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                              <FacilityIcon icon={item.icon} size={15} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{item.name}</p>
                              <p className="text-[10px] text-zinc-400 truncate">{item.description}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                      {/* Custom entry if typed something not in list */}
                      {dropQ.trim() && !CATALOG.some((c) => c.name.toLowerCase() === dropQ.toLowerCase()) && (
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(null);
                              setDropOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-left"
                          >
                            <Plus className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Add &ldquo;{dropQ}&rdquo; as custom</span>
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Description <span className="font-normal">(optional)</span></label>
              <input
                type="text"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="Short note for customers…"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Free vs paid toggle */}
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-2 block">Pricing</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAddType("free")}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    addType === "free"
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  Included free
                </button>
                <button
                  type="button"
                  onClick={() => setAddType("paid")}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    addType === "paid"
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  Paid add-on
                </button>
              </div>
              {addType === "paid" && (
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
                  <input
                    autoFocus
                    type="number"
                    min={1}
                    step={100}
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                    placeholder="Amount"
                    className="w-full pl-7 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              )}
            </div>

            {addError && <p className="text-xs text-red-500">{addError}</p>}

            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
            >
              {adding && <Loader2 className="h-4 w-4 animate-spin" />}
              Add amenity
            </button>
          </div>
        </div>
      )}

      {/* ── Edit modal ─────────────────────────────────────────── */}
      {editTarget && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                <FacilityIcon icon={editTarget.icon} size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">{editTarget.name}</h3>
                <p className="text-xs text-zinc-400">Edit details</p>
              </div>
              <button onClick={() => setEditTarget(null)}><X className="h-4 w-4 text-zinc-400" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Description <span className="font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Short description…"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">
                  Price (₹) <span className="font-normal">— leave 0 to keep it free</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={editForm.amountRupees}
                    onChange={(e) => setEditForm((p) => ({ ...p, amountRupees: e.target.value }))}
                    className="w-full pl-7 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>

            {editError && <p className="text-xs text-red-500">{editError}</p>}

            <button
              onClick={saveEdit}
              disabled={editLoading}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
            >
              {editLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirm ─────────────────────────────────────── */}
      {deleteId && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Remove amenity?</h3>
            <p className="text-sm text-zinc-500">This will permanently remove it from your venue listing.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm disabled:opacity-40 transition-colors"
              >
                {deleteLoading ? "Removing…" : "Remove"}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
