"use client";

import { createContext, useContext } from "react";
import { Eye } from "lucide-react";

// The pages the owner made view-only for this person, so screens can leave out buttons that would only say "no access".
const Ctx = createContext<readonly string[]>([]);
export const AccessProvider = ({ deny, children }: { deny?: readonly string[]; children: React.ReactNode }) => <Ctx.Provider value={deny ?? []}>{children}</Ctx.Provider>;

export function useCanWrite(page: string) {
  const deny = useContext(Ctx);
  return !deny.includes(`ro.${page}`);
}

// Shows its children only to people who may change this page
export function WriteOnly({ page, children }: { page: string; children: React.ReactNode }) {
  return useCanWrite(page) ? <>{children}</> : null;
}

// For pages that are mostly forms: people with view-only access see them, but nothing can be clicked or typed
export function ReadOnlyShield({ page, children }: { page: string; children: React.ReactNode }) {
  const can = useCanWrite(page);
  if (can) return <>{children}</>;
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400"><Eye className="h-3.5 w-3.5" /> View only. You can look but not change anything here.</div>
      <div className="pointer-events-none select-none opacity-80" aria-readonly="true" inert>{children}</div>
    </div>
  );
}

// Details the owner chose to hide from this person ("hide.phones", "hide.profit", "hide.salaries"). This hides them on screen;
// it is not a lock on the data itself.
export function useAllowed(what: "phones" | "profit" | "salaries") {
  return !useContext(Ctx).includes(`hide.${what}`);
}

export function Show({ what, children, fallback = null }: { what: "phones" | "profit" | "salaries"; children: React.ReactNode; fallback?: React.ReactNode }) {
  return useAllowed(what) ? <>{children}</> : <>{fallback}</>;
}
