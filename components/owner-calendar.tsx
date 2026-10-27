"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Phone, User, IndianRupee, Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SendReminderButton } from "@/components/send-reminder";

type SlotTemplate = { id: string; name: string; startTime: string; endTime: string };
type Hall = { id: string; name: string; pricePerSlot: number; slotTemplates: SlotTemplate[] };
type Venue = { id: string; name: string; halls: Hall[] };
type SlotBooking = {
  id: string;
  status: string;
  totalPaise: number;
  advancePaise: number | null;
  guestName: string | null;
  guestPhone: string | null;
  user: { name: string | null; phone: string } | null;
};
type CalendarSlot = {
  id: string;
  date: string;
  status: "AVAILABLE" | "HELD" | "BOOKED";
  priceOverride: number | null;
  hall: { id: string; name: string; pricePerSlot: number };
  template: SlotTemplate;
  bookings: SlotBooking[];
};

const DOT_COLOR: Record<string, string> = {
  AVAILABLE: "bg-emerald-500",
  BLOCKED: "bg-zinc-300 dark:bg-zinc-600",
  HELD: "bg-amber-400",
  BOOKED: "bg-rose-500",
};
const PILL_COLOR: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  BLOCKED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  HELD: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  BOOKED: "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
};
const BADGE_COLOR: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  BLOCKED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  HELD: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  BOOKED: "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
};

