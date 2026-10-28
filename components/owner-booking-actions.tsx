"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal, X } from "lucide-react";

type DropdownPos = { top: number; right: number };

type Status = "PENDING" | "APPROVED" | "ADVANCE_PAID" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
type PaymentMethod = "ONLINE" | "CASH";

interface Props {
  bookingId: string;
  status: Status;
  totalPaise: number;
  advancePaise?: number | null;
  paymentMethod: PaymentMethod;
  cancelReason?: string | null;
  discountPaise?: number | null;
  discountReason?: string | null;
  onSuccess?: () => void;
}

type Panel = "cancel" | "restore" | "cash" | "adjust" | null;

export function OwnerBookingActions({ bookingId, status, totalPaise, advancePaise, cancelReason, discountPaise, discountReason, onSuccess }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos>({ top: 0, right: 0 });
  const [panel, setPanel] = useState<Panel>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function openDropdown() {
    if (open) { setOpen(false); return; }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setPanel(null);
    setError("");
    setOpen(true);
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // panel inputs
  const [reason, setReason] = useState("");
  const [cashRupees, setCashRupees] = useState("");
  const [cashFull, setCashFull] = useState(true);
  const [cashMethod, setCashMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [discountRupeesInput, setDiscountRupeesInput] = useState(discountPaise ? String(discountPaise / 100) : "");
  const [discountReasonInput, setDiscountReasonInput] = useState(discountReason ?? "");

  const totalRupees = totalPaise / 100;
  const remainingRupees = advancePaise ? (totalPaise - advancePaise) / 100 : totalRupees;

  async function call(url: string, method: string, body?: object) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return false; }
      return true;
    } finally {
      setLoading(false);
    }
  }

  function done() { setPanel(null); setOpen(false); router.refresh(); onSuccess?.(); }

  async function handleCancel() {
    if (!reason.trim()) { setError("Please enter a reason"); return; }
    const ok = await call(`/api/owner/bookings/${bookingId}`, "DELETE", { reason });
    if (ok) done();
  }

  async function handleRestore() {
    const ok = await call(`/api/owner/bookings/${bookingId}/restore`, "POST");
    if (ok) done();
  }

  async function handleCash() {
    const advanceP = cashFull ? 0 : Math.round(parseFloat(cashRupees || "0") * 100);
    const method = cashMethod === "CASH" ? "CASH" : "ONLINE";
    const ok = await call(`/api/owner/bookings/${bookingId}/cash`, "POST", { advancePaise: advanceP, method });
    if (ok) done();
  }

  async function handleDiscount() {
    const rupees = parseFloat(discountRupeesInput || "0");
    if (isNaN(rupees) || rupees < 0) { setError("Enter a valid discount amount (0 to remove)"); return; }
    const ok = await call(`/api/owner/bookings/${bookingId}/discount`, "PATCH", {
      discountPaise: Math.round(rupees * 100),
      discountReason: discountReasonInput.trim() || null,
    });
    if (ok) done();
  }

  const canCancel = status !== "CANCELLED" && status !== "EXPIRED";
  const canRestore = status === "CANCELLED";
  const canCash = status === "PENDING" || status === "APPROVED" || status === "ADVANCE_PAID";
  const canAdjust = status !== "CANCELLED" && status !== "EXPIRED";

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        onClick={openDropdown}
        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed z-50 w-48 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1"
          style={{ top: pos.top, right: pos.right }}
        >
          {cancelReason && (
            <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Cancel reason</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">{cancelReason}</p>
            </div>
          )}
          {canCash && (
            <button onClick={() => setPanel("cash")} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              💰 Record payment received
            </button>
          )}
          {canAdjust && (
            <button onClick={() => setPanel("adjust")} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-amber-600 dark:text-amber-400">
              🏷️ {discountPaise ? "Edit discount" : "Add discount"}
            </button>
          )}
          {canRestore && (
            <button onClick={() => setPanel("restore")} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-400">
              ↩ Restore booking
            </button>
          )}
          {canCancel && (
            <button onClick={() => setPanel("cancel")} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-red-600 dark:text-red-400">
              ✕ Cancel booking
            </button>
          )}
        </div>
      )}

      {/* Panel overlay */}
      {panel && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setPanel(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>

            {/* Cancel panel */}
            {panel === "cancel" && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Cancel booking</h3>
                  <button onClick={() => setPanel(null)}><X className="h-4 w-4 text-zinc-400" /></button>
                </div>
                <p className="text-xs text-zinc-500">This will release the slot. Enter the reason (visible to customer).</p>
                <textarea
                  rows={3}
                  placeholder="Reason for cancellation…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button onClick={handleCancel} disabled={loading} className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Cancel booking
                </button>
              </>
            )}

            {/* Restore panel */}
            {panel === "restore" && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Restore booking</h3>
                  <button onClick={() => setPanel(null)}><X className="h-4 w-4 text-zinc-400" /></button>
                </div>
                <p className="text-xs text-zinc-500">This will re-book the slot if it&apos;s still available.</p>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button onClick={handleRestore} disabled={loading} className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Restore booking
                </button>
              </>
            )}

            {/* Payment panel */}
            {panel === "cash" && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Record payment received</h3>
                  <button onClick={() => setPanel(null)}><X className="h-4 w-4 text-zinc-400" /></button>
                </div>

                {/* Payment method */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">How was it paid?</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { key: "CASH", icon: "💵", label: "Cash" },
                      { key: "UPI", icon: "📱", label: "UPI / GPay" },
                      { key: "CARD", icon: "💳", label: "Card" },
                    ] as const).map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setCashMethod(m.key)}
                        className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-xs font-medium transition-colors ${
                          cashMethod === m.key
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                            : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-amber-300"
                        }`}
                      >
                        <span>{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={cashFull} onChange={() => setCashFull(true)} className="accent-amber-500" />
                    <span>Full amount — ₹{remainingRupees.toLocaleString("en-IN")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={!cashFull} onChange={() => setCashFull(false)} className="accent-amber-500" />
                    <span>Advance only</span>
                  </label>
                  {!cashFull && (
                    <input
                      type="number"
                      min={1000}
                      step={100}
                      placeholder="Advance amount ₹"
                      value={cashRupees}
                      onChange={(e) => setCashRupees(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  )}
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button onClick={handleCash} disabled={loading} className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm payment received
                </button>
              </>
            )}

            {/* Discount panel */}
            {panel === "adjust" && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Add discount</h3>
                  <button onClick={() => setPanel(null)}><X className="h-4 w-4 text-zinc-400" /></button>
                </div>
                <p className="text-xs text-zinc-500">
                  Total: ₹{(totalPaise / 100).toLocaleString("en-IN")}. Enter a discount to reduce what the customer owes.
                </p>
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
                    <input
                      type="number"
                      min={0}
                      max={totalPaise / 100}
                      step={100}
                      placeholder="0"
                      value={discountRupeesInput}
                      onChange={(e) => setDiscountRupeesInput(e.target.value)}
                      className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Reason — e.g. Family member, referral…"
                    value={discountReasonInput}
                    onChange={(e) => setDiscountReasonInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button onClick={handleDiscount} disabled={loading} className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save discount
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
