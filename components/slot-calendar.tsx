"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RazorpayConstructor = any;

type RawSlot = {
  id: string;
  date: string;
  status: "AVAILABLE" | "HELD" | "BOOKED";
  priceOverride: number | null;
  template: { name: string; startTime: string; endTime: string };
};

type Hall = {
  id: string;
  name: string;
  capacity: number;
  pricePerSlot: number;
  minimumAdvancePaise: number;
  requireFullPayment: boolean;
  slots: RawSlot[];
};

type DayStatus = "available" | "held" | "booked" | "none";

type Props = {
  venueId: string;
  halls: Hall[];
  initialMonth: string; // "YYYY-MM"
};

type PaymentContext = {
  hallSlotId: string;
  totalPaise: number;
  minimumAdvancePaise: number;
  requireFullPayment: boolean;
};

type BookingPath = "pay" | "request";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(raw: string) {
  return raw.split("T")[0];
}

function getDayStatus(slots: RawSlot[]): DayStatus {
  if (!slots.length) return "none";
  if (slots.some((s) => s.status === "AVAILABLE")) return "available";
  if (slots.some((s) => s.status === "HELD")) return "held";
  return "booked";
}

function buildDayMap(halls: Hall[]): Map<string, { hall: Hall; slots: RawSlot[] }[]> {
  const map = new Map<string, { hall: Hall; slots: RawSlot[] }[]>();
  for (const hall of halls) {
    for (const slot of hall.slots) {
      const day = toDateKey(slot.date);
      if (!map.has(day)) map.set(day, []);
      const entries = map.get(day)!;
      const existing = entries.find((e) => e.hall.id === hall.id);
      if (existing) {
        existing.slots.push(slot);
      } else {
        entries.push({ hall, slots: [slot] });
      }
    }
  }
  return map;
}

function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function paise(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN")}`;
}

const SLOT_STATUS_STYLE = {
  AVAILABLE: "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer",
  HELD: "border-orange-200 bg-orange-50 dark:bg-orange-950/20 cursor-not-allowed opacity-70",
  BOOKED: "border-zinc-200 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed opacity-50",
};

function SlotCard({
  slot,
  pricePerSlot,
  selected,
  onSelect,
}: {
  slot: RawSlot;
  pricePerSlot: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const price = slot.priceOverride ?? pricePerSlot;
  const isAvailable = slot.status === "AVAILABLE";
  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={isAvailable ? onSelect : undefined}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all",
        selected
          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40"
          : SLOT_STATUS_STYLE[slot.status]
      )}
    >
      <div className="font-medium text-zinc-900 dark:text-zinc-50 text-sm">{slot.template.name}</div>
      <div className="text-xs text-zinc-500 mt-0.5">
        {slot.template.startTime} – {slot.template.endTime}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className={cn("font-bold text-sm", selected ? "text-amber-700 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-50")}>
          ₹{(price / 100).toLocaleString("en-IN")}
        </span>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full font-medium",
          slot.status === "AVAILABLE"
            ? selected ? "bg-amber-200 text-amber-800" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            : slot.status === "HELD" ? "bg-orange-100 text-orange-700" : "bg-zinc-200 text-zinc-500"
        )}>
          {selected ? "Selected" : slot.status === "AVAILABLE" ? "Available" : slot.status === "HELD" ? "On hold" : "Booked"}
        </span>
      </div>
    </button>
  );
}

function InputField({
  label, required, type = "text", value, onChange, placeholder,
}: {
  label: string; required?: boolean; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  );
}

