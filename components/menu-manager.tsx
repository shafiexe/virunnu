"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star, Leaf } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type MenuItem = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  priceRupees: number;
  isVeg: boolean;
  isSpecial: boolean;
};

const CATEGORIES = [
  "Kerala Sadhya",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks & Tea",
  "Beverages",
  "Desserts & Sweets",
  "Starters",
  "Rice & Biryani",
  "Breads",
  "Special Package",
];

const EMPTY_FORM = {
  name: "",
  category: "",
  description: "",
  priceRupees: "",
  isVeg: true,
  isSpecial: false,
};

export function MenuManager({ initialItems }: { initialItems: MenuItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const price = parseInt(form.priceRupees);
    if (!form.name || !form.category || isNaN(price) || price < 1) {
      setError("Name, category, and a valid price are required.");
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/caterer/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          description: form.description || undefined,
          priceRupees: price,
          isVeg: form.isVeg,
          isSpecial: form.isSpecial,
        }),
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); setError(data.error ?? "Something went wrong."); return; }
      const data = await res.json();
      setItems((prev) => [...prev, data.item]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/caterer/menu/${id}`, { method: "DELETE" });
      if (res.ok) { setItems((prev) => prev.filter((i) => i.id !== id)); router.refresh(); }
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = CATEGORIES.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    const cat_items = items.filter((i) => i.category === cat);
    if (cat_items.length) acc[cat] = cat_items;
    return acc;
  }, {});
  const uncategorised = items.filter((i) => !i.category || !CATEGORIES.includes(i.category));
  if (uncategorised.length) grouped["Other"] = uncategorised;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-zinc-500">{items.length} item{items.length !== 1 ? "s" : ""}</span>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm((v) => !v); setError(""); }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add item
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addItem} className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/10 p-5 space-y-4">
          <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">New menu item</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="item-name">Item name *</Label>
              <Input
                id="item-name"
                placeholder="e.g. Chicken Biryani"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={80}
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="item-category">Category *</Label>
              <select
                id="item-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="item-price">Price (₹) *</Label>
              <Input
                id="item-price"
                type="number"
                min={1}
                max={100000}
                placeholder="e.g. 250"
                value={form.priceRupees}
                onChange={(e) => setForm((f) => ({ ...f, priceRupees: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="item-desc">Description <span className="text-zinc-400 font-normal">(optional)</span></Label>
              <Input
                id="item-desc"
                placeholder="Ingredients, portion size, allergens…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                maxLength={300}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isVeg: !f.isVeg }))}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                form.isVeg
                  ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                  : "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800"
              )}
            >
              <Leaf className="h-3 w-3" />
              {form.isVeg ? "Veg" : "Non-veg"}
            </button>

            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isSpecial: !f.isSpecial }))}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                form.isSpecial
                  ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                  : "border-zinc-200 text-zinc-500 dark:border-zinc-700"
              )}
            >
              <Star className="h-3 w-3" />
              {form.isSpecial ? "Chef's special" : "Mark as special"}
            </button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "Adding…" : "Add to menu"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(""); }}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Item list grouped by category */}
      {items.length === 0 && !showForm ? (
        <div className="p-10 text-center">
          <div className="text-3xl mb-3">🍽️</div>
          <p className="text-zinc-500 text-sm">No menu items yet.</p>
          <p className="text-zinc-400 text-xs mt-1">Click &quot;Add item&quot; to build your menu.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 px-1">{cat}</div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                {catItems.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-block w-3 h-3 rounded-sm border-2 shrink-0",
                          item.isVeg ? "border-emerald-500" : "border-red-500"
                        )}>
                          <span className={cn(
                            "block w-1.5 h-1.5 rounded-full m-px",
                            item.isVeg ? "bg-emerald-500" : "bg-red-500"
                          )} />
                        </span>
                        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate">{item.name}</span>
                        {item.isSpecial && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">
                            <Star className="h-2.5 w-2.5" /> Special
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-zinc-500 mt-0.5 ml-5 line-clamp-1">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm">
                        ₹{item.priceRupees.toLocaleString("en-IN")}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        disabled={deletingId === item.id}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-40"
                        aria-label="Delete item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
