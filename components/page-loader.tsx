"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Finding beautiful halls across Kerala…",
  "Checking slot availability…",
  "Loading spaces for your celebration…",
  "Bringing you the best venues…",
  "Preparing your event search…",
  "Almost ready…",
];

function FlowerSpinner() {
  return (
    <svg viewBox="0 0 32 32" className="w-9 h-9" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse
          key={i}
          cx="16"
          cy="9.5"
          rx="3.2"
          ry="6.5"
          fill="white"
          opacity="0.9"
          transform={`rotate(${i * 72} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="3" fill="white" />
    </svg>
  );
}

export function PageLoader() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      const t = setTimeout(() => {
        setIdx((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 350);
      return () => clearTimeout(t);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-amber-600 via-amber-500 to-orange-400 select-none">
      {/* Ambient blobs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-orange-600/20 pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

      {/* Spinner ring + flower */}
      <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
        {/* outer ring */}
        <div className="absolute inset-0 rounded-full border-[3px] border-white/25 border-t-white animate-spin" />
        {/* inner pulse ring */}
        <div className="absolute inset-[6px] rounded-full border border-white/15 border-b-white/50 animate-spin [animation-duration:2s] [animation-direction:reverse]" />
        {/* flower center */}
        <div className="animate-pulse">
          <FlowerSpinner />
        </div>
      </div>

      {/* Brand name */}
      <span
        className="text-5xl font-bold text-white mb-1 tracking-tight"
        style={{ fontFamily: "'Manjari', sans-serif" }}
      >
        Virunnu
      </span>

      {/* Tagline */}
      <p className="text-white/60 text-[11px] font-semibold tracking-[0.2em] uppercase mb-10">
        Kerala's hall &amp; catering marketplace
      </p>

      {/* Rotating status text */}
      <p
        className="text-white/90 text-sm font-medium text-center max-w-[260px] leading-relaxed"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 350ms ease" }}
      >
        {MESSAGES[idx]}
      </p>
    </div>
  );
}
