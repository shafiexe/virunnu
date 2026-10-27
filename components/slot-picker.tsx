"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Slot = {
  id: string;
  status: string;
  priceOverride: number | null;
  template: { name: string; startTime: string; endTime: string };
};

type Hall = {
  id: string;
  name: string;
  pricePerSlot: number;
  slots: Slot[];
};

type Props = { hall: Hall; date: string; venueId: string };

const STATUS_BASE: Record<string, string> = {
  AVAILABLE: "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer",
  HELD: "border-orange-200 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 cursor-not-allowed opacity-70",
  BOOKED: "border-zinc-200 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed opacity-50",
};

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Available",
  HELD: "Held",
  BOOKED: "Booked",
};

export function SlotPicker({ hall, date, venueId }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(date);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function changeDate(d: string) {
    setSelectedDate(d);
    setSelected(null);
    router.replace(`/venues/${venueId}?date=${d}`);
  }

  async function book() {
    if (!selected) return;
    setError("");
    setLoading(true);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hallSlotId: selected }),
    });

    setLoading(false);

    if (res.status === 401) { router.push("/login"); return; }
    if (res.status === 409) {
      setError("This slot was just taken. Please pick another.");
      setSelected(null);
      return;
    }
    if (!res.ok) { setError("Something went wrong. Please try again."); return; }

    const data = await res.json();
    router.push(`/bookings/${data.booking.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => changeDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition w-44"
        />
      </div>

      {hall.slots.length === 0 ? (
        <p className="text-sm text-zinc-500">No slots available for this date.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hall.slots.map((slot) => {
            const price = slot.priceOverride ?? hall.pricePerSlot;
            const isSelectable = slot.status === "AVAILABLE";
            const isSelected = selected === slot.id;

            return (
              <button
                key={slot.id}
                disabled={!isSelectable}
                onClick={() => isSelectable && setSelected(isSelected ? null : slot.id)}
                className={cn(
                  "text-left p-4 rounded-xl border-2 transition-all",
                  isSelected
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40"
                    : STATUS_BASE[slot.status] ?? STATUS_BASE.BOOKED
                )}
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-50">{slot.template.name}</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {slot.template.startTime} – {slot.template.endTime}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={cn("font-bold", isSelected ? "text-amber-700 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-50")}>
                    ₹{(price / 100).toLocaleString("en-IN")}
                  </span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    slot.status === "AVAILABLE"
                      ? isSelected ? "bg-amber-200 text-amber-800" : "bg-emerald-100 text-emerald-700"
                      : slot.status === "HELD" ? "bg-orange-100 text-orange-700" : "bg-zinc-200 text-zinc-500"
                  )}>
                    {isSelected ? "Selected" : STATUS_LABEL[slot.status] ?? slot.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {selected && (
        <button
          onClick={book}
          disabled={loading}
          className="w-full sm:w-auto rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60 px-6 py-3 text-sm font-semibold text-white transition-colors"
        >
          {loading ? "Reserving…" : "Reserve this slot"}
        </button>
      )}
    </div>
  );
}
