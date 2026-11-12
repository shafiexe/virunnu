"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

const MAX_SIDE = 480;

// Shrinks the picture in the browser first, so a phone photo of a few MB becomes a small file that loads fast on every invoice.
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read the image"))), "image/png"));
}

export function LogoUploader({ initialUrl, name }: { initialUrl: string | null; name: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError("");
    try {
      if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
      const blob = await shrink(file);
      const form = new FormData();
      form.append("file", new File([blob], "logo.png", { type: "image/png" }));
      const res = await fetch("/api/owner/logo", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not upload");
      setUrl(data.url); router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function applyLink() {
    if (!link.trim()) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/owner/logo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: link.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not use that link");
      setUrl(data.url); setLink(""); router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not use that link");
    } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/owner/logo", { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove");
      setUrl(null); router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove");
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="h-20 w-20 shrink-0 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white flex items-center justify-center overflow-hidden">
          {url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={url} alt={`${name} logo`} className="max-h-full max-w-full object-contain" />
            : <ImagePlus className="h-6 w-6 text-zinc-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Logo / emblem</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Printed at the top of your invoices and statements. A square or wide image on a plain or transparent background looks best.</p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {url ? "Change logo" : "Upload logo"}
            </button>
            {url && <button type="button" disabled={busy} onClick={remove} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"><Trash2 className="h-4 w-4" /> Remove</button>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } }} placeholder="…or paste a link to your logo (https://…)" inputMode="url"
              className="min-w-0 flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <button type="button" disabled={busy || !link.trim()} onClick={applyLink} className="shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50">Use link</button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </section>
  );
}