export function SlotCalendar({ venueId, halls: initialHalls, initialMonth }: Props) {
  const router = useRouter();
  const [year, setYear] = useState(() => parseInt(initialMonth.split("-")[0]));
  const [month, setMonth] = useState(() => parseInt(initialMonth.split("-")[1]) - 1);
  const [halls, setHalls] = useState<Hall[]>(initialHalls);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookError, setBookError] = useState("");

  // Checkout steps
  const [checkoutStep, setCheckoutStep] = useState<"idle" | "choose" | "form" | "payment" | "requested">("idle");
  const [bookingPath, setBookingPath] = useState<BookingPath>("pay");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestAddress, setGuestAddress] = useState("");
  const [payCtx, setPayCtx] = useState<PaymentContext | null>(null);
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const today = formatDay(new Date());

  const loadMonth = useCallback(
    async (y: number, m: number) => {
      setLoading(true);
      setSelectedDay(null);
      setSelectedSlot(null);
      setCheckoutStep("idle");
      const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const last = new Date(y, m + 1, 0).getDate();
      const to = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
      const updated = await Promise.all(
        initialHalls.map(async (hall) => {
          const res = await fetch(
            `/api/venues/${venueId}/halls/${hall.id}/slots?from=${from}&to=${to}`
          );
          const data = res.ok ? await res.json() : { slots: [] };
          return { ...hall, slots: data.slots ?? [] };
        })
      );
      setHalls(updated);
      setLoading(false);
    },
    [venueId, initialHalls]
  );

  function prevMonth() {
    const ny = month === 0 ? year - 1 : year;
    const nm = month === 0 ? 11 : month - 1;
    setYear(ny); setMonth(nm); loadMonth(ny, nm);
  }

  function nextMonth() {
    const ny = month === 11 ? year + 1 : year;
    const nm = month === 11 ? 0 : month + 1;
    setYear(ny); setMonth(nm); loadMonth(ny, nm);
  }

  const dayMap = buildDayMap(halls);
  const cells = monthGrid(year, month);

  function resetCheckout() {
    setCheckoutStep("idle");
    setBookingPath("pay");
    setPayCtx(null);
    setPayError("");
    setBookError("");
  }

  function handleDayClick(day: string, status: DayStatus) {
    if (status === "none" || day < today) return;
    if (selectedDay === day) { setSelectedDay(null); setSelectedSlot(null); resetCheckout(); return; }
    setSelectedDay(day);
    setSelectedSlot(null);
    resetCheckout();
  }

  function getPayCtxForSlot() {
    const hallEntry = [...dayMap.values()].flat().find((e) => e.slots.some((s) => s.id === selectedSlot));
    const slot = hallEntry?.slots.find((s) => s.id === selectedSlot);
    const hall = hallEntry?.hall;
    if (!hall || !slot) return null;
    // Owner price is GST-inclusive — use directly
    const totalPaise = slot.priceOverride ?? hall.pricePerSlot;
    return {
      hallSlotId: selectedSlot!,
      totalPaise,
      minimumAdvancePaise: hall.minimumAdvancePaise,
      requireFullPayment: hall.requireFullPayment,
    };
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    if (bookingPath === "pay") {
      const ctx = getPayCtxForSlot();
      if (!ctx) return;
      setPayCtx(ctx);
      setCheckoutStep("payment");
    } else {
      handleRequestSubmit();
    }
  }

  async function handleRequestSubmit() {
    if (!selectedSlot) return;
    setBookError("");
    setRequesting(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hallSlotId: selectedSlot, guestName, guestPhone, guestEmail, guestAddress }),
    });
    setRequesting(false);
    if (res.status === 409) {
      setBookError("Slot just taken — please choose another.");
      setSelectedSlot(null);
      setCheckoutStep("idle");
      return;
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setBookError(d.error ?? "Something went wrong. Try again.");
      return;
    }
    setCheckoutStep("requested");
  }

  async function handlePay(amountPaise: number, isFullPayment: boolean) {
    if (!payCtx) return;
    setPayError("");
    setPaying(true);

    // Create Razorpay order (no booking yet — slot not held)
    const orderRes = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hallSlotId: payCtx.hallSlotId,
        amountPaise,
        isFullPayment,
        guestName,
        guestPhone,
        guestEmail: guestEmail || null,
        guestAddress: guestAddress || null,
      }),
    });
    if (!orderRes.ok) {
      setPayError("Could not initiate payment. Try again.");
      setPaying(false);
      return;
    }
    const { orderId } = await orderRes.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!win.Razorpay) {
      await new Promise<void>((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    }

    const rzp = new (win.Razorpay as RazorpayConstructor)({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_placeholder",
      order_id: orderId,
      amount: amountPaise,
      currency: "INR",
      name: "Virunnu",
      description: isFullPayment ? "Full payment" : "Advance payment",
      prefill: { name: guestName, contact: guestPhone, email: guestEmail },
      theme: { color: "#f59e0b" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: async (response: any) => {
        // Payment done — now atomically create booking + hold slot 1hr (awaiting owner approval)
        const confirmRes = await fetch("/api/bookings/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hallSlotId: payCtx.hallSlotId,
            guestName, guestPhone,
            guestEmail: guestEmail || null,
            guestAddress: guestAddress || null,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            amountPaise,
            isFullPayment,
          }),
        });
        setPaying(false);
        if (confirmRes.ok) {
          const { bookingId } = await confirmRes.json();
          router.push(`/track/${bookingId}?paid=1`);
        } else if (confirmRes.status === 409) {
          setPayError("Slot was just taken by someone else. A refund will be issued automatically.");
        } else {
          setPayError("Payment recorded but booking failed. Contact support with your payment ID.");
        }
      },
      modal: { ondismiss: () => setPaying(false) },
    });
    rzp.open();
  }

  const selectedDayEntries = selectedDay ? (dayMap.get(selectedDay) ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={prevMonth} disabled={loading}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          aria-label="Previous month">
          <ChevronLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        </button>
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">{MONTHS[month]} {year}</span>
        <button type="button" onClick={nextMonth} disabled={loading}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          aria-label="Next month">
          <ChevronRight className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {DAYS.map((d) => (
          <div key={d} className="text-xs font-semibold text-zinc-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={cn("grid grid-cols-7 gap-px bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 transition-opacity", loading && "opacity-50")}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="bg-white dark:bg-zinc-900 min-h-[72px]" />;
          const dayKey = formatDay(day);
          const entries = dayMap.get(dayKey) ?? [];
          const allSlots = entries.flatMap((e) => e.slots);
          const status = getDayStatus(allSlots);
          const isToday = dayKey === today;
          const isPast = dayKey < today;
          const isSelected = selectedDay === dayKey;
          const allHeld = !isPast && allSlots.length > 0 && allSlots.every((s) => s.status === "HELD");
          const isClickable = !isPast && (status !== "none" || allSlots.length > 0);

          return (
            <button key={dayKey} type="button" disabled={!isClickable}
              onClick={() => handleDayClick(dayKey, status)}
              className={cn(
                "relative flex flex-col items-start pt-1.5 pb-1.5 px-1 min-h-[72px] transition-colors text-left bg-white dark:bg-zinc-900",
                isPast ? "opacity-30 cursor-default"
                  : isSelected ? "bg-amber-50 dark:bg-amber-950/30"
                  : allHeld ? "bg-orange-50/60 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30 cursor-pointer"
                  : isClickable ? "hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer"
                  : "cursor-default"
              )}>
              <span className={cn(
                "text-xs sm:text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full leading-none mb-1 self-center",
                isToday && !isSelected ? "ring-2 ring-amber-400 text-amber-700 dark:text-amber-400 font-bold"
                  : isSelected ? "bg-amber-500 text-white font-bold"
                  : "text-zinc-800 dark:text-zinc-200"
              )}>{day.getDate()}</span>
              {!isPast && allSlots.map((slot) => (
                <div key={slot.id} className={cn(
                  "flex items-center gap-0.5 w-full rounded px-0.5 py-px mb-px",
                  slot.status === "AVAILABLE" ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-zinc-100 dark:bg-zinc-800"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                    slot.status === "AVAILABLE" ? "bg-emerald-500"
                    : slot.status === "HELD" ? "bg-amber-400" : "bg-zinc-400"
                  )} />
                  <span className={cn("text-[9px] font-medium truncate",
                    slot.status === "AVAILABLE" ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"
                  )}>{slot.template.name}</span>
                </div>
              ))}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Available</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />On hold</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 inline-block" />Booked</span>
      </div>

      {/* Day slot panel */}
      {selectedDay && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10 p-4 space-y-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
            {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-IN", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </h3>

          {selectedDayEntries.length === 0 ? (
            <p className="text-sm text-zinc-500">No slots configured for this date.</p>
          ) : (() => {
            const allSlotsHeld = selectedDayEntries.flatMap((e) => e.slots).every((s) => s.status === "HELD");
            return (
              <>
                {/* Slot cards — only show when not yet in checkout */}
                {checkoutStep === "idle" && selectedDayEntries.map(({ hall, slots }) => (
                  <div key={hall.id} className="space-y-2">
                    {selectedDayEntries.length > 1 && (
                      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{hall.name}</div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {slots.map((slot) => (
                        <SlotCard key={slot.id} slot={slot} pricePerSlot={hall.pricePerSlot}
                          selected={selectedSlot === slot.id}
                          onSelect={() => { setSelectedSlot(selectedSlot === slot.id ? null : slot.id); setBookError(""); }}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {allSlotsHeld && checkoutStep === "idle" && (
                  <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 px-4 py-3 flex items-start gap-3">
                    <span className="text-orange-500 text-lg leading-none mt-0.5">📞</span>
                    <div>
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-300">All slots are currently on hold</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                        Please contact the venue directly to check availability or make a reservation for this date.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 1 — choose booking path */}
                {checkoutStep === "idle" && selectedSlot && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">How would you like to book?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button type="button"
                        onClick={() => { setBookingPath("pay"); setCheckoutStep("form"); }}
                        className="rounded-xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 px-4 py-3 text-left transition-colors">
                        <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">Pay & Book</div>
                        <div className="text-xs text-zinc-500 mt-0.5">Pay advance or full amount online — slot confirmed instantly</div>
                      </button>
                      <button type="button"
                        onClick={() => { setBookingPath("request"); setCheckoutStep("form"); }}
                        className="rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 px-4 py-3 text-left transition-colors">
                        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Request to Book</div>
                        <div className="text-xs text-zinc-500 mt-0.5">No payment now — owner approves within 1 hour</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2 — guest details form */}
                {checkoutStep === "form" && (
                  <form onSubmit={handleFormSubmit} className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <button type="button" onClick={() => setCheckoutStep("idle")}
                        className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {bookingPath === "pay" ? "Pay & Book — Your details" : "Request to Book — Your details"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InputField label="Full name" required value={guestName} onChange={setGuestName} placeholder="Mohammed Shafi" />
                      <InputField label="Phone number" required type="tel" value={guestPhone} onChange={setGuestPhone} placeholder="+91 98765 43210" />
                    </div>
                    <InputField label="Email address" value={guestEmail} onChange={setGuestEmail} placeholder="optional" type="email" />
                    <InputField label="Address" value={guestAddress} onChange={setGuestAddress} placeholder="optional" />
                    {bookError && <p className="text-sm text-red-500">{bookError}</p>}
                    <button type="submit" disabled={requesting}
                      className="w-full sm:w-auto rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60 px-6 py-3 text-sm font-semibold text-white transition-colors">
                      {requesting ? "Sending request…" : bookingPath === "pay" ? "Continue to payment →" : "Send booking request →"}
                    </button>
                  </form>
                )}

                {/* Request submitted confirmation */}
                {checkoutStep === "requested" && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-4 space-y-2">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Booking request sent</p>
                    <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                      <p>The owner will approve or reject your request within <strong>1 hour</strong>.</p>
                      <p className="text-red-600 dark:text-red-400 font-medium">⚠ If the owner does not respond in 1 hour, the slot will be automatically released and your request cancelled.</p>
                      <p>You will be contacted on <span className="font-semibold">{guestPhone}</span> with the decision.</p>
                    </div>
                  </div>
                )}

                {/* Step 3 — payment (slot NOT held yet — only held after payment succeeds) */}
                {checkoutStep === "payment" && payCtx && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Slot total (GST included)</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-50">{paise(payCtx.totalPaise)}</span>
                      </div>
                      {!payCtx.requireFullPayment && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Advance to pay now</span>
                            <span className="font-semibold text-amber-600">{paise(payCtx.minimumAdvancePaise)}</span>
                          </div>
                          <div className="flex justify-between text-sm border-t border-zinc-100 dark:border-zinc-700 pt-2">
                            <span className="text-zinc-500">Balance (cash on the day)</span>
                            <span className="text-zinc-500">{paise(Math.max(0, payCtx.totalPaise - payCtx.minimumAdvancePaise))}</span>
                          </div>
                        </>
                      )}
                      <p className="text-xs text-zinc-400 pt-1">
                        After payment, slot will be held 1 hour while owner confirms your booking.
                      </p>
                    </div>

                    {payError && <p className="text-sm text-red-500">{payError}</p>}

                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Advance button — shown only when full payment is NOT required */}
                      {!payCtx.requireFullPayment && (
                        <button type="button" disabled={paying}
                          onClick={() => handlePay(payCtx.minimumAdvancePaise, false)}
                          className="flex-1 rounded-xl border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-60 px-5 py-3 text-sm font-semibold transition-colors">
                          {paying ? "Opening payment…" : `Pay advance ${paise(payCtx.minimumAdvancePaise)}`}
                        </button>
                      )}
                      {/* Full payment button — shown only when owner requires full payment online */}
                      {payCtx.requireFullPayment && (
                        <button type="button" disabled={paying}
                          onClick={() => handlePay(payCtx.totalPaise, true)}
                          className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60 px-5 py-3 text-sm font-semibold text-white transition-colors">
                          {paying ? "Opening payment…" : `Pay in full ${paise(payCtx.totalPaise)}`}
                        </button>
                      )}
                    </div>
                    <button type="button" onClick={() => setCheckoutStep("form")}
                      className="text-xs text-zinc-400 hover:text-zinc-600 underline">
                      ← Back to details
                    </button>
                  </div>
                )}
              </>
            );
          })()}

          {bookError && checkoutStep === "idle" && !selectedSlot && (
            <p className="text-sm text-red-500">{bookError}</p>
          )}
        </div>
      )}
    </div>
  );
}
