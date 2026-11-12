// Reads the photo of a bill into an expense draft. The AI only reads; every value is checked here before the form is
// filled, and the owner still looks at it and presses Save.
export type BillDraft = { label: string | null; amountRupees: number | null; date: string | null; category: string | null; notes: string | null };

export const billPrompt = (categories: string[], todayISO: string) => `Today's date in India is ${todayISO}. This is a photo of a bill or receipt that a business in Kerala, India paid (for example electricity, water, repairs, groceries, a supplier's invoice). Return ONLY a JSON object:

{
  "label": string | null,         // short name for the expense: the shop or service and what it was, e.g. "KSEB electricity bill" or "Sreelakshmi Traders – vegetables"
  "amountRupees": number | null,  // the TOTAL amount payable or paid, in rupees, including tax. Not a subtotal and not a previous balance
  "date": string | null,          // the bill date as YYYY-MM-DD. Indian dates are day-month-year
  "category": string | null,      // the best match from this list, exactly as written, or null if none fits: ${JSON.stringify(categories)}
  "notes": string | null          // invoice or bill number and anything else worth keeping, one short line
}

Use null for anything you cannot read clearly. Never guess an amount.`;

const isRealDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;

export function cleanBill(raw: Record<string, unknown>, categories: string[], todayISO: string): BillDraft {
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  // the amount can come back as 4820, "4,820" or "₹4,820.50"
  const num = typeof raw.amountRupees === "number" ? raw.amountRupees : Number(String(raw.amountRupees ?? "").replace(/[^\d.]/g, ""));
  const amountRupees = Number.isFinite(num) && num > 0 && num <= 100000000 ? Math.round(num * 100) / 100 : null;
  const fiveYearsAgo = `${Number(todayISO.slice(0, 4)) - 5}${todayISO.slice(4)}`;
  const date = typeof raw.date === "string" && isRealDate(raw.date) && raw.date <= todayISO && raw.date >= fiveYearsAgo ? raw.date : null;
  const category = typeof raw.category === "string" ? categories.find((c) => c.toLowerCase() === (raw.category as string).trim().toLowerCase()) ?? null : null;
  return { label: str(raw.label, 100), amountRupees, date, category, notes: str(raw.notes, 300) };
}
