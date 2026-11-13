"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { unzipSync, strFromU8 } from "fflate";
import { Download, Upload } from "lucide-react";

type Backup = { format: string; version: number; kind: string; title: string; exportedAt: string; entities: { key: string; count: number }[]; data: Record<string, unknown[]> };
type Line = { key: string; label: string; added: number; updated: number; same: number };

const BATCH = 400;
const BTN = "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60";
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

async function post(body: object) {
  const res = await fetch("/api/backup/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? "Something went wrong");
  return d;
}

// Download everything as a file, and put it back from a file. Nothing is kept on our side: the file is the person's own copy.
export function BackupManager({ kind, lastBackup, labels }: { kind: "OWNER" | "CATERER"; lastBackup: string | null; labels: Record<string, string> }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [fileName, setFileName] = useState("");
  const [lines, setLines] = useState<Line[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function walk(b: Backup, apply: boolean, progress: (m: string) => void): Promise<Line[]> {
    const out: Line[] = [];
    for (const e of b.entities) {
      const rows = b.data[e.key] ?? [];
      const line: Line = { key: e.key, label: labels[e.key] ?? e.key, added: 0, updated: 0, same: 0 };
      for (let i = 0; i < Math.max(rows.length, 1); i += BATCH) {
        progress(`${line.label}…`);
        const r = await post({ action: "batch", key: e.key, rows: rows.slice(i, i + BATCH), apply });
        line.added += r.added; line.updated += r.updated; line.same += r.same;
      }
      out.push(line);
    }
    return out;
  }

  async function pick(file: File | undefined) {
    setError(""); setDone(""); setLines(null); setBackup(null);
    if (!file) return;
    setFileName(file.name);
    if (file.size > 60 * 1024 * 1024) { setError("This file is too large to be a Virunnu backup."); return; }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const text = file.name.toLowerCase().endsWith(".json") ? strFromU8(bytes) : strFromU8(unzipSync(bytes, { filter: (f) => f.name === "backup.json" })["backup.json"]);
      const b = JSON.parse(text) as Backup;
      if (b.format !== "virunnu-backup" || b.version !== 1 || !Array.isArray(b.entities) || typeof b.data !== "object") throw new Error("format");
      if (b.kind !== kind) { setError(kind === "OWNER" ? "This backup is from a catering account, so it cannot be restored here." : "This backup is from a convention centre account, so it cannot be restored here."); return; }
      setBackup(b);
      setBusy("Checking the file…");
      setLines(await walk(b, false, (m) => setBusy(`Checking: ${m}`)));
    } catch (e) {
      setError(e instanceof Error && e.message !== "format" && !/JSON|unzip|zip|undefined/i.test(e.message) ? e.message : "This does not look like a Virunnu backup file. Choose the .zip you downloaded from the Backup page.");
      setBackup(null);
    } finally { setBusy(""); }
  }

  async function restore() {
    if (!backup) return;
    setError(""); setDone("");
    try {
      // a copy of what is there now goes to the Downloads folder first, so the restore can be undone
      setBusy("Saving a copy of your current data first…");
      const copy = await fetch("/api/backup");
      if (!copy.ok) throw new Error("Could not save a copy of your current data, so nothing was restored.");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await copy.blob());
      a.download = `before-restore-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      const result = await walk(backup, true, (m) => setBusy(`Restoring: ${m}`));
      const added = result.reduce((t, l) => t + l.added, 0), updated = result.reduce((t, l) => t + l.updated, 0);
      setBusy("Finishing…");
      await post({ action: "finish", summary: `${added} added, ${updated} updated` });
      setDone(`Restored: ${added} records added back and ${updated} put back to the saved version.`);
      setLines(null); setBackup(null); setFileName("");
      router.refresh();
    } catch (e) {
      setError((e instanceof Error ? e.message : "Something went wrong") + " You can run the restore again; it carries on safely.");
    } finally { setBusy(""); }
  }

  const changes = lines ? lines.reduce((t, l) => t + l.added + l.updated, 0) : 0;
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Download a backup</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">One file with all your records. Open the sheets in Excel or Google Sheets to read them, and keep the file safe, for example on your computer or in your email. Download one whenever you like; there is no limit.</p>
        <a href="/api/backup" className={`${BTN} bg-amber-500 hover:bg-amber-600 text-zinc-900`}><Download className="h-4 w-4" /> Download backup</a>
        <p className="text-xs text-zinc-500">{lastBackup ? `Last backup downloaded: ${when(lastBackup)}` : "No backup downloaded yet."}</p>
      </section>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Restore from a backup</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">If something was deleted or went wrong, choose the .zip file you downloaded. Anything missing is added back and anything that changed is put back to the saved version. Nothing you added since is deleted. A copy of your current data is downloaded first.</p>
        <input ref={input} type="file" accept=".zip,.json" className="sr-only" aria-label="Choose a backup file" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" disabled={!!busy} onClick={() => input.current?.click()} className={`${BTN} border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50`}><Upload className="h-4 w-4" /> Choose backup file</button>
        {fileName && !error && <p className="text-xs text-zinc-500">{fileName}</p>}
        {busy && <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">{busy}</p>}
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        {done && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{done}</p>}

        {backup && lines && (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">Backup of <strong>{backup.title}</strong>, taken {when(backup.exportedAt)}.</p>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500"><th className="px-3 py-2">What</th><th className="px-3 py-2 text-right">Will be added</th><th className="px-3 py-2 text-right">Will be put back</th><th className="px-3 py-2 text-right">Already the same</th></tr></thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {lines.filter((l) => l.added + l.updated + l.same > 0).map((l) => (
                    <tr key={l.key}><td className="px-3 py-1.5">{l.label}</td><td className="px-3 py-1.5 text-right tabular-nums">{l.added}</td><td className="px-3 py-1.5 text-right tabular-nums">{l.updated}</td><td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">{l.same}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {changes === 0
              ? <p className="text-sm text-zinc-600 dark:text-zinc-400">Everything in this backup is already in your account, so there is nothing to restore.</p>
              : <button type="button" disabled={!!busy} onClick={restore} className={`${BTN} bg-amber-500 hover:bg-amber-600 text-zinc-900`}>Restore {changes} records</button>}
          </div>
        )}
      </section>
    </div>
  );
}
