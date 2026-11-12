"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { AddonRow, addonLine } from "@/components/addon-row";
import { cn } from "@/lib/utils";
import { addonDetail } from "@/lib/addons";

export type BookingAddonItem = {
  id: string; name: string; pricePaise: number; unit: "FIXED" | "HOUR"; quantity: number; unitPricePaise: number | null;
};
type VenueAddon = { id: string; name: string; pricePaise: number; unit: "FIXED" | "HOUR"; active: boolean };

type CustomLine = { name: string; priceRupees: number; unit: "FIXED" | "HOUR"; quantity: number; saveToVenue: boolean };

const QUICK = [
  { name: "Air conditioning", unit: "HOUR" as const },
  { name: "Cleaning & maintenance", unit: "FIXED" as const },
  { name: "Security", unit: "FIXED" as const },
  { name: "Generator backup", unit: "HOUR" as const },
];

const FIELD =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";

// Lets the centre add, remove or change the hours of extras on one booking when the customer asks.
export function BookingAddonsDialog({
  open, onClose, bookingId, venueId, totalPaise, advancePaise, addons, onSuccess,
}: {
  open: boolean; onClose: () => void;
  bookingId: string; venueId: string; totalPaise: number; advancePaise: number | null;
  addons: BookingAddonItem[]; onSuccess: () => void;
}) {
  const setOpen = (v: boolean) => { if (!v) onClose(); };
  const [venueAddons, setVenueAddons] = useState<VenueAddon[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [remove, setRemove] = useState<string[]>([]);
  const [hours, setHours] = useState<Record<string, number>>({});
  const [adds, setAdds] = useState<Record<string, number>>({});
  const [custom, setCustom] = useState<CustomLine[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", price: "", unit: "FIXED" as "FIXED" | "HOUR", hours: "1", save: true });

  const currentPaise = addons.reduce((s, a) => s + a.pricePaise, 0);
  const hallPaise = totalPaise - currentPaise;

  useEffect(() => {
    if (!open) return;
    setRemove([]);
    setAdds({});
    setCustom([]);
    setFormOpen(false);
    setHours(Object.fromEntries(addons.map((a) => [a.id, a.quantity])));
    setError("");
    setLoading(true);
    fetch(`/api/owner/venues/${venueId}/addons`)
      .then((r) => r.json().catch(() => ({})))
      .then((data) => setVenueAddons(((data.addons ?? []) as VenueAddon[]).filter((a) => a.active)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, venueId]);

  const keptPaise = addons
    .filter((a) => !remove.includes(a.id))
    .reduce((s, a) => s + (a.unit === "HOUR" ? Math.round((a.unitPricePaise ?? a.pricePaise) * (hours[a.id] ?? a.quantity)) : a.pricePaise), 0);
  const addedPaise = venueAddons.filter((a) => a.id in adds).reduce((s, a) => s + addonLine(a.unit, a.pricePaise, adds[a.id]), 0);
  const customPaise = custom.reduce((s, c) => s + addonLine(c.unit, c.priceRupees * 100, c.quantity), 0);
  const newTotal = hallPaise + keptPaise + addedPaise + customPaise;

  function addCustom() {
    const price = Number(draft.price);
    if (!draft.name.trim()) { setError("Give the service a name"); return; }
    if (draft.price.trim() === "" || !Number.isInteger(price) || price < 0) { setError("Enter the price in whole rupees"); return; }
    const hrs = Math.min(48, Math.max(0.5, Math.round((parseFloat(draft.hours) || 1) * 2) / 2));
    setError("");
    setCustom((c) => [...c, { name: draft.name.trim(), priceRupees: price, unit: draft.unit, quantity: draft.unit === "HOUR" ? hrs : 1, saveToVenue: draft.save }]);
    setDraft({ name: "", price: "", unit: "FIXED", hours: "1", save: draft.save });
    setFormOpen(false);
  }
  const unlisted = venueAddons.filter((a) => !addons.some((b) => b.name === a.name));

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/owner/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addAddons: Object.entries(adds).map(([id, quantity]) => ({ id, quantity })),
          updateAddons: addons.filter((a) => a.unit === "HOUR" && hours[a.id] && hours[a.id] !== a.quantity).map((a) => ({ id: a.id, quantity: hours[a.id] })),
          removeAddonIds: remove,
          customAddons: custom.length ? custom : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      setOpen(false);
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  const rupees = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Add-on services</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Changes update this booking&apos;s total and invoice.</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-2 max-h-[70vh] overflow-y-auto">
              {addons.length === 0 && unlisted.length === 0 && custom.length === 0 && !loading && !formOpen && (
                <p className="text-sm text-zinc-500">No add-ons on this booking yet. Add a service below, for example AC or security.</p>
              )}

              {addons.map((a) => (
                <AddonRow
                  key={a.id}
                  name={a.name} unit={a.unit} unitPaise={a.unitPricePaise ?? a.pricePaise}
                  qty={hours[a.id] ?? a.quantity}
                  on={!remove.includes(a.id)}
                  sign=""
                  onToggle={() => setRemove((r) => (r.includes(a.id) ? r.filter((id) => id !== a.id) : [...r, a.id]))}
                  onQty={(n) => setHours((h) => ({ ...h, [a.id]: n }))}
                />
              ))}

              {loading && <p className="text-xs text-zinc-400 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Loading add-ons…</p>}

              {unlisted.map((a) => (
                <AddonRow
                  key={a.id}
                  name={a.name} unit={a.unit} unitPaise={a.pricePaise}
                  qty={adds[a.id] ?? 1}
                  on={a.id in adds}
                  sign="+"
                  onToggle={() => setAdds((m) => { const n = { ...m }; if (a.id in n) delete n[a.id]; else n[a.id] = 1; return n; })}
                  onQty={(q) => setAdds((m) => ({ ...m, [a.id]: q }))}
                />
              ))}

              {custom.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    {c.name}
                    {c.unit === "HOUR" && <span className="text-xs text-zinc-500"> · {c.quantity} {c.quantity === 1 ? "hr" : "hrs"} × ₹{c.priceRupees.toLocaleString("en-IN")}</span>}
                  </span>
                  <span className="flex items-center gap-2 shrink-0 text-zinc-500">
                    +₹{(addonLine(c.unit, c.priceRupees * 100, c.quantity) / 100).toLocaleString("en-IN")}
                    <button type="button" onClick={() => setCustom((x) => x.filter((_, j) => j !== i))} aria-label="Remove" className="text-zinc-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                  </span>
                </div>
              ))}

              {formOpen ? (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 space-y-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK.map((q) => (
                      <button
                        key={q.name}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, name: q.name, unit: q.unit }))}
                        className={cn(
                          "px-2.5 py-1 rounded-full border text-xs font-medium transition-colors",
                          draft.name === q.name ? "bg-amber-500 border-amber-500 text-white" : "border-dashed border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        )}
                      >
                        {q.name}
                      </button>
                    ))}
                  </div>
                  <input className={FIELD} placeholder="Service name, e.g. Air conditioning" maxLength={60} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                  <div className="grid grid-cols-[1fr_1fr] gap-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">₹</span>
                      <input className={cn(FIELD, "pl-6")} inputMode="numeric" placeholder={draft.unit === "HOUR" ? "Rate per hour" : "Price"} value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value.replace(/\D/g, "") }))} />
                    </div>
                    <select className={FIELD} value={draft.unit} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value as "FIXED" | "HOUR" }))}>
                      <option value="FIXED">per booking</option>
                      <option value="HOUR">per hour</option>
                    </select>
                  </div>
                  {draft.unit === "HOUR" && (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      Hours used
                      <input type="number" min={0.5} max={48} step={0.5} className={cn(FIELD, "w-20")} value={draft.hours} onChange={(e) => setDraft((d) => ({ ...d, hours: e.target.value }))} />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
                    <input type="checkbox" checked={draft.save} onChange={(e) => setDraft((d) => ({ ...d, save: e.target.checked }))} className="h-4 w-4 accent-amber-500" />
                    Save to my add-on list for next time
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={addCustom} className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold">Add to booking</button>
                    <button type="button" onClick={() => { setFormOpen(false); setError(""); }} className="px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800">Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => { setFormOpen(true); setError(""); }} className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:underline pt-1">
                  <Plus className="h-4 w-4" /> Add a service
                </button>
              )}

              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm space-y-1 mt-3">
                <div className="flex justify-between"><span className="text-zinc-500">Hall</span><span>{rupees(hallPaise)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Add-ons</span><span>{rupees(keptPaise + addedPaise + customPaise)}</span></div>
                <div className="flex justify-between font-semibold text-zinc-900 dark:text-zinc-50 border-t border-zinc-200 dark:border-zinc-700 pt-1">
                  <span>Booking total</span><span>{rupees(newTotal)}</span>
                </div>
                {advancePaise ? (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Paid so far {rupees(advancePaise)}</span>
                    <span className="text-red-500 font-medium">Due {rupees(Math.max(0, newTotal - advancePaise))}</span>
                  </div>
                ) : null}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="flex gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Short text for a list row, e.g. "AC 1.5 hrs · Security"
export function addonSummary(addons: BookingAddonItem[]) {
  return addons.map((a) => (a.unit === "HOUR" ? `${a.name} ${addonDetail(a)?.split(" ×")[0]}` : a.name)).join(" · ");
}
