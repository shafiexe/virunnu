"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, CheckCircle } from "lucide-react";

const FIELD_CLS = "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300";
const LABEL_CLS = "block text-xs font-medium text-zinc-500 mb-1";

export default function ApplyCatererPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", cuisines: "", website: "" });
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
    const res = await fetch("/api/apply/caterer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, phone: form.phone.replace(/\D/g, "") }),
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
            Thank you for registering your catering service on Virunnu. Our team will review your application
            and get back to you within 1–2 business days. You will receive your login credentials via
            WhatsApp and email once approved.
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
          <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mx-auto">
            <UtensilsCrossed className="h-7 w-7 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Add Your Catering Service</h1>
          <p className="text-sm text-zinc-500">
            Fill in your details below. Our admin team will review your request and send
            your login credentials within 1–2 business days.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <div>
            <label className={LABEL_CLS}>Catering service name *</label>
            <input value={form.name} onChange={set("name")} placeholder="e.g. Al Baraka Catering" required minLength={2} className={FIELD_CLS} />
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
              <label className={LABEL_CLS}>Email address *</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required className={FIELD_CLS} />
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Address *</label>
            <textarea value={form.address} onChange={set("address")} placeholder="Full address of your catering base" required minLength={5} rows={2} className={`${FIELD_CLS} resize-none`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>City *</label>
              <input value={form.city} onChange={set("city")} placeholder="Kozhikode" required className={FIELD_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Cuisines offered</label>
              <input value={form.cuisines} onChange={set("cuisines")} placeholder="Kerala, Mughlai, Chinese" className={FIELD_CLS} />
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Website (optional)</label>
            <input type="url" value={form.website} onChange={set("website")} placeholder="https://yoursite.com" className={FIELD_CLS} />
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
