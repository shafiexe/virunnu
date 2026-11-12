"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// The photos as a swipeable row, all the same shape, with a count. A picture that fails to load is dropped instead of leaving a gap.
export function CatererGallery({ photos, name }: { photos: string[]; name: string }) {
  const [broken, setBroken] = useState<string[]>([]);
  const [at, setAt] = useState(0);
  const row = useRef<HTMLDivElement>(null);
  const shown = photos.filter((p) => !broken.includes(p));
  if (shown.length === 0) return null;

  const go = (i: number) => {
    const el = row.current;
    if (!el) return;
    const next = Math.max(0, Math.min(shown.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setAt(next);
  };

  return (
    <div className="relative">
      <div ref={row} onScroll={(e) => { const el = e.currentTarget; setAt(Math.round(el.scrollLeft / el.clientWidth)); }}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-2xl bg-zinc-100 dark:bg-zinc-800 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shown.map((url, i) => (
          <div key={url} className="relative w-full shrink-0 snap-center aspect-[16/10] sm:aspect-[16/9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`${name} photo ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} onError={() => setBroken((b) => [...b, url])} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
      {shown.length > 1 && (
        <>
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">{Math.min(at, shown.length - 1) + 1} / {shown.length}</span>
          {at > 0 && <button type="button" onClick={() => go(at - 1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow"><ChevronLeft className="h-5 w-5" /></button>}
          {at < shown.length - 1 && <button type="button" onClick={() => go(at + 1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow"><ChevronRight className="h-5 w-5" /></button>}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 sm:hidden">
            {shown.slice(0, 8).map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === at ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />)}
          </div>
        </>
      )}
    </div>
  );
}
