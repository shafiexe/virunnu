"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

export function HoldCountdown({ heldUntil }: { heldUntil: string }) {
  const router = useRouter();
  const [secsLeft, setSecsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(heldUntil).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    if (secsLeft <= 0) return;
    const id = setInterval(() => {
      setSecsLeft((s) => {
        if (s <= 1) { clearInterval(id); router.refresh(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [heldUntil, router, secsLeft]);

  const mins = Math.floor(secsLeft / 60).toString().padStart(2, "0");
  const secs = (secsLeft % 60).toString().padStart(2, "0");

  if (secsLeft <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-sm font-medium">
        <Clock className="h-4 w-4" />
        Hold expired — slot released
      </div>
    );
  }

  const urgent = secsLeft < 120;
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
      urgent
        ? "bg-red-50 border-red-200 text-red-600"
        : "bg-amber-50 border-amber-200 text-amber-700"
    }`}>
      <Clock className="h-4 w-4" />
      <span>Complete payment within </span>
      <span className="font-mono text-base font-bold">{mins}:{secs}</span>
    </div>
  );
}
