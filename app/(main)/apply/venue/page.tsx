"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle } from "lucide-react";
import { VENUE_TYPE_OPTIONS, type VenueTypeKey } from "@/lib/venue-types";

const FIELD_CLS = "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300";
const LABEL_CLS = "block text-xs font-medium text-zinc-500 mb-1";

export default function ApplyVenuePage() {
  const router = useRouter();
  const [venueType, setVenueType] = useState<VenueTypeKey>("CONVENTION_CENTER");
  const [form, setForm] = useState({ orgName: "", phone: "", whatsappPhone: "", email: "", address: "", city: "", website: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/apply/venue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, venueType, phone: form.phone.replace(/\D/g, "") }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Application Submitted!</h1>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Thank you for registering your convention center on Virunnu. Our team will review your application
            and get back to you within 1–2 business days. You will receive your login credentials via
            WhatsApp once approved.
          </p>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto">
            <Building2 className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Add Your Convention Center</h1>
          <p className="text-sm text-zinc-500">
            Fill in your details below. Our admin team will review your request and send
            your login credentials within 1–2 business days.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          {/* Venue type chips */}
          <div>
            <label className={LABEL_CLS}>Type of space *</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {VENUE_TYPE_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setVenueType(t.key)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    venueType === t.key
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300 dark:hover:border-amber-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Name *</label>
            <input value={form.orgName} onChange={set("orgName")} placeholder="e.g. Zawaj Convention Centre" required minLength={2} className={FIELD_CLS} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Phone number *</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-sm">+91</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  placeholder="9876543210"
                  required
                  inputMode="numeric"
                  minLength={10}
                  maxLength={10}
                  className={`${FIELD_CLS} rounded-l-none`}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>WhatsApp (if different)</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-sm">+91</span>
                <input
                  value={form.whatsappPhone}
                  onChange={(e) => setForm((f) => ({ ...f, whatsappPhone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  placeholder="9876543210"
                  inputMode="numeric"
                  maxLength={10}
                  className={`${FIELD_CLS} rounded-l-none`}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Email address <span className="text-zinc-400">(optional — needed for email notifications)</span></label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={FIELD_CLS} />
          </div>

          <div>
            <label className={LABEL_CLS}>Address *</label>
            <textarea value={form.address} onChange={set("address")} placeholder="Full address of the convention center" required minLength={5} rows={2} className={`${FIELD_CLS} resize-none`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>City *</label>
              <input value={form.city} onChange={set("city")} placeholder="Kozhikode" required className={FIELD_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Website (optional)</label>
              <input type="url" value={form.website} onChange={set("website")} placeholder="https://yoursite.com" className={FIELD_CLS} />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Submit Application →"}
          </button>

          <p className="text-xs text-zinc-400 text-center">
            Already have an account?{" "}
            <a href="/login" className="text-amber-600 hover:underline font-medium">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}
