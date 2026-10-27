"use client";

import { useState } from "react";
import { MessageSquare, X, Copy, Check, ExternalLink, Send } from "lucide-react";

type ReminderData = {
  customerPhone: string;
  customerName: string | null;
  venueName: string;
  hallName: string;
  bookingDate: string;
  slotName: string;
  startTime: string;
  endTime: string;
  totalPaise: number;
  advancePaise?: number | null;
  bookingId: string;
};

function toWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function buildMessage(d: ReminderData): string {
  const total = (d.totalPaise / 100).toLocaleString("en-IN");
  const paid = ((d.advancePaise ?? 0) / 100).toLocaleString("en-IN");
  const balance = ((d.totalPaise - (d.advancePaise ?? 0)) / 100).toLocaleString("en-IN");
  const hasBalance = (d.advancePaise ?? 0) > 0 && (d.advancePaise ?? 0) < d.totalPaise;
  const name = d.customerName ?? "there";
  return (
    `🔔 *Payment Reminder — ${d.venueName}*\n\n` +
    `Hi ${name},\n\n` +
    `This is a reminder for your upcoming booking.\n\n` +
    `📍 *${d.venueName}* (${d.hallName})\n` +
    `📅 ${d.bookingDate}\n` +
    `⏰ ${d.slotName} (${d.startTime}–${d.endTime})\n` +
    `💰 Total: ₹${total}\n` +
    (hasBalance
      ? `💵 Paid: ₹${paid}\n⚠️ *Balance due: ₹${balance}*\n`
      : `\nPlease complete your payment to confirm the booking.\n`) +
    `\nRef: ${d.bookingId.slice(-8).toUpperCase()}\n\n` +
    `— Team ${d.venueName}`
  );
}

export function SendReminderButton({ data }: { data: ReminderData }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  const message = buildMessage(data);
  const waPhone = toWhatsAppPhone(data.customerPhone);
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;

  async function sendViaVirunnu() {
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(`/api/owner/bookings/${data.bookingId}/remind`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setSendError(json.error ?? "Failed to send"); return; }
      setSent(true);
      setTimeout(() => { setSent(false); setOpen(false); }, 2000);
    } catch {
      setSendError("Network error — please try again");
    } finally {
      setSending(false);
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select textarea
    }
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap"
        title="Send payment reminder"
      >
        <MessageSquare className="h-3 w-3" />
        Remind
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">Payment Reminder</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {data.customerName ?? "Customer"} · {data.customerPhone}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Message preview */}
            <div className="px-5 py-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 block">
                Message preview
              </label>
              <pre className="whitespace-pre-wrap text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 font-sans leading-relaxed max-h-56 overflow-y-auto">
                {message}
              </pre>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex flex-col gap-2">
              {/* Auto-send via Virunnu (Twilio) */}
              <button
                onClick={sendViaVirunnu}
                disabled={sending || sent}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {sent ? (
                  <><Check className="h-4 w-4" /> Sent!</>
                ) : sending ? (
                  <><Send className="h-4 w-4 animate-pulse" /> Sending…</>
                ) : (
                  <><Send className="h-4 w-4" /> Auto-send via Virunnu</>
                )}
              </button>
              {sendError && <p className="text-xs text-red-500 text-center">{sendError}</p>}

              <div className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">or send manually</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
              </div>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe5a] text-white text-sm font-semibold transition-colors"
              >
                <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.858L.054 23.25a.75.75 0 00.917.916l5.42-1.476A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.93 0-3.742-.524-5.295-1.436l-.38-.222-3.939 1.072 1.073-3.924-.228-.392A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                Open in WhatsApp
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>

              <button
                onClick={copyMessage}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {copied ? (
                  <><Check className="h-4 w-4 text-emerald-500" />Copied to clipboard</>
                ) : (
                  <><Copy className="h-4 w-4" />Copy message</>
                )}
              </button>

              <p className="text-center text-[10px] text-zinc-400 mt-1">
                Auto-send uses Twilio WhatsApp + email. Manual: message opens in your WhatsApp.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
