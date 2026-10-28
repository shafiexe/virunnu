"use client";

import { useState } from "react";
import { Send, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

export function CatererEnquiryForm({
  catererId,
  catererName,
  contactPhone,
}: {
  catererId: string;
  catererName: string;
  contactPhone: string;
}) {
  const [open, setOpen] = useState(false);
  const [minDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [form, setForm] = useState({ name: "", phone: "", eventDate: "", guestCount: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/caterers/${catererId}/enquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          eventDate: form.eventDate || undefined,
          guestCount: form.guestCount ? parseInt(form.guestCount) : undefined,
          message: form.message || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to send"); return; }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-5 text-center space-y-2">
        <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
        <p className="font-semibold text-emerald-800 dark:text-emerald-300">Enquiry sent!</p>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          {catererName} will contact you soon. You can also reach them directly at{" "}
          <a href={`tel:${contactPhone}`} className="font-semibold hover:underline">{contactPhone}</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">Send an enquiry</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>

      {open && (
        <form onSubmit={submit} className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 space-y-3">
          <p className="text-xs text-zinc-500">Fill in the details and {catererName} will get in touch with you.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-500">Your name *</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                required
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-500">Phone number *</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                placeholder="9876543210"
                required
                maxLength={10}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-500">Event date <span className="font-normal text-zinc-400">(optional)</span></span>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                min={minDate}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-500">Expected guests <span className="font-normal text-zinc-400">(optional)</span></span>
              <input
                type="number"
                min={1}
                value={form.guestCount}
                onChange={(e) => setForm((f) => ({ ...f, guestCount: e.target.value }))}
                placeholder="e.g. 200"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-500">Message <span className="font-normal text-zinc-400">(optional)</span></span>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={2}
              placeholder="Event type, special requirements…"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !form.name || form.phone.length < 10}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send enquiry →"}
          </button>
        </form>
      )}
    </div>
  );
}
