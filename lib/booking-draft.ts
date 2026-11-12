// Turns a pasted message ("Rahim 98470 12345, wedding 26 Nov evening, advance 50000") into a booking draft.
// The AI only reads; every value is checked here before the form is filled, and the owner still presses Save.
export type DraftSlot = { id: string; name: string; startTime: string; endTime: string };
export type BookingDraft = { customerName: string | null; customerPhone: string | null; date: string | null; templateId: string | null; advanceRupees: number | null };

export const draftPrompt = (text: string, slots: DraftSlot[], todayISO: string) => `Today's date in India is ${todayISO}. Read this message about a convention-centre booking and return ONLY a JSON object:

{
  "customerName": string | null,       // the customer's name
  "customerPhone": string | null,      // 10-digit Indian mobile number, digits only
  "date": string | null,               // event date as YYYY-MM-DD; "26 Nov" means the next 26 Nov on or after today
  "slot": string | null,               // the id of the best-matching slot below, else null
  "advanceRupees": number | null       // advance the customer has paid or promised, in rupees
}

Slots: ${JSON.stringify(slots.map((s) => ({ id: s.id, name: s.name, from: s.startTime, to: s.endTime })))}
Words like morning, forenoon, lunch mean the earlier slot; evening, night, dinner mean the later one. A time like "6 pm" matches the slot that contains it.
Use null for anything not clearly stated. Never invent a phone number or an amount.

Message:
"""
${text}
"""`;

const isRealDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z")) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;

export function cleanDraft(raw: Record<string, unknown>, slots: DraftSlot[], todayISO: string): BookingDraft {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : null);
  const digits = String(raw.customerPhone ?? "").replace(/\D/g, "").slice(-10);
  const date = typeof raw.date === "string" && isRealDate(raw.date) && raw.date >= todayISO ? raw.date : null;
  const advance = typeof raw.advanceRupees === "number" && Number.isFinite(raw.advanceRupees) && raw.advanceRupees > 0 ? Math.round(raw.advanceRupees) : null;
  return {
    customerName: str(raw.customerName),
    customerPhone: /^[6-9]\d{9}$/.test(digits) ? digits : null,
    date,
    templateId: slots.some((s) => s.id === raw.slot) ? (raw.slot as string) : null,
    advanceRupees: advance,
  };
}
