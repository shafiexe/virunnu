// Pulls what it can out of a message a customer sent ("Hi, I'm Shafi, wedding on 14 Dec at Rozia, 300 people, 98470 00000"),
// so the team doesn't retype it. It only fills what it is sure of; the person checks the rest.

export type ParsedEnquiry = { name?: string; phone?: string; date?: string; guests?: number; eventType?: string; place?: string };

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const EVENTS: [RegExp, string][] = [[/\b(wedding|marriage|nikah|kalyanam)\b/i, "Wedding"], [/\breception\b/i, "Reception"], [/\b(engagement|betrothal)\b/i, "Engagement"], [/\bbirthday\b/i, "Birthday"], [/\b(corporate|office|company|conference)\b/i, "Corporate"]];

const iso = (y: number, m: number, d: number) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : undefined);

// A date with no year means the next time that day comes round
function resolveYear(m: number, d: number, today: Date) {
  const y = today.getUTCFullYear();
  const t = Date.UTC(y, m - 1, d);
  return t < Date.UTC(y, today.getUTCMonth(), today.getUTCDate()) ? y + 1 : y;
}

export function parseEnquiry(text: string, today = new Date()): ParsedEnquiry {
  const out: ParsedEnquiry = {};
  const t = text.replace(/\s+/g, " ");

  const phone = /(?:\+?91[\s-]?)?([6-9]\d{4}[\s-]?\d{5})\b/.exec(t);
  if (phone) out.phone = phone[1].replace(/\D/g, "");

  const guests = /\b(\d{2,5})\s*\+?\s*(?:guests?|people|persons?|pax|members|heads|plates?|nos)\b/i.exec(t);
  if (guests) out.guests = Number(guests[1]);

  for (const [re, label] of EVENTS) if (re.test(t)) { out.eventType = label; break; }

  // 14 Dec, 14th December 2026, Dec 14
  let m = /\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\.?(?:[\s,-]+(\d{4}))?\b/i.exec(t);
  if (m) { const mo = MONTHS[m[2].toLowerCase()], d = Number(m[1]); out.date = iso(m[3] ? Number(m[3]) : resolveYear(mo, d, today), mo, d); }
  if (!out.date) {
    m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:[\s,-]+(\d{4}))?\b/i.exec(t);
    if (m) { const mo = MONTHS[m[1].toLowerCase()], d = Number(m[2]); out.date = iso(m[3] ? Number(m[3]) : resolveYear(mo, d, today), mo, d); }
  }
  if (!out.date) {
    // 14/12/2026, 14-12-26, 14/12 (day first, as written in India)
    m = /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/.exec(t.replace(phone?.[0] ?? "\u0000", ""));
    if (m) { const d = Number(m[1]), mo = Number(m[2]); const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : resolveYear(mo, d, today); out.date = iso(y, mo, d); }
  }

  const name = /(?:\bname\s*[:\-]|\bmy name is|\bthis is|\bi am|\bi'm)\s*([A-Za-z][A-Za-z .]{1,40}?)(?=[,.\n\d]|\s+(?:and|from|here|calling|wedding|marriage|reception|looking|need|want|planning)\b|$)/i.exec(text);
  if (name) out.name = name[1].trim();

  const place = /(?:\b[Vv]enue|\b[Pp]lace|\b[Ll]ocation|\b[Aa]t|\b[Ii]n)\s*[:\-]?\s*((?:[A-Z][\w']*)(?:\s+[A-Z][\w']*){0,4})/.exec(text);
  if (place && !/^(Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|I|Hi|Hello)$/i.test(place[1])) out.place = place[1].trim();
  return out;
}
