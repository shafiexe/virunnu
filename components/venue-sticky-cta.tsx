"use client";

import { CalendarDays, MessageCircle, Phone } from "lucide-react";

// On a phone the contact buttons stay at the bottom while the page scrolls; "Check dates" jumps to the booking calendar.
export function VenueStickyCta({ phone, whatsapp, targetId }: { phone: string | null; whatsapp: string | null; targetId: string | null }) {
  const wa = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : null;
  if (!phone && !wa && !targetId) return null;
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-3 pt-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
      <div className="flex gap-2">
        {phone && <a href={`tel:${phone}`} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-white py-3 text-sm font-semibold"><Phone className="h-4 w-4" /> Call</a>}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-zinc-900 py-3 text-sm font-semibold"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
        {targetId && <button type="button" onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-zinc-900 py-3 text-sm font-semibold"><CalendarDays className="h-4 w-4" /> Check dates</button>}
      </div>
    </div>
  );
}