function slotDisplayKey(slot: CalendarSlot): string {
  if (slot.status === "HELD" && slot.bookings.length === 0) return "BLOCKED";
  return slot.status;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type EditState = { bookingId: string; name: string; amount: number; advancePaise: number; additionalAdvanceRupees: string };
type BlockedDate = { id: string; hallId: string; date: string; reason: string | null };
const EMPTY_ADD = { hallId: "", templateId: "", customerName: "", customerPhone: "", totalRupees: "", advanceRupees: "" };

export function OwnerCalendar({ venues }: { venues: Venue[] }) {
  const [selectedVenueId, setSelectedVenueId] = useState(venues[0]?.id ?? "");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [blockLoading, setBlockLoading] = useState(false);

  const venue = venues.find((v) => v.id === selectedVenueId);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const fetchSlots = useCallback(async () => {
    if (!selectedVenueId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/owner/calendar?venueId=${selectedVenueId}&year=${year}&month=${month}`
      );
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots);
        setBlockedDates(data.blockedDates ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedVenueId, year, month]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // Slot map: "YYYY-MM-DD" → CalendarSlot[]
  const slotsByDate = new Map<string, CalendarSlot[]>();
  for (const s of slots) {
    const k = s.date.slice(0, 10);
    if (!slotsByDate.has(k)) slotsByDate.set(k, []);
    slotsByDate.get(k)!.push(s);
  }

  // For future non-blocked dates, fill in virtual AVAILABLE slots for templates that
  // don't yet have a DB record — so the calendar shows green by default.
  function getEffectiveSlots(dateStr: string): (CalendarSlot & { isVirtual?: boolean })[] {
    const real = slotsByDate.get(dateStr) ?? [];
    const isPast = dateStr < todayStr;
    const isBlocked = blockedDates.some((b) => b.date === dateStr);
    if (isPast || isBlocked || !venue?.halls[0]) return real;

    const hall = venue.halls[0];
    const bookedTemplateIds = new Set(real.map((s) => s.template.id));
    const virtual = hall.slotTemplates
      .filter((t) => !bookedTemplateIds.has(t.id))
      .map((t) => ({
        id: `virtual_${dateStr}_${t.id}`,
        date: dateStr,
        status: "AVAILABLE" as const,
        priceOverride: null,
        hall: { id: hall.id, name: hall.name, pricePerSlot: hall.pricePerSlot },
        template: t,
        bookings: [],
        isVirtual: true,
      }));

    return [...real, ...virtual].sort((a, b) =>
      a.template.startTime.localeCompare(b.template.startTime)
    );
  }

  // Calendar grid
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = (firstDayOfMonth.getDay() + 6) % 7; // Mon=0
  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, dateStr: null });

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthLabel = firstDayOfMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  function prevMonth() { setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDay(null); }
  function nextMonth() { setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDay(null); }

  function openAdd(templateId?: string) {
    const hall = venue?.halls[0];
    setAddForm({
      hallId: hall?.id ?? "",
      templateId: templateId ?? "",
      customerName: "",
      customerPhone: "",
      totalRupees: hall ? String(Math.round(hall.pricePerSlot / 100)) : "",
      advanceRupees: "",
    });
    setFormError("");
    setShowAddModal(true);
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!addForm.hallId || !addForm.templateId || !addForm.customerPhone || !addForm.totalRupees) {
      setFormError("Slot, phone and total amount are required.");
      return;
    }
    const totalRupees = parseInt(addForm.totalRupees);
    const advanceRupees = addForm.advanceRupees ? parseInt(addForm.advanceRupees) : 0;
    if (advanceRupees > totalRupees) {
      setFormError("Advance cannot exceed total amount.");
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch("/api/owner/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: selectedVenueId,
          hallId: addForm.hallId,
          templateId: addForm.templateId,
          date: selectedDay,
          customerPhone: addForm.customerPhone,
          customerName: addForm.customerName || undefined,
          amountRupees: totalRupees,
          advanceRupees: advanceRupees || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Something went wrong."); return; }
      setShowAddModal(false);
      setAddForm(EMPTY_ADD);
      await fetchSlots();
    } finally {
      setFormLoading(false);
    }
  }

  async function cancelBooking(bookingId: string) {
    const res = await fetch(`/api/owner/bookings/${bookingId}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    if (res.ok) await fetchSlots();
  }

  async function toggleSlotBlock(slot: CalendarSlot & { isVirtual?: boolean }) {
    const hallId = slot.hall.id;
    const templateId = slot.template.id;
    const date = slot.date;
    try {
      await fetch("/api/owner/hall-slots/toggle-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hallId, templateId, date }),
      });
      await fetchSlots();
    } catch {
      await fetchSlots();
    }
  }

  async function toggleBlock(dateStr: string) {
    if (!venue) return;
    const hallId = venue.halls[0]?.id;
    if (!hallId) return;
    const existing = blockedDates.find((b) => b.date === dateStr && b.hallId === hallId);

    // Optimistic update — instant visual toggle
    if (existing) {
      setBlockedDates((prev) => prev.filter((b) => b.id !== existing.id));
    } else {
      setBlockedDates((prev) => [...prev, { id: `tmp_${dateStr}`, hallId, date: dateStr, reason: null }]);
    }

    try {
      if (existing) {
        await fetch(`/api/owner/blocked-dates/${existing.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/owner/blocked-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hallId, date: dateStr }),
        });
      }
      // Sync real IDs from server (replaces tmp id)
      await fetchSlots();
    } catch {
      // Revert on failure
      await fetchSlots();
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setFormError("");
    const additionalAdvance = editing.additionalAdvanceRupees ? parseInt(editing.additionalAdvanceRupees) : 0;
    const newTotalAdvancePaise = editing.advancePaise + additionalAdvance * 100;
    if (newTotalAdvancePaise > editing.amount * 100) {
      setFormError("Total payments cannot exceed hall charge.");
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch(`/api/owner/bookings/${editing.bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: editing.name || undefined,
          amountRupees: editing.amount,
          additionalAdvanceRupees: additionalAdvance > 0 ? additionalAdvance : undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); setFormError(d.error ?? "Error"); return; }
      setEditing(null);
      await fetchSlots();
    } finally {
      setFormLoading(false);
    }
  }

  const selectedDaySlots = selectedDay ? getEffectiveSlots(selectedDay) : [];

  return (
    <div className="space-y-4">
      {/* Venue tabs */}
      {venues.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => { setSelectedVenueId(v.id); setSelectedDay(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                v.id === selectedVenueId
                  ? "bg-amber-500 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      {/* Calendar header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <ChevronLeft className="h-4 w-4 text-zinc-500" />
          </button>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50 min-w-[160px] text-center text-base">
            {monthLabel}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          </button>
          {loading && <span className="text-xs text-zinc-400 ml-2 animate-pulse">Refreshing…</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><span className={cn("w-2 h-2 rounded-full", DOT_COLOR.AVAILABLE)} /> Available</span>
            <span className="flex items-center gap-1.5"><span className={cn("w-2 h-2 rounded-full", DOT_COLOR.BLOCKED)} /> Blocked</span>
            <span className="flex items-center gap-1.5"><span className={cn("w-2 h-2 rounded-full", DOT_COLOR.HELD)} /> On hold</span>
            <span className="flex items-center gap-1.5"><span className={cn("w-2 h-2 rounded-full", DOT_COLOR.BOOKED)} /> Booked</span>
          </div>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {cells.map((cell, i) => {
          if (!cell.dateStr) {
            return (
              <div key={i} className="border-r border-b border-zinc-200 dark:border-zinc-800 min-h-[80px] sm:min-h-[100px] bg-zinc-50/60 dark:bg-zinc-900/30" />
            );
          }
          const daySlots = getEffectiveSlots(cell.dateStr);
          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedDay;
          const isPast = cell.dateStr < todayStr;
          const isBlocked = blockedDates.some((b) => b.date === cell.dateStr);

          return (
            <button
              key={cell.dateStr}
              onClick={() => !isPast && setSelectedDay((prev) => (prev === cell.dateStr ? null : cell.dateStr))}
              disabled={isPast}
              className={cn(
                "border-r border-b border-zinc-200 dark:border-zinc-800 p-1 sm:p-1.5 text-left transition-colors relative",
                "min-h-[80px] sm:min-h-[100px]",
                isPast
                  ? "bg-zinc-50/70 dark:bg-zinc-900/20 cursor-not-allowed opacity-50"
                  : isBlocked
                  ? "bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/40"
                  : isSelected
                  ? "bg-amber-50 dark:bg-amber-950/20"
                  : "bg-white dark:bg-zinc-900 hover:bg-amber-50/60 dark:hover:bg-amber-950/10"
              )}
            >
              {/* Day number */}
              <div className="flex items-center gap-1 mb-1">
                <div className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold shrink-0",
                  isToday ? "bg-amber-500 text-white" : isPast ? "text-zinc-400" : "text-zinc-700 dark:text-zinc-300"
                )}>
                  {cell.day}
                </div>
                {isBlocked && <Ban className="h-3 w-3 text-zinc-400" />}
              </div>

              {/* Slot pills — desktop shows label, mobile shows dots */}
              <div className="space-y-0.5">
                {daySlots.slice(0, 2).map((slot) => (
                  <div
                    key={slot.id}
                    className={cn(
                      "hidden sm:block text-[9px] px-1 py-0.5 rounded truncate leading-tight font-medium",
                      PILL_COLOR[slotDisplayKey(slot)] ?? PILL_COLOR.AVAILABLE
                    )}
                  >
                    {slot.hall.name} · {slot.template.name}
                  </div>
                ))}
                {/* Mobile: dots only */}
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {daySlots.slice(0, 4).map((slot) => (
                    <span key={slot.id} className={cn("w-2 h-2 rounded-full", DOT_COLOR[slotDisplayKey(slot)] ?? DOT_COLOR.AVAILABLE)} />
                  ))}
                </div>
                {daySlots.length > 2 && (
                  <div className="hidden sm:block text-[9px] text-zinc-400 pl-1">
                    +{daySlots.length - 2} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          {/* Panel header */}
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-IN", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </span>
              <span className="ml-2 text-xs text-zinc-400">
                {selectedDaySlots.length} slot{selectedDaySlots.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(() => {
                const isDateBlocked = blockedDates.some((b) => b.date === selectedDay);
                return (
                  <button
                    onClick={() => selectedDay && toggleBlock(selectedDay)}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                      isDateBlocked
                        ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                        : "border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    {isDateBlocked ? "Unblock date" : "Block date"}
                  </button>
                );
              })()}
              <button
                onClick={() => openAdd()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add booking
              </button>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Slot list */}
          {selectedDaySlots.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-zinc-400 text-sm">No slot templates configured.</p>
              <p className="text-zinc-300 dark:text-zinc-600 text-xs mt-1">
                Add slot templates in My Venues → Templates.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <div className="p-4">
                <div className="space-y-2">
                  {selectedDaySlots.map((slot) => {
                          const booking = slot.bookings[0];
                          const isVirtual = (slot as CalendarSlot & { isVirtual?: boolean }).isVirtual;
                          return (
                            <div
                              key={slot.id}
                              className="flex items-start gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20"
                            >
                              <div className={cn("mt-1 w-2.5 h-2.5 rounded-full shrink-0", DOT_COLOR[slotDisplayKey(slot)])} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-2">
                                  <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
                                    {slot.template.name}
                                  </span>
                                  <span className="text-xs text-zinc-500">
                                    {slot.template.startTime} – {slot.template.endTime}
                                  </span>
                                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", BADGE_COLOR[slotDisplayKey(slot)])}>
                                    {slotDisplayKey(slot)}
                                  </span>
                                </div>
                                {booking && (
                                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {booking.user?.name ?? booking.guestName ?? "No name"}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {booking.user?.phone ?? booking.guestPhone ?? ""}
                                    </span>
                                    <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                                      <IndianRupee className="h-3 w-3" />
                                      {(booking.totalPaise / 100).toLocaleString("en-IN")}
                                    </span>
                                    <SendReminderButton
                                      data={{
                                        customerPhone: booking.user?.phone ?? booking.guestPhone ?? "",
                                        customerName: booking.user?.name ?? booking.guestName ?? null,
                                        venueName: venue?.name ?? "",
                                        hallName: slot.hall.name,
                                        bookingDate: new Date(slot.date + "T12:00:00").toLocaleDateString("en-IN", {
                                          day: "numeric", month: "long", year: "numeric",
                                        }),
                                        slotName: slot.template.name,
                                        startTime: slot.template.startTime,
                                        endTime: slot.template.endTime,
                                        totalPaise: booking.totalPaise,
                                        bookingId: booking.id,
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                              {isVirtual ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => openAdd(slot.template.id)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 px-2.5 py-1.5 rounded-lg transition-colors"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Book
                                  </button>
                                  <button
                                    onClick={() => toggleSlotBlock(slot)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5 py-1.5 rounded-lg transition-colors"
                                    title="Block this slot"
                                  >
                                    <Ban className="h-3 w-3" />
                                    Block
                                  </button>
                                </div>
                              ) : !booking && slot.status === "HELD" ? (
                                <button
                                  onClick={() => toggleSlotBlock(slot)}
                                  className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-2.5 py-1.5 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
                                  title="Unblock this slot"
                                >
                                  <Ban className="h-3 w-3" />
                                  Unblock
                                </button>
                              ) : !booking && slot.status === "AVAILABLE" ? (
                                <button
                                  onClick={() => toggleSlotBlock(slot)}
                                  className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5 py-1.5 rounded-lg transition-colors"
                                  title="Block this slot"
                                >
                                  <Ban className="h-3 w-3" />
                                  Block
                                </button>
                              ) : booking && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {confirmDeleteId === booking.id ? (
                                    <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-1.5">
                                      <span className="text-xs text-red-700 dark:text-red-400 font-medium">Cancel booking?</span>
                                      <button
                                        onClick={() => cancelBooking(booking.id)}
                                        className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="text-xs text-zinc-400 hover:text-zinc-600"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditing({
                                            bookingId: booking.id,
                                            name: booking.user?.name ?? booking.guestName ?? "",
                                            amount: Math.round(booking.totalPaise / 100),
                                            advancePaise: booking.advancePaise ?? 0,
                                            additionalAdvanceRupees: "",
                                          });
                                          setFormError("");
                                        }}
                                        className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                                        title="Edit booking"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(booking.id)}
                                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                        title="Cancel booking"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Booking Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Add phone booking</h3>
                {selectedDay && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-IN", {
                      weekday: "long", day: "numeric", month: "long",
                    })}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitAdd} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Slot */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Slot *</label>
                  <select
                    value={addForm.templateId}
                    onChange={(e) => setAddForm((f) => ({ ...f, templateId: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">Select slot</option>
                    {venue?.halls.find((h) => h.id === addForm.hallId)?.slotTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.startTime} – {t.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Customer name</label>
                  <input
                    type="text"
                    placeholder="e.g. Anand Krishnan"
                    value={addForm.customerName}
                    onChange={(e) => setAddForm((f) => ({ ...f, customerName: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Mobile */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Mobile *</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={addForm.customerPhone}
                    onChange={(e) => setAddForm((f) => ({ ...f, customerPhone: e.target.value }))}
                    maxLength={15}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                {/* Total amount — read-only, prefilled from hall price */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Hall charge (₹) *</label>
                  <input
                    type="number"
                    value={addForm.totalRupees}
                    onChange={(e) => setAddForm((f) => ({ ...f, totalRupees: e.target.value }))}
                    min={1}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                {/* Advance paid */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Advance paid (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={addForm.advanceRupees}
                    onChange={(e) => setAddForm((f) => ({ ...f, advanceRupees: e.target.value }))}
                    min={0}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Balance summary */}
                {addForm.totalRupees && (
                  <div className="col-span-2 flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm">
                    <span className="text-zinc-500">Balance due</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      ₹{Math.max(0, parseInt(addForm.totalRupees || "0") - parseInt(addForm.advanceRupees || "0")).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>

              {formError && <p className="text-sm text-red-500">{formError}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {formLoading ? "Creating…" : "Confirm booking"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Edit booking</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitEdit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Customer name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Hall charge (₹)</label>
                <input
                  type="number"
                  value={editing.amount}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, amount: parseInt(e.target.value) || 0 } : null)}
                  min={1}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              {editing.advancePaise > 0 && (
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm flex items-center justify-between">
                  <span className="text-zinc-500">Already paid</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ₹{(editing.advancePaise / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  {editing.advancePaise > 0 ? "Additional payment (₹)" : "Advance paid (₹)"}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={editing.additionalAdvanceRupees}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, additionalAdvanceRupees: e.target.value } : null)}
                  min={0}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              {/* Balance summary */}
              {editing.amount > 0 && (
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm flex items-center justify-between">
                  <span className="text-zinc-500">Balance due</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    ₹{Math.max(0, editing.amount - Math.round(editing.advancePaise / 100) - parseInt(editing.additionalAdvanceRupees || "0")).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {formLoading ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
