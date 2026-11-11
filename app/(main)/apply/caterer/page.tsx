import { UtensilsCrossed } from "lucide-react";
import { CatererForm } from "@/components/caterer-form";

export default function ApplyCatererPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mx-auto">
          <UtensilsCrossed className="h-7 w-7 text-orange-600" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Add Your Catering Team</h1>
        <p className="mx-auto max-w-2xl text-sm text-zinc-500 leading-relaxed">
          Tell families where you serve, how many guests you handle and what you charge per plate — paste your website or upload your menu card
          and we&apos;ll fill in what we can. Our team will review your request and send your login within 1–2 business days. You can update everything later.
        </p>
      </div>
      <CatererForm mode="apply" />
    </div>
  );
}
