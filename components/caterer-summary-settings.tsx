"use client";

import { useState } from "react";
import { Check, Eye, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";
const VIA = [["WHATSAPP", "WhatsApp"], ["EMAIL", "Email"], ["BOTH", "Both"]] as const;

export function CatererSummarySettings({ initial }: { initial: { enabled: boolean; via: string; email: string | null; phone: string } }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [via, setVia] = useState(initial.via);
  const [email, setEmail] = useState(initial.email ?? "");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");

  async function save(patch: { enabled?: boolean; via?: string; email?: string }) {
    setBusy("save"); setError(""); setNote("");
    try {
      const res = await fetch("/api/caterer/summary-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return false; }
      setNote("Saved"); return true;
    } finally { setBusy(""); }
  }

  async function show() {
    setBusy("preview"); setError("");
    try {
      const res = await fetch("/api/caterer/summary"); const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError("Could not make the preview"); return; }
      setPreview(preview ? "" : data.text);
    } finally { setBusy(""); }
  }

  async function sendNow() {
    setBusy("send"); setError(""); setNote("");
    try {
      // make sure the latest choices are saved first
      if (!(await save({ via, email }))) return;
      const res = await fetch("/api/caterer/summary", { method: "POST" }); const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not send"); return; }
      const parts = [data.whatsapp && `WhatsApp: ${data.whatsapp}`, data.email && `Email: ${data.email}`].filter(Boolean);
      setNote(parts.join(" · ") || "Nothing to send");
    } finally { setBusy(""); }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Daily summary</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Every night at 9:30 PM: money in and out, tomorrow&apos;s functions, who owes you, and what needs a reply.</p>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={enabled} onChange={async (e) => { const v = e.target.checked; setEnabled(v); if (!(await save({ enabled: v, via, email }))) setEnabled(!v); }} />
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Send me the daily summary</span>
      </label>
      <div className="space-y-3">
        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
          {VIA.map(([k, label]) => (
            <button key={k} type="button" onClick={() => { setVia(k); save({ via: k }); }} className={cn("px-3.5 py-1.5 rounded-lg text-xs font-semibold", via === k ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500")}>{label}</button>
          ))}
        </div>
        {(via === "WHATSAPP" || via === "BOTH") && <p className="text-xs text-zinc-500">WhatsApp goes to {initial.phone}.</p>}
        {(via === "EMAIL" || via === "BOTH") && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-500">Email address</span>
            <input className={INPUT} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => save({ email })} />
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={show} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50">
          {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} {preview ? "Hide preview" : "Preview today"}
        </button>
        <button type="button" onClick={sendNow} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50">
          {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send it to me now
        </button>
        {note && <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" />{note}</span>}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {preview && <pre className="whitespace-pre-wrap rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4 text-xs text-zinc-700 dark:text-zinc-300 font-sans">{preview}</pre>}
    </section>
  );
}
