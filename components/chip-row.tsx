"use client";

import { useState } from "react";

// A row of tags that shows the first few and "+N more" for the rest.
export function ChipRow({ items, show = 4, chipClass }: { items: { key: string; label: string }[]; show?: number; chipClass: string }) {
  const [all, setAll] = useState(false);
  const list = all ? items : items.slice(0, show);
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((i) => <span key={i.key} className={chipClass}>{i.label}</span>)}
      {!all && items.length > show && <button type="button" onClick={() => setAll(true)} className="text-xs font-semibold text-amber-600 px-2 py-1.5 hover:underline">+{items.length - show} more</button>}
    </div>
  );
}
