import { BookingLookupForm } from "@/components/booking-lookup-form";
import { Search } from "lucide-react";

export const metadata = {
  title: "Track your booking — Virunnu",
};

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto mb-5">
        <Search className="h-7 w-7 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Track your booking
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        Enter your booking reference to see the status, venue details, and payment information.
      </p>
      <BookingLookupForm />
      <p className="mt-6 text-xs text-zinc-400">
        Your booking reference was sent via WhatsApp and email when you confirmed.
      </p>
    </div>
  );
}
