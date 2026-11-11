import { Building2 } from "lucide-react";
import { CenterForm } from "@/components/center-form";

export default function ApplyVenuePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto">
          <Building2 className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Add Your Convention Center</h1>
        <p className="mx-auto max-w-2xl text-sm text-zinc-500 leading-relaxed">
          Fill in your details below — paste your website or Google Maps link and we&apos;ll fill most of it for you.
          Our team will review your request and send your login within 1–2 business days. You can update everything later.
        </p>
      </div>
      <CenterForm mode="apply" />
    </div>
  );
}
