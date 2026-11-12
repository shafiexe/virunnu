"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Camera, Globe, HelpCircle, Link2, Loader2, MapPin, Sparkles, Star, Users, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export type PrefillReport = {
  /** details the AI filled in, with where each came from */
  filled: { label: string; from?: "google" | "website" | "text" | "ai" }[];
  /** fields still empty, with what would fill them */
  missing: { label: string; hint: string }[];
  /** links that could not be opened */
  unreadable: string[];
  /** the description was written by the AI rather than copied from a source */
  descriptionWritten: boolean;
  photos: number;
  googleNote?: string;
};

type Source = {
  key: string; label: string; icon: React.ComponentType<{ className?: string }>; recommended?: boolean; weight: number;
  gives: string; placeholder: string; how: string; looksRight: RegExp; wrong: string;
};

const SOCIAL = /instagram\.com|facebook\.com|fb\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|linkedin\.com/i;

const SOURCES: Source[] = [
  { key: "website", label: "Website", icon: Globe, recommended: true, weight: 40,
    gives: "description, hall sizes, capacity, amenities, email, social page links, photos", placeholder: "https://www.yourname.com",
    how: "Your own website's address. It is the most reliable source, and we also read its footer for contact details and social pages.",
    looksRight: /^https?:\/\/[^\s/]+\.[^\s/]+/i, wrong: "That doesn't look like a website address" },
  { key: "google", label: "Google Maps link", icon: MapPin, recommended: true, weight: 30,
    gives: "the map pin on your public page (add the Google details below for address, phone and rating)", placeholder: "https://maps.app.goo.gl/…",
    how: "Open the place on Google Maps, tap Share, then Copy link. A link from a Google search page can't be read; use the Maps link.",
    looksRight: /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|g\.page|g\.co\/kgs|share\.google/i, wrong: "That doesn't look like a Google Maps link" },
  { key: "instagram", label: "Instagram page", icon: Camera, weight: 8,
    gives: "saved as a link on your public page. Instagram often blocks reading, so details may not come from it", placeholder: "https://www.instagram.com/yourpage",
    how: "Open the profile in a browser and copy the address from the top. If your website links to it, we find it automatically.", looksRight: /instagram\.com/i, wrong: "That doesn't look like an Instagram link" },
  { key: "facebook", label: "Facebook page", icon: Users, weight: 6,
    gives: "saved as a link on your public page. Facebook often blocks reading, so details may not come from it", placeholder: "https://www.facebook.com/yourpage",
    how: "Open the page and copy its address. If your website links to it, we find it automatically.", looksRight: /facebook\.com|fb\.com/i, wrong: "That doesn't look like a Facebook link" },
  { key: "youtube", label: "YouTube channel", icon: Video, weight: 3,
    gives: "saved as a link on your public page", placeholder: "https://www.youtube.com/@yourchannel",
    how: "Copy the channel address from your browser.", looksRight: /youtube\.com|youtu\.be/i, wrong: "That doesn't look like a YouTube link" },
  { key: "other", label: "Any other page", icon: Link2, weight: 5,
    gives: "extra details from Justdial, Sulekha, WeddingWire or a news page, when it can be read", placeholder: "https://…",
    how: "Any page that describes you.", looksRight: /^https?:\/\/[^\s/]+\.[^\s/]+/i, wrong: "That doesn't look like a web address" },
];
const MAIN = ["website", "google"];

const normalise = (v: string) => {
  const t = v.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : /^[\w-]+(\.[\w-]+)+/.test(t) ? `https://${t}` : t;
};
const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0];

const INPUT = "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";

const SRC_LABEL: Record<string, string> = { google: "Google", website: "website", text: "your text", ai: "AI" };

