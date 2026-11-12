"use client";

import { CalendarPlus, Receipt } from "lucide-react";
import { NewMenu, type NewEntry } from "@/components/caterer-new-menu";
import { canOpenOwner } from "@/lib/owner-access";

// Everything an owner creates, one tap from any page.
const ENTRIES: (NewEntry & { page: string })[] = [
  { href: "/owner/calendar?new=1", page: "calendar", icon: CalendarPlus, label: "New booking", hint: "Phone or walk-in. Paste the message to fill it" },
  { href: "/owner/expenses?add=1", page: "expenses", icon: Receipt, label: "Add expense", hint: "Electricity, repairs, salaries…" },
];

export function OwnerNewMenu({ variant, deny }: { variant: "sidebar" | "fab"; deny?: string[] }) {
  const entries = ENTRIES.filter((e) => canOpenOwner(deny, e.href) && !deny?.includes(`ro.${e.page}`));
  return <NewMenu variant={variant} entries={entries} fabClass="bottom-[4.75rem]" />;
}
