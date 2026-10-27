"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, UtensilsCrossed, X, Check, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Caterer = {
  id: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  description: string | null;
  cuisines: string[];
  approved: boolean;
  disabled: boolean;
  createdAt: Date;
};

const EMPTY_FORM = { name: "", phone: "", city: "", state: "Kerala", description: "", cuisines: "" };

export function AdminCaterersClient({ initialCaterers }: { initialCaterers: Caterer[] }) {
  const [caterers, setCaterers] = useState(initialCaterers);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = caterers.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.city.toLowerCase().includes(q);
  });

  function openEdit(c: Caterer) {
    setForm({ name: c.name, phone: c.phone, city: c.city, state: c.state, description: c.description ?? "", cuisines: c.cuisines.join(", ") });
    setEditId(c.id);
    setError("");
  }

  function closeForm() {
    setShowAdd(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function formToPayload() {
    return {
      name: form.name,
      phone: form.phone,
      city: form.city,
      state: form.state,
      description: form.description || null,
      cuisines: form.cuisines.split(",").map((s) => s.trim()).filter(Boolean),
    };
  }

  async function handleAdd() {
    setError("");
    const res = await fetch("/api/admin/caterers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formToPayload()),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    closeForm();
    window.location.reload();
  }

  async function handleEdit() {
    if (!editId) return;
    setError("");
    const res = await fetch(`/api/admin/caterers/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formToPayload()),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    closeForm();
    window.location.reload();
  }

  async function handleToggle(catererId: string) {
    const res = await fetch(`/api/admin/caterers/${catererId}/toggle`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setCaterers((prev) => prev.map((c) => c.id === catererId ? { ...c, disabled: data.disabled } : c));
    }
  }

  async function handleApprove(catererId: string) {
    const res = await fetch(`/api/admin/caterers/${catererId}/approve`, { method: "POST" });
    if (res.ok) {
      setCaterers((prev) => prev.map((c) => c.id === catererId ? { ...c, approved: true } : c));
    }
  }

  async function handleDelete(catererId: string) {
    const res = await fetch(`/api/admin/caterers/${catererId}`, { method: "DELETE" });
    if (res.ok) {
      setCaterers((prev) => prev.filter((c) => c.id !== catererId));
      setDeleteId(null);
    }
  }

  const FormField = ({ label, field, placeholder, textarea }: { label: string; field: keyof typeof EMPTY_FORM; placeholder?: string; textarea?: boolean }) => (
    <label className="space-y-1">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {textarea ? (
        <textarea
          value={form[field]}
          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          placeholder={placeholder}
          rows={2}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
        />
      ) : (
        <input
          value={form[field]}
          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          placeholder={placeholder}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      )}
    </label>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Caterers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{caterers.length} registered</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setForm(EMPTY_FORM); setError(""); }}
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
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{showAdd ? "Add caterer" : "Edit caterer"}</h2>
            <button onClick={closeForm} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Name" field="name" placeholder="Catering service name" />
            <FormField label="Phone" field="phone" placeholder="+91…" />
            <FormField label="City" field="city" placeholder="Kozhikode" />
            <FormField label="State" field="state" placeholder="Kerala" />
            <FormField label="Cuisines (comma-separated)" field="cuisines" placeholder="Kerala, Mughlai, Chinese" />
          </div>
          <FormField label="Description" field="description" placeholder="Brief description…" textarea />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={showAdd ? handleAdd : handleEdit}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" />
              {showAdd ? "Create" : "Save changes"}
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
                      <button onClick={() => handleDelete(c.id)} className="text-xs font-bold text-red-600 hover:underline">Yes</button>
                      <button onClick={() => setDeleteId(null)} className="text-xs text-zinc-400 hover:text-zinc-600">No</button>
                    </div>
                  ) : (
                    <>
                      {!c.approved && (
                        <button
                          onClick={() => handleApprove(c.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-2 py-1.5 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleToggle(c.id)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
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
