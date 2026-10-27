"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Building2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type OwnerUser = { id: string; name: string | null; phone: string };
type Venue = { id: string; name: string; approved: boolean };
type Org = { id: string; name: string; disabled: boolean; users: OwnerUser[]; venues: Venue[]; createdAt: Date };

const EMPTY_FORM = { ownerName: "", ownerPhone: "" };

export function AdminOwnersClient({ initialOrgs }: { initialOrgs: Org[] }) {
  const [orgs, setOrgs] = useState(initialOrgs);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();
  const router = useRouter();

  const filtered = orgs.filter((o) => {
    const q = search.toLowerCase();
    const venueName = o.venues[0]?.name ?? "";
    return (
      venueName.toLowerCase().includes(q) ||
      o.users.some((u) => u.name?.toLowerCase().includes(q) || u.phone.includes(q))
    );
  });

  function openEdit(org: Org) {
    const owner = org.users[0];
    setForm({ ownerName: owner?.name ?? "", ownerPhone: owner?.phone ?? "" });
    setEditId(org.id);
    setError("");
  }

  function closeForm() {
    setShowAdd(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function handleAdd() {
    setError("");
    const res = await fetch("/api/admin/owners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // orgName derived from ownerName on the backend
      body: JSON.stringify({ orgName: form.ownerName, ownerName: form.ownerName, ownerPhone: form.ownerPhone }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    closeForm();
    window.location.reload();
  }

  async function handleEdit() {
    if (!editId) return;
    setError("");
    const res = await fetch(`/api/admin/owners/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerName: form.ownerName || undefined,
        ownerPhone: form.ownerPhone || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    closeForm();
    window.location.reload();
  }

  async function handleToggle(orgId: string) {
    const res = await fetch(`/api/admin/owners/${orgId}/toggle`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setOrgs((prev) => prev.map((o) => o.id === orgId ? { ...o, disabled: data.disabled } : o));
    }
  }

  async function handleDelete(orgId: string) {
    const res = await fetch(`/api/admin/owners/${orgId}`, { method: "DELETE" });
    if (res.ok) {
      setOrgs((prev) => prev.filter((o) => o.id !== orgId));
      setDeleteId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Convention Owners</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{orgs.length} registered</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setForm(EMPTY_FORM); setError(""); }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add owner
        </button>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by venue name, owner name or phone…"
        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
      />

      {/* Add / Edit form */}
      {(showAdd || editId) && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{showAdd ? "Add new owner" : "Edit owner"}</h2>
            <button onClick={closeForm} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-500">Owner name</span>
              <input
                value={form.ownerName}
                onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                placeholder="Full name"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-500">Owner phone</span>
              <input
                value={form.ownerPhone}
                onChange={(e) => setForm((f) => ({ ...f, ownerPhone: e.target.value }))}
                placeholder="+91…"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </label>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={showAdd ? handleAdd : handleEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
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

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center text-zinc-400">
            {search ? "No owners match your search." : "No owners yet."}
          </div>
        )}
        {filtered.map((org) => {
          const owner = org.users[0];
          const venue = org.venues[0];
          const liveVenues = org.venues.filter((v) => v.approved).length;
          const isDeleting = deleteId === org.id;

          return (
            <div
              key={org.id}
              className={cn(
                "rounded-2xl border bg-white dark:bg-zinc-900 p-4",
                org.disabled
                  ? "border-zinc-300 dark:border-zinc-700 opacity-60"
                  : "border-zinc-200 dark:border-zinc-800"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {venue?.name ?? owner?.name ?? "—"}
                      </span>
                      {org.disabled && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                          DISABLED
                        </span>
                      )}
                    </div>
                    {owner && (
                      <div className="text-sm text-zinc-500">
                        {owner.name ?? "—"} · {owner.phone}
                      </div>
                    )}
                    {org.venues.length > 0 && (
                      <div className="text-xs text-zinc-400">
                        {org.venues.length} venue{org.venues.length !== 1 ? "s" : ""}{liveVenues > 0 ? ` · ${liveVenues} live` : " · pending approval"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isDeleting ? (
                    <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-1.5">
                      <span className="text-xs text-red-700 dark:text-red-400 font-medium">Delete?</span>
                      <button onClick={() => handleDelete(org.id)} className="text-xs font-bold text-red-600 hover:underline">Yes</button>
                      <button onClick={() => setDeleteId(null)} className="text-xs text-zinc-400 hover:text-zinc-600">No</button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggle(org.id)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          org.disabled
                            ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            : "text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                        )}
                        title={org.disabled ? "Enable owner" : "Disable owner"}
                      >
                        {org.disabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                      <button
                        onClick={() => openEdit(org)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(org.id)}
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