// One place to add what the business has. The website and the Google details are the two that fill the most, so they come first;
// the rest sit under "more links". After the fill it says what was found and from where, what is missing and what would fill it.
export function PrefillSources({ kind, onChange, onFill, loading, note, report, children }: {
  kind: "center" | "caterer"; onChange: (composed: string) => void; onFill: () => void; loading: boolean;
  note: { ok: boolean; text: string } | null; report: PrefillReport | null; children?: React.ReactNode;
}) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [panel, setPanel] = useState("");
  // for any link the AI cannot open: the page text copied and pasted by hand
  const [pasted, setPasted] = useState<Record<string, string>>({});
  const [pasteOpen, setPasteOpen] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [more, setMore] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [help, setHelp] = useState<string | null>(null);

  // What the AI reads: each link with its label, then the pasted Google details and any other text
  const composed = useMemo(() => {
    const lines = SOURCES.map((s) => (links[s.key]?.trim() ? `${s.label}: ${normalise(links[s.key])}` : "")).filter(Boolean);
    const pages = SOURCES.map((s) => (pasted[s.key]?.trim() ? `${s.label} (page text copied by hand):\n${pasted[s.key].trim()}` : "")).filter(Boolean);
    return [...lines, panel.trim() && `Google details (copied from the Google search page):\n${panel.trim()}`, ...pages, notes.trim()].filter(Boolean).join("\n\n");
  }, [links, panel, pasted, notes]);
  useEffect(() => { onChange(composed); }, [composed, onChange]);

  const state = (s: Source) => {
    const v = links[s.key]?.trim();
    if (!v) return "empty" as const;
    const u = normalise(v);
    if (!s.looksRight.test(u)) return "wrong" as const;
    // the website box should not hold a social page
    if (s.key === "website" && SOCIAL.test(u)) return "wrong" as const;
    return "ok" as const;
  };
  const have = (k: string) => (k === "google" ? state(SOURCES.find((x) => x.key === "google")!) === "ok" || panel.trim().length > 20 : state(SOURCES.find((x) => x.key === k)!) === "ok");
  const cantRead = (s: Source) => !!report?.unreadable.some((u) => links[s.key] && host(u) === host(normalise(links[s.key])));
  const wasRead = (s: Source) => !!report && state(s) === "ok" && !cantRead(s);
  const addedCount = SOURCES.filter((s) => state(s) === "ok" || (pasted[s.key]?.trim().length ?? 0) > 20).length + (panel.trim().length > 20 ? 1 : 0) + (notes.trim().length > 20 ? 1 : 0);
  const missingBest = [!have("website") && "your website", !have("google") && "the Google details"].filter(Boolean) as string[];

  const linkBox = (s: Source) => {
    const st = state(s);
    const Icon = s.icon;
    return (
      <div key={s.key} className={cn("rounded-xl border p-3 space-y-1.5 transition-colors",
        s.recommended && st === "empty" ? "border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/20" : st === "ok" ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10" : "border-zinc-200 dark:border-zinc-700")}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-zinc-500 shrink-0" />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">{s.label}</span>
          {s.recommended && <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400"><Star className="h-2.5 w-2.5" /> Best</span>}
          <button type="button" onClick={() => setHelp(help === s.key ? null : s.key)} aria-label={`How to find the ${s.label}`} className="ml-auto text-zinc-500 dark:text-zinc-400 hover:text-zinc-600"><HelpCircle className="h-3.5 w-3.5" /></button>
          {wasRead(s) && <Check className="h-4 w-4 text-emerald-600" aria-label="Read" />}
          {cantRead(s) && <AlertTriangle className="h-4 w-4 text-red-500" aria-label="Could not read" />}
        </div>
        <p className="text-[11px] text-zinc-500">Gives: {s.gives}</p>
        <input className={INPUT} value={links[s.key] ?? ""} onChange={(e) => setLinks((l) => ({ ...l, [s.key]: e.target.value }))} placeholder={s.placeholder} inputMode="url" aria-label={s.label} />
        {st === "wrong" && <p className="text-[11px] text-red-500">{s.key === "website" && SOCIAL.test(normalise(links[s.key] ?? "")) ? "That is a social page. Put it under “More links”, and use the business's own website here." : s.wrong}</p>}
        {cantRead(s) && <p className="text-[11px] text-red-500">We couldn&apos;t open this link. Copy the page text and paste it in the box below, and we&apos;ll read that instead.</p>}
        {help === s.key && <p className="text-[11px] text-zinc-500 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-2">{s.how}</p>}
        {(pasteOpen[s.key] || cantRead(s) || (pasted[s.key] ?? "").length > 0) ? (
          <div className="space-y-1">
            <textarea className={cn(INPUT, "resize-y")} rows={3} value={pasted[s.key] ?? ""} onChange={(e) => setPasted((p) => ({ ...p, [s.key]: e.target.value }))} aria-label={`${s.label} page text`}
              placeholder="Paste the text of the page here" />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Open the page, press Ctrl/⌘ + A, then Ctrl/⌘ + C, and paste here. On a phone: touch and hold the text, Select all, Copy.</p>
          </div>
        ) : (
          <button type="button" onClick={() => setPasteOpen((o) => ({ ...o, [s.key]: true }))} className="text-[11px] font-semibold text-amber-700 dark:text-amber-500 hover:underline">Can&apos;t be read? Copy the page text and paste it instead</button>
        )}
      </div>
    );
  };

  const web = SOURCES.find((x) => x.key === "website")!;
  const maps = SOURCES.find((x) => x.key === "google")!;

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-white dark:bg-zinc-900 p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50"><Sparkles className="h-4 w-4 text-amber-500" /> Fill with AI</div>
        <p className="text-xs text-zinc-500 mt-0.5">Add what this {kind === "center" ? "convention centre" : "catering team"} has online. We read it, fill in the form and write the description, so there is little to type. Nothing is required, but two things give the best result.</p>
        {missingBest.length > 0 && <p className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">Best result: add {missingBest.join(" and ")}.</p>}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {linkBox(web)}
        <div className={cn("rounded-xl border p-3 space-y-1.5", !have("google") ? "border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/20" : "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10")}>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-zinc-500 shrink-0" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Google details</span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400"><Star className="h-2.5 w-2.5" /> Best</span>
            <button type="button" onClick={() => setHelp(help === "google" ? null : "google")} aria-label="How to copy the Google details" className="ml-auto text-zinc-500 dark:text-zinc-400 hover:text-zinc-600"><HelpCircle className="h-3.5 w-3.5" /></button>
          </div>
          <p className="text-[11px] text-zinc-500">Gives: address, phone, rating &amp; reviews, opening hours{panel.trim().length > 20 ? "" : " (paste them here)"}</p>
          <textarea className={cn(INPUT, "resize-y")} rows={3} value={panel} onChange={(e) => setPanel(e.target.value)} aria-label="Google details" placeholder="Search the business on Google, copy the panel on the right (name, address, phone, rating, hours) and paste it here" />
          <input className={INPUT} value={links.google ?? ""} onChange={(e) => setLinks((l) => ({ ...l, google: e.target.value }))} placeholder="Google Maps link, for the map pin: https://maps.app.goo.gl/…" inputMode="url" aria-label="Google Maps link" />
          {state(maps) === "wrong" && <p className="text-[11px] text-red-500">{maps.wrong}</p>}
          {help === "google" && <p className="text-[11px] text-zinc-500 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-2">On Google, search the business name and city. Select the information panel (name, address, phone, rating) and copy it into the first box. For the map pin, open it on Google Maps, tap Share, Copy link, and paste that in the second box. Google search page links can&apos;t be read, which is why the panel text is pasted. Tip: press Ctrl/⌘ + A to select the whole page, then Ctrl/⌘ + C. The AI picks out the useful part.</p>}
        </div>
      </div>

      <div>
        <button type="button" onClick={() => setMore((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-amber-600">
          {more ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} More links: Instagram, Facebook, YouTube, other pages <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>
        </button>
        {more && <div className="grid gap-2.5 sm:grid-cols-2 mt-2">{SOURCES.filter((s) => !MAIN.includes(s.key)).map(linkBox)}</div>}
        {more && <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">If your website links to these pages, we find them on our own. Add them here only if the website doesn&apos;t.</p>}
      </div>

      <div>
        <button type="button" onClick={() => setShowNotes((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-amber-600">
          {showNotes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} No links, or something to add? Paste text instead
        </button>
        {showNotes && (
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={cn(INPUT, "mt-2 resize-y")}
            placeholder={kind === "center" ? "Paste anything: a WhatsApp message, brochure text, the price list, the hall sizes." : "Paste anything: a WhatsApp message, brochure text, the menu with prices."} />
        )}
      </div>

      {children}

      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={onFill} disabled={loading || composed.trim().length < 5}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} {loading ? "Reading…" : "Fill the form"}
        </button>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{addedCount} source{addedCount === 1 ? "" : "s"} added</span>
      </div>

      {report && (
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 p-3 space-y-2.5">
          <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">What we found <span className="font-normal text-zinc-500 dark:text-zinc-400">· the tag shows where each came from, so you know what to check</span></div>
          <div className="flex flex-wrap gap-1.5">
            {report.filled.map((f) => (
              <span key={f.label} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300"><Check className="h-3 w-3" />{f.label}{f.from && f.from !== "text" ? <span className="opacity-70">· {SRC_LABEL[f.from]}</span> : null}</span>
            ))}
            {report.descriptionWritten && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-950/40 px-2 py-0.5 text-[11px] font-medium text-violet-800 dark:text-violet-300"><Sparkles className="h-3 w-3" />Description written by AI. Please read it.</span>}
            {report.photos > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300"><Check className="h-3 w-3" />{report.photos} photos found online</span>}
          </div>
          {report.missing.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">Still to add</div>
              {report.missing.map((m) => <div key={m.label} className="text-xs text-zinc-600 dark:text-zinc-300"><span className="font-medium">{m.label}</span> <span className="text-zinc-500 dark:text-zinc-400">· {m.hint}</span></div>)}
            </div>
          )}
          {report.photos > 0 && <p className="text-xs text-zinc-500">Photos found online may belong to someone else. Untick any you don&apos;t have the right to use.</p>}
          {report.googleNote && <p className="text-xs text-zinc-500">{report.googleNote}</p>}
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Check everything before saving. Facts come only from what you added; the description and suggested items are written by AI.</p>
        </div>
      )}
      {note && !report && <p className={cn("text-xs", note.ok ? "text-emerald-600" : "text-amber-700 dark:text-amber-500")}>{note.text}</p>}
    </div>
  );
}
