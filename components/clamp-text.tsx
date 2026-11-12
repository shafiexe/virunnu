"use client";

import { useState } from "react";

// Long text shows two lines with "Read more", so the page stays short.
export function ClampText({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 160;
  return (
    <div>
      <p className={`${className ?? ""} ${!open && long ? "line-clamp-2" : ""}`}>{text}</p>
      {long && <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-xs font-semibold text-amber-600 hover:underline">{open ? "Show less" : "Read more"}</button>}
    </div>
  );
}
