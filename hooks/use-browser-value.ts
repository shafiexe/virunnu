"use client";

import { useSyncExternalStore } from "react";

// Values that live in the browser (a saved choice, a media query) and so cannot be known on the server. These read them the way React
// intends: the server and the first paint use the fallback, and the real value arrives straight after, with no state set inside an effect.

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { listeners.delete(cb); window.removeEventListener("storage", cb); };
};

// A saved value from this browser, or null (also null on the server and when nothing is saved)
export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(key); } catch { return null; } }, () => null);
}

// Saves a value (null removes it) and tells every component that is showing it
export function setStoredValue(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* no storage: the choice lasts until the page closes */ }
  listeners.forEach((l) => l());
}

// Whether a media query matches now; false on the server
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// False while the page is being built on the server, true in the browser
export const useHydrated = () => useSyncExternalStore(() => () => {}, () => true, () => false);
