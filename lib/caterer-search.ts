// Traveller-side matching for caterers. A field the team hasn't filled in never rules them out.
export type CatererSearch = { place?: string; guests?: number; date?: string; meal?: string };

type Searchable = {
  city: string; address: string | null; pincode: string | null; serviceAreas: string[];
  minGuests: number | null; maxGuests: number | null; leadTimeHours: number | null; mealTypes: string[];
  googleRating: number | null;
};

const norm = (s: string) => s.toLowerCase().trim();

// 0 = no place given or no match, 2 = a listed service area / their city, 1 = mentioned in address / pincode.
function placeScore(c: Searchable, place: string): number {
  const p = norm(place);
  if (!p) return 0;
  if (norm(c.city) === p || c.serviceAreas.some((a) => norm(a) === p)) return 2;
  if (norm(c.city).includes(p) || c.serviceAreas.some((a) => norm(a).includes(p) || p.includes(norm(a)))) return 2;
  if ((c.address && norm(c.address).includes(p)) || (c.pincode && c.pincode.startsWith(p))) return 1;
  return -1;
}

// Event is taken as midday IST on the chosen date.
function hoursUntil(date: string, now = Date.now()): number | null {
  const t = Date.parse(`${date}T12:00:00+05:30`);
  return Number.isNaN(t) ? null : (t - now) / 36e5;
}

export function matchCaterers<T extends Searchable>(all: T[], s: CatererSearch) {
  const hours = s.date ? hoursUntil(s.date) : null;
  const scored: { c: T; score: number }[] = [];
  let tooLate = 0;

  for (const c of all) {
    const score = s.place ? placeScore(c, s.place) : 0;
    if (score < 0) continue;
    if (s.guests && ((c.minGuests && s.guests < c.minGuests) || (c.maxGuests && s.guests > c.maxGuests))) continue;
    if (s.meal && c.mealTypes.length > 0 && !c.mealTypes.includes(s.meal)) continue;
    if (hours !== null && c.leadTimeHours != null && hours < c.leadTimeHours) { tooLate++; continue; }
    scored.push({ c, score });
  }

  scored.sort((a, b) => b.score - a.score || (b.c.googleRating ?? 0) - (a.c.googleRating ?? 0));
  return { caterers: scored.map((x) => x.c), tooLate };
}
