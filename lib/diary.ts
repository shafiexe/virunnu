// Turning photos of a paper booking diary into bookings. The AI only reads; every value is checked here, the owner reviews
// and edits every row, and nothing is saved until they confirm. Pure functions, so the rules can be tested on their own.
export type DiarySlot = { id: string; name: string; startTime: string; endTime: string };

// One entry as read from a page, before the owner has looked at it
export type DiaryEntry = {
  date: string | null;          // YYYY-MM-DD
  yearAssumed: boolean;         // the page gave no year, so this year was used
  templateId: string | null;
  slotAssumed: boolean;         // the page gave no slot, so the morning slot was used
  name: string | null;
  phone: string | null;
  totalRupees: number | null;
  advanceRupees: number | null;
};

export const diaryPrompt = (slots: DiarySlot[], todayISO: string) => `Today's date in India is ${todayISO}. This is a photo of a page from a paper diary or register where a function hall in Kerala, India writes down its bookings. A page can hold many bookings, written in English or Malayalam, in any layout (a list, a table, or notes beside dates).

Return ONLY a JSON object, no other text, in this shape:
{ "entries": [ { "day": number | null, "month": number | null, "year": number | null, "slotId": string | null, "name": string | null, "phone": string | null, "totalRupees": number | null, "advanceRupees": number | null } ] }

Rules:
- One entry per booking. Skip anything that is not a booking (headings, totals, page numbers, notes with no date).
- Indian dates are day-month-year. Give day, month and year as separate numbers. If the page shows no year for an entry, use null for the year. Never invent a date: use null for what you cannot read.
- slotId: if the entry says which part of the day it is (morning, lunch, evening, dinner, night, a time, or the slot's own name), choose the matching one from this list, exactly as written: ${JSON.stringify(slots.map((s) => ({ id: s.id, name: s.name, from: s.startTime, to: s.endTime })))}. If it does not say, use null.
- name: the person or party who booked. phone: the number written, digits only. null if absent.
- totalRupees: the agreed price for the hall, in rupees. advanceRupees: the advance or amount already received, in rupees. Use null if not written. Never guess an amount.`;

const isRealDate = (s: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(s + "T00:00:00Z"); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; };
const pad = (n: number) => String(n).padStart(2, "0");

// The slot to use when a page does not name one: "Morning" if the hall has it, otherwise its first slot
export function defaultSlot(slots: DiarySlot[]): DiarySlot | null {
  return slots.find((s) => /morning/i.test(s.name)) ?? [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime))[0] ?? null;
}

const rupees = (v: unknown, max = 100_000_000) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n) : null;
};

// Cleans what the AI returned: keeps only real dates, real slots and sensible amounts, and notes what was assumed.
export function cleanDiaryEntries(raw: unknown, slots: DiarySlot[], todayISO: string): DiaryEntry[] {
  const list = raw && typeof raw === "object" && Array.isArray((raw as { entries?: unknown }).entries) ? ((raw as { entries: unknown[] }).entries) : [];
  const fallback = defaultSlot(slots);
  const thisYear = Number(todayISO.slice(0, 4));
  const out: DiaryEntry[] = [];
  for (const item of list.slice(0, 80)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const day = Number(r.day), month = Number(r.month);
    let year = r.year == null ? NaN : Number(r.year);
    if (Number.isFinite(year) && year < 100) year += 2000;   // "26" written for 2026
    const yearGiven = Number.isInteger(year) && year >= thisYear - 10 && year <= thisYear + 3;
    const y = yearGiven ? year : thisYear;
    const candidate = Number.isInteger(day) && Number.isInteger(month) ? `${y}-${pad(month)}-${pad(day)}` : "";
    const date = candidate && isRealDate(candidate) ? candidate : null;
    const named = typeof r.slotId === "string" ? slots.find((s) => s.id === r.slotId) : undefined;
    const digits = typeof r.phone === "string" || typeof r.phone === "number" ? String(r.phone).replace(/\D/g, "") : "";
    const name = typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 100) : null;
    const total = rupees(r.totalRupees), advance = rupees(r.advanceRupees);
    // a row with nothing readable at all is noise
    if (!date && !name && !digits && !total) continue;
    out.push({
      date,
      yearAssumed: !yearGiven,
      templateId: named?.id ?? fallback?.id ?? null,
      slotAssumed: !named,
      name,
      phone: digits.length >= 10 ? digits.slice(-10) : null,
      totalRupees: total,
      advanceRupees: advance != null && total != null && advance > total ? total : advance,
    });
  }
  return out;
}

// What the owner sees against each row on the review table, and whether it can be added
export type RowCheck = "ok" | "booked" | "blocked" | "duplicate" | "invalid";
export const CHECK_TEXT: Record<RowCheck, string> = {
  ok: "Ready",
  booked: "That slot is already booked or held",
  blocked: "That date is blocked",
  duplicate: "Another row in this list uses the same date and slot",
  invalid: "Needs a date, a name or phone, and an amount",
};

export type BulkRow = { date: string; templateId: string; name?: string; phone?: string; totalRupees: number; advanceRupees?: number };

// Problems that can be seen without looking at the calendar
export function rowProblem(r: { date: string | null; templateId: string | null; name: string | null; phone: string | null; totalRupees: number | null; advanceRupees: number | null }): RowCheck | null {
  if (!r.date || !isRealDate(r.date) || !r.templateId || !(r.name?.trim() || (r.phone && r.phone.replace(/\D/g, "").length >= 10)) || !r.totalRupees || r.totalRupees < 1) return "invalid";
  if (r.advanceRupees != null && r.advanceRupees > r.totalRupees) return "invalid";
  return null;
}
