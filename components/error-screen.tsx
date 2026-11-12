"use client";

import { useEffect } from "react";

// What a person sees when a page breaks: a plain message and a way to try again. The break is also reported (see /api/client-error).
export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/client-error", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ message: `${error.message} ${error.digest ?? ""}`.trim(), page: window.location.pathname }),
    }).catch(() => {});
  }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Something went wrong</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">We have been told about it. Please try again, and if it keeps happening, call us.</p>
      <button type="button" onClick={reset} className="mt-5 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-sm font-semibold text-zinc-900">Try again</button>
    </div>
  );
}
