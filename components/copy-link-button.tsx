"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

// Copies a link so it can be pasted into any chat. Falls back to a prompt-free message when the browser refuses.
export function CopyLinkButton({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try { await navigator.clipboard.writeText(url); setState("copied"); } catch { setState("failed"); }
    setTimeout(() => setState("idle"), 2500);
  }
  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800">
      {state === "copied" ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
      {state === "copied" ? "Link copied" : state === "failed" ? "Copy it from the address bar" : label}
    </button>
  );
}
