"use client";

import { useEffect } from "react";

// Opens the browser's print dialog as soon as the page loads, so "Save as PDF" is one step away.
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}
