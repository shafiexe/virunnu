"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, MessageCircle, X } from "lucide-react";
import { whatsappLink } from "@/lib/caterer-share";

type Login = { id: string; name: string | null; phone: string; main: boolean; disabled: boolean };
type Done = { name: string | null; phone: string; password: string };

// Make a new password for a team's login and pass it on yourself: for when the person forgot it and the WhatsApp or email
// to their number isn't getting through. Shown once; making another one replaces it.
export function AdminResetPassword({ kind, id, business }: { kind: "owners" | "caterers"; id: string; business: string }) {
  const [open, setOpen] = useState(false);
  const [logins, setLogins] = useState<Login[] | null>(null);
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function show() {
    setOpen(true); setDone(null); setError(""); setCopied(false);
    if (logins) return;
    const data = await fetch(`/api/admin/${kind}/${id}/logins`).then((r) => r.json()).catch(() => null);
    setLogins(data?.logins ?? []);
  }

  async function reset(userId: string) {
    setBusy(userId); setError(""); setCopied(false);
    try {
      const res = await fetch(`/api/admin/${kind}/${id}/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not reset"); return; }
      setDone({ name: data.name, phone: data.phone, password: data.password });
    } finally { setBusy(""); }
  }

  const phone = (p: string) => p.replace(/^\+91/, "");
  const message = done ? `Hello ${done.name ?? ""}, your new login for ${business} on Virunnu:\n\nPhone: ${phone(done.phone)}\nPassword: ${done.password}\n\nSign in: ${typeof window !== "undefined" ? window.location.origin : ""}/login` : "";

  return (
    <>
      <button type="button" onClick={show} title="Make a new password" aria-label="Make a new password" className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors">
        <KeyRound className="h-4 w-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">New password · {business}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Pick the login. The old password stops working straight away.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /></button>
            </div>

            {logins === null ? <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p> : logins.length === 0 ? (
              <p className="text-sm text-zinc-500">This one has no login yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {logins.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{l.name ?? "No name"} {l.main ? <span className="ml-1 text-[10px] font-semibold text-amber-700 dark:text-amber-500">MAIN</span> : <span className="ml-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">TEAM</span>}{l.disabled && <span className="ml-1 text-[10px] font-semibold text-red-500">OFF</span>}</div>
                      <div className="text-xs text-zinc-500">{phone(l.phone)}</div>
                    </div>
                    <button type="button" onClick={() => reset(l.id)} disabled={busy === l.id} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold text-zinc-900 disabled:opacity-50">
                      {busy === l.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />} New password
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}

            {done && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-3">
                <p className="text-xs text-emerald-800 dark:text-emerald-300">Shown only now. Send it to {done.name ?? phone(done.phone)}.</p>
                <div className="rounded-lg bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/40 px-3 py-2 font-mono text-sm space-y-0.5">
                  <div><span className="text-zinc-500 dark:text-zinc-400">Phone </span>{phone(done.phone)}</div>
                  <div><span className="text-zinc-500 dark:text-zinc-400">Password </span><span className="font-bold tracking-wide">{done.password}</span></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(`Phone: ${phone(done.phone)}\nPassword: ${done.password}`); setCopied(true); } catch { /* it is on screen */ } }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
                  </button>
                  <a href={whatsappLink(done.phone, message)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
