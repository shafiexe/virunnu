"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

type Photo = { id: string; url: string; caption: string | null };

export function PhotoCarousel({ photos, venueName, overlay }: { photos: Photo[]; venueName: string; overlay?: React.ReactNode }) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (photos.length === 0) {
    return (
      <div className="h-72 sm:h-[420px] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-400 flex items-center justify-center">
        <div className="text-center text-white/40 select-none">
          <svg viewBox="0 0 80 60" className="w-24 mx-auto fill-white/30 mb-2">
            <rect x="5" y="20" width="70" height="35" rx="2" />
            <rect x="15" y="10" width="50" height="15" rx="1" />
            <rect x="30" y="5" width="20" height="10" rx="1" />
          </svg>
          <p className="text-sm font-medium">No photos yet</p>
        </div>
      </div>
    );
  }

  const prev = () => setCurrent((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setCurrent((i) => (i + 1) % photos.length);
  const showDots = Math.min(photos.length, 10);

  return (
    <>
      {/* ── Carousel ─────────────────────────────────────────────── */}
      <div className="relative h-72 sm:h-[420px] overflow-hidden bg-zinc-900 select-none">
        {/* Slides */}
        {photos.map((p, i) => (
          <div
            key={p.id}
            aria-hidden={i !== current}
            className={`absolute inset-0 transition-opacity duration-500 ${i === current ? "opacity-100 z-10" : "opacity-0 z-0"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.caption ?? `${venueName} photo ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Bottom gradient — taller when overlay content is present */}
        <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent z-20 pointer-events-none ${overlay ? "h-4/5" : "h-32"}`} />

        {/* Top-right counter */}
        <div className="absolute top-4 right-4 z-30 text-xs font-semibold text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg">
          {current + 1} / {photos.length}
        </div>

        {/* Prev / Next arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/65 active:scale-95 flex items-center justify-center transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/65 active:scale-95 flex items-center justify-center transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Venue info overlay (rendered between gradient and controls) */}
        {overlay && (
          <div className="absolute inset-x-0 bottom-14 z-[25] px-5 pointer-events-none flex flex-col items-center text-center">
            <div className="pointer-events-auto w-full max-w-3xl">
              {overlay}
            </div>
          </div>
        )}

        {/* Bottom bar: dot indicators + "See all photos" */}
        <div className="absolute bottom-4 inset-x-0 z-30 flex items-center justify-between px-5">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: showDots }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-6 h-1.5 bg-white"
                    : "w-1.5 h-1.5 bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>

          {/* See all photos button */}
          <button
            onClick={() => setLightbox(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-black/45 backdrop-blur-sm hover:bg-black/65 active:scale-95 px-3 py-1.5 rounded-xl transition-all"
          >
            <Images className="h-3.5 w-3.5" />
            See all {photos.length} photos
          </button>
        </div>
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────── */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
            <span className="text-white font-semibold text-sm">{venueName}</span>
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-sm">{current + 1} / {photos.length}</span>
              <button
                onClick={() => setLightbox(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Main image */}
          <div className="relative flex-1 flex items-center justify-center min-h-0 px-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[current].url}
              alt={photos[current].caption ?? `${venueName} photo ${current + 1}`}
              className="max-h-full max-w-full object-contain rounded-lg"
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Caption */}
          {photos[current].caption && (
            <p className="text-center text-white/60 text-xs px-4 py-2 shrink-0">{photos[current].caption}</p>
          )}

          {/* Thumbnail strip */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0 border-t border-white/10">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setCurrent(i)}
                className={`shrink-0 h-14 w-14 rounded-lg overflow-hidden border-2 transition-all ${
                  i === current ? "border-amber-400 opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
