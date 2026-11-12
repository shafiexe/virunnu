"use client";

import { MessageCircle, Phone, Send } from "lucide-react";

// On a phone the contact buttons stay at the bottom of the screen while the page scrolls. Enquire opens the enquiry form and takes you to it.
export function CatererStickyCta({ phone, whatsapp }: { phone: string; whatsapp: string | null }) {
  const enquire = () => {
    window.dispatchEvent(new Event("open-enquiry"));
    document.getElementById("enquiry")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const wa = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : null;
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-3 pt-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
      <div className="flex gap-2">
        <a href={`tel:${phone}`} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 py-3 text-sm font-semibold"><Phone className="h-4 w-4" /> Call</a>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-white py-3 text-sm font-semibold"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
        <button type="button" onClick={enquire} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-zinc-900 py-3 text-sm font-semibold"><Send className="h-4 w-4" /> Enquire</button>
      </div>
    </div>
  );
}
