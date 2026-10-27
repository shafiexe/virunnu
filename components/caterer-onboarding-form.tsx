"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KERALA_CITIES = ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Kannur", "Kottayam", "Malappuram"];
const CUISINE_OPTIONS = ["Kerala Sadhya", "North Indian", "South Indian", "Chinese", "Mughlai", "Continental", "Snacks & Tea", "Custom Menu"];

export function CatererOnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    businessName: "",
    contactPhone: "",
    city: "",
    description: "",
    cuisines: [] as string[],
  });

  function toggle(cuisine: string) {
    setForm((f) => ({
      ...f,
      cuisines: f.cuisines.includes(cuisine)
        ? f.cuisines.filter((c) => c !== cuisine)
        : [...f.cuisines, cuisine],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/caterer/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push("/caterer/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="space-y-1">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          placeholder="e.g. Royal Kerala Catering"
          value={form.businessName}
          onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
          maxLength={80}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="contactPhone">Contact phone</Label>
        <Input
          id="contactPhone"
          type="tel"
          placeholder="9876543210"
          value={form.contactPhone}
          onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
          maxLength={10}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="city">City</Label>
        <select
          id="city"
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          required
        >
          <option value="">Select city</option>
          {KERALA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">About your catering service</Label>
        <textarea
          id="description"
          placeholder="Years of experience, specialities, notable events…"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          maxLength={500}
          rows={3}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div className="space-y-2">
        <Label>Cuisines offered</Label>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map((c) => {
            const selected = form.cuisines.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  selected
                    ? "bg-amber-500 text-white border-amber-500"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading || !form.businessName || !form.city || !form.contactPhone}
        className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Submitting…" : "Submit for approval →"}
      </button>
      <p className="text-xs text-zinc-400 text-center">Your listing will go live once approved by our team.</p>
    </form>
  );
}
