"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, MessageCircle, Plus, Power, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { ACCESS_TREE, type AccessGroup } from "@/lib/caterer-access";
import { MAX_TEAM_LOGINS } from "@/lib/caterer-team-limit";
import { whatsappLink } from "@/lib/caterer-share";
import { cn } from "@/lib/utils";

export type Member = { id: string; name: string | null; phone: string; deny: string[]; disabled: boolean };

const INPUT =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";

const summary = (deny: string[], tree: AccessGroup[]) => {
  const hidden = tree.flatMap((g) => g.items).filter((i) => deny.includes(i.key));
  const tabs = deny.filter((k) => tree.some((g) => g.items.some((i) => i.tabs?.some((t) => t.key === k) && !deny.includes(i.key))));
  const ro = deny.filter((k) => k.startsWith("ro."));
  if (!hidden.length && !tabs.length && !ro.length) return "Everything open";
  return [hidden.length && `${hidden.length} page${hidden.length === 1 ? "" : "s"} hidden`, tabs.length && `${tabs.length} tab${tabs.length === 1 ? "" : "s"} hidden`, ro.length && `${ro.length} view-only`].filter(Boolean).join(" · ");
};

function Credentials({ business, product, member, password, onClose }: { business: string; product: string; member: Pick<Member, "name" | "phone">; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const phone = member.phone.replace(/^\+91/, "");
  const text = `Hello ${member.name ?? ""}, you can now sign in to ${business}'s ${product}.\n\nPhone: ${phone}\nPassword: ${password}\n\nSign in: ${typeof window !== "undefined" ? window.location.origin : ""}/login`;
  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">Login for {member.name ?? phone}</h3>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">This password is shown only now. Send it to them; you can make a new one any time.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close"><X className="h-4 w-4 text-emerald-700" /></button>
      </div>
      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/40 px-4 py-3 font-mono text-sm space-y-0.5">
        <div><span className="text-zinc-500 dark:text-zinc-400">Phone </span>{phone}</div>
        <div><span className="text-zinc-500 dark:text-zinc-400">Password </span><span className="font-bold tracking-wide">{password}</span></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(`Phone: ${phone}\nPassword: ${password}`); setCopied(true); } catch { /* the details are on screen */ } }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
        </button>
        <a href={whatsappLink(member.phone, text)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> Send on WhatsApp</a>
      </div>
    </div>
  );
}

