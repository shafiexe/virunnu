import { MONTHS } from "@/lib/caterer-finance";

export type ReportRange = {
  kind: "month" | "year" | "custom";
  from: Date;
  to: Date;
  fromKey: string; // YYYY-MM-DD
  toKey: string;
  label: string;
  // query string that keeps this range when you move between report tabs
  qs: string;
};

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const key = (d: Date) => d.toISOString().slice(0, 10);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const pretty = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

// Reads the range from the address: a custom from/to, a whole year, or a month (the default).
export function parseRange(sp: { period?: string; month?: string; year?: string; from?: string; to?: string }): ReportRange {
  if (sp.from && sp.to && ISO.test(sp.from) && ISO.test(sp.to)) {
    let from = new Date(sp.from + "T00:00:00Z");
    let to = new Date(sp.to + "T00:00:00Z");
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return parseRange({});
    if (from > to) [from, to] = [to, from];
    // keep reports quick: at most three years at a time
    if (to.getTime() - from.getTime() > 3 * 366 * 86400000) from = utc(to.getUTCFullYear() - 3, to.getUTCMonth(), to.getUTCDate());
    return { kind: "custom", from, to, fromKey: key(from), toKey: key(to), label: `${pretty(from)} – ${pretty(to)}`, qs: `from=${key(from)}&to=${key(to)}` };
  }
  if (sp.period === "year") {
    const y = sp.year && /^\d{4}$/.test(sp.year) ? parseInt(sp.year) : parseInt(todayKey().slice(0, 4));
    return { kind: "year", from: utc(y, 0, 1), to: utc(y, 11, 31), fromKey: `${y}-01-01`, toKey: `${y}-12-31`, label: String(y), qs: `period=year&year=${y}` };
  }
  const m = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : todayKey().slice(0, 7);
  const [y, mo] = m.split("-").map(Number);
  const from = utc(y, mo - 1, 1), to = utc(y, mo, 0);
  return { kind: "month", from, to, fromKey: key(from), toKey: key(to), label: `${MONTHS[mo - 1]} ${y}`, qs: `month=${m}` };
}

// One-tap ranges shown above the date pickers
export function presets() {
  const t = new Date(todayKey() + "T00:00:00Z");
  const y = t.getUTCFullYear(), m = t.getUTCMonth();
  const q = Math.floor(m / 3) * 3;
  const mk = (label: string, from: Date, to: Date) => ({ label, from: key(from), to: key(to) });
  return [
    mk("This month", utc(y, m, 1), t),
    mk("Last month", utc(y, m - 1, 1), utc(y, m, 0)),
    mk("Last 30 days", new Date(t.getTime() - 29 * 86400000), t),
    mk("This quarter", utc(y, q, 1), t),
    mk("This year", utc(y, 0, 1), t),
    mk("Last year", utc(y - 1, 0, 1), utc(y - 1, 11, 31)),
  ];
}
