"use client";

import { useRef, useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { renderTemplate, SAMPLE_VARS, TEMPLATE_DEFAULTS, TEMPLATE_INFO, TEMPLATE_KEYS, setActiveTemplates, type TemplateKey, type Templates } from "@/lib/caterer-templates";
import { cn } from "@/lib/utils";

const AREA =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y font-mono leading-relaxed";

// The WhatsApp messages sent to customers: see them, change the wording, put the standard back.
export function CatererMessageSettings({ initial }: { initial: Partial<Templates> }) {
  const [texts, setTexts] = useState<Templates>(() => Object.fromEntries(TEMPLATE_KEYS.map((k) => [k, initial[k] ?? TEMPLATE_DEFAULTS[k]])) as Templates);
  const [open, setOpen] = useState<TemplateKey>("caterer_reminder");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  const set = (k: TemplateKey, v: string) => { setTexts((t) => ({ ...t, [k]: v })); setSaved(false); };
  const insert = (name: string) => {
    const el = area.current; const tag = `{{${name}}}`;
    if (!el) return set(open, texts[open] + tag);
    const { selectionStart: a, selectionEnd: b } = el;
    set(open, texts[open].slice(0, a) + tag + texts[open].slice(b));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + tag.length, a + tag.length); });
  };

  async function save() {
    setBusy(true); setError(""); setSaved(false);
    try {
      // only wording that differs from the standard is stored; the rest is cleared so future improvements to the standard apply
      const changes = Object.fromEntries(TEMPLATE_KEYS.map((k) => [k, texts[k].trim() === TEMPLATE_DEFAULTS[k].trim() ? "" : texts[k]]));
      const res = await fetch("/api/caterer/message-templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templates: changes }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      setActiveTemplates(data.templates); setSaved(true);
    } finally { setBusy(false); }
  }

  const info = TEMPLATE_INFO[open];
  const changed = texts[open].trim() !== TEMPLATE_DEFAULTS[open].trim();

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Messages</h2>
        <p className="text-xs text-zinc-500 mt-0.5">The WhatsApp messages your buttons write for you. Change the wording; the details in {"{{double brackets}}"} are filled in when you send.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_KEYS.map((k) => (
          <button key={k} type="button" onClick={() => setOpen(k)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", open === k ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>{TEMPLATE_INFO[k].label}</button>
        ))}
      </div>
      <p className="text-xs text-zinc-500">Used by: {info.when}</p>
      <textarea ref={area} className={AREA} rows={9} value={texts[open]} onChange={(e) => set(open, e.target.value)} maxLength={1500} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-zinc-400">Tap to add:</span>
        {info.vars.map((v) => <button key={v} type="button" onClick={() => insert(v)} className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-[11px] font-mono text-zinc-600 dark:text-zinc-300 hover:bg-amber-100 dark:hover:bg-amber-950/30">{v}</button>)}
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">What the customer sees</div>
        <pre className="whitespace-pre-wrap rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-4 text-sm text-zinc-800 dark:text-zinc-200 font-sans">{renderTemplate(open, SAMPLE_VARS, texts)}</pre>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}{saved ? "Saved" : "Save messages"}
        </button>
        {changed && <button type="button" onClick={() => set(open, TEMPLATE_DEFAULTS[open])} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"><RotateCcw className="h-4 w-4" /> Use standard wording</button>}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </section>
  );
}
