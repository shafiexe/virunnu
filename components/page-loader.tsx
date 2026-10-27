"use client";

import { useEffect, useState } from "react";
import { VirunnuLogo } from "@/components/virunnu-logo";

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
          fill="#f59e0b"
          opacity="0.9"
          transform={`rotate(${i * 72} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="3" fill="#f59e0b" />
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-transparent select-none">

      {/* Spinner ring + flower */}
      <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
        {/* outer ring */}
        <div className="absolute inset-0 rounded-full border-[3px] border-amber-200 border-t-amber-500 animate-spin" />
        {/* inner pulse ring */}
        <div className="absolute inset-1.5 rounded-full border border-amber-100 border-b-amber-400 animate-spin [animation-duration:2s] [animation-direction:reverse]" />
        {/* flower center */}
        <div className="animate-pulse">
          <FlowerSpinner />
        </div>
      </div>

      {/* Brand wordmark */}
      <div className="mb-1">
        <VirunnuLogo fontSize={44} vColor="#D97706" flameColor="#F0A010" textColor="#D97706" />
      </div>

      {/* Tagline */}
      <p className="text-zinc-400 dark:text-zinc-500 text-[11px] font-semibold tracking-[0.2em] uppercase mb-10">
        Kerala's hall &amp; catering marketplace
      </p>

      {/* Rotating status text */}
      <p
        className="text-zinc-500 dark:text-zinc-400 text-sm font-medium text-center max-w-65 leading-relaxed"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 350ms ease" }}
      >
        {MESSAGES[idx]}
      </p>
    </div>
  );
}