// The page-by-page checklist: tick what the person can open; untick to hide it. A visible page can be made view-only.
function AccessEditor({ member, tree, apiBase, onClose, onSaved }: { member: Member; tree: AccessGroup[]; apiBase: string; onClose: () => void; onSaved: (m: Member) => void }) {
  const [deny, setDeny] = useState<string[]>(member.deny);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const has = (k: string) => deny.includes(k);
  const toggle = (k: string, hide: boolean) => setDeny((d) => (hide ? [...new Set([...d, k])] : d.filter((x) => x !== k)));
  const all = tree.flatMap((g) => g.items);
  const setAll = (visible: boolean) => setDeny(visible ? [] : all.map((i) => i.key));

  async function save() {
    setBusy(true); setError("");
    try {
      const res = await fetch(`${apiBase}/${member.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deny }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      onSaved(data.member); onClose();
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">What {member.name ?? member.phone} can open</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Ticked pages are visible. Untick to hide a page or a tab. They are signed out when you save, so the change applies at once.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /></button>
        </div>
        <div className="flex gap-2 px-5 pb-2">
          <button type="button" onClick={() => setAll(true)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Open everything</button>
          <button type="button" onClick={() => setAll(false)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Hide everything</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4">
          {tree.map((g) => (
            <section key={g.title} className="space-y-1.5">
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{g.title}</h4>
              {g.items.map((i) => {
                const visible = !has(i.key);
                return (
                  <div key={i.key} className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <label className="flex flex-1 items-center gap-2.5 cursor-pointer min-w-0">
                        <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={visible} onChange={(e) => toggle(i.key, !e.target.checked)} />
                        <span className="min-w-0"><span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">{i.label}</span>{i.hint && <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">{i.hint}</span>}</span>
                      </label>
                      {visible && i.key !== "dashboard" && !i.key.startsWith("hide.") && (
                        <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer whitespace-nowrap" title="They can look but not add, change or delete">
                          <input type="checkbox" className="h-3.5 w-3.5 accent-amber-500" checked={has(`ro.${i.key}`)} onChange={(e) => toggle(`ro.${i.key}`, e.target.checked)} /> View only
                        </label>
                      )}
                    </div>
                    {visible && i.tabs && (
                      <div className="mt-2 ml-7 flex flex-wrap gap-x-4 gap-y-1.5">
                        {i.tabs.map((t) => (
                          <label key={t.key} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                            <input type="checkbox" className="h-3.5 w-3.5 accent-amber-500" checked={!has(t.key)} onChange={(e) => toggle(t.key, !e.target.checked)} /> {t.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
        <div className="p-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="button" onClick={save} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save access
          </button>
        </div>
      </div>
    </div>
  );
}

export function CatererTeamManager({ initial, business, tree = ACCESS_TREE, apiBase = "/api/caterer/team", product = "catering books" }: { initial: Member[]; business: string; tree?: AccessGroup[]; apiBase?: string; product?: string }) {
  const [members, setMembers] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [creds, setCreds] = useState<{ member: Pick<Member, "name" | "phone">; password: string } | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const replace = (m: Member) => setMembers((l) => l.map((x) => (x.id === m.id ? m : x)));

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy("add"); setError("");
    try {
      const res = await fetch(apiBase, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not add"); return; }
      setMembers((l) => [...l, data.member]); setCreds({ member: data.member, password: data.password });
      setName(""); setPhone(""); setAdding(false);
    } finally { setBusy(""); }
  }

  async function patch(m: Member, body: object, key: string) {
    setBusy(m.id + key); setError("");
    try {
      const res = await fetch(`${apiBase}/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      replace(data.member);
      if (data.password) setCreds({ member: data.member, password: data.password });
    } finally { setBusy(""); }
  }

  async function remove(m: Member) {
    setBusy(m.id + "rm");
    try {
      const res = await fetch(`${apiBase}/${m.id}`, { method: "DELETE" });
      if (res.ok) setMembers((l) => l.filter((x) => x.id !== m.id));
    } finally { setBusy(""); setRemoving(null); }
  }

  return (
    <div className="space-y-4">
      {creds && <Credentials business={business} product={product} member={creds.member} password={creds.password} onClose={() => setCreds(null)} />}

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {members.length === 0 && !adding && (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-500"><ShieldCheck className="h-6 w-6" /></span>
            <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">No team logins yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">Give your accountant, manager or staff their own login. Each person sees every page until you untick what to hide from them.</p>
          </div>
        )}
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {members.map((m) => (
            <li key={m.id} className={cn("px-4 py-3 space-y-2", m.disabled && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1 basis-40">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{m.name ?? "No name"} {m.disabled && <span className="ml-1 rounded-full bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">Switched off</span>}</div>
                  <div className="text-xs text-zinc-500">{m.phone.replace(/^\+91/, "")} · {summary(m.deny, tree)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => setEditing(m)} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400"><ShieldCheck className="h-3.5 w-3.5" /> Access</button>
                  <button type="button" onClick={() => patch(m, { resetPassword: true }, "pw")} disabled={busy === m.id + "pw"} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300"><KeyRound className="h-3.5 w-3.5" /> New password</button>
                  <button type="button" onClick={() => patch(m, { disabled: !m.disabled }, "off")} disabled={busy === m.id + "off"} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300"><Power className="h-3.5 w-3.5" /> {m.disabled ? "Switch on" : "Switch off"}</button>
                  {removing === m.id
                    ? <span className="inline-flex items-center gap-2 text-xs"><button type="button" onClick={() => remove(m)} className="font-bold text-red-600">Remove for good</button><button type="button" onClick={() => setRemoving(null)} className="text-zinc-500">Keep</button></span>
                    : <button type="button" onClick={() => setRemoving(m.id)} aria-label="Remove login" className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {adding && (
          <form onSubmit={add} className="border-t border-zinc-100 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/60 dark:bg-zinc-800/20">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1"><span className="text-xs font-medium text-zinc-500">Name</span><input className={INPUT} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahim" maxLength={80} /></label>
              <label className="block space-y-1"><span className="text-xs font-medium text-zinc-500">Phone number (their login)</span><input className={INPUT} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98470 00000" /></label>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">A phone number can have only one login. They will see every page until you hide some.</p>
            <div className="flex gap-2">
              <button type="submit" disabled={busy === "add"} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50">{busy === "add" && <Loader2 className="h-4 w-4 animate-spin" />} Create login</button>
              <button type="button" onClick={() => { setAdding(false); setError(""); }} className="px-3 py-2 text-sm text-zinc-500">Cancel</button>
            </div>
          </form>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!adding && members.length >= MAX_TEAM_LOGINS && <p className="text-sm text-zinc-500">You have added the most logins allowed ({MAX_TEAM_LOGINS}). Remove one to add another.</p>}
      {!adding && members.length < MAX_TEAM_LOGINS && (
        <button type="button" onClick={() => { setAdding(true); setCreds(null); }} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-900">
          {members.length === 0 ? <UserPlus className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Add a login <span className="text-xs font-normal opacity-80">({members.length} of {MAX_TEAM_LOGINS})</span>
        </button>
      )}
      {editing && <AccessEditor member={editing} tree={tree} apiBase={apiBase} onClose={() => setEditing(null)} onSaved={replace} />}
    </div>
  );
}
