export const VENUE_TYPE_OPTIONS = [
  { key: "CONVENTION_CENTER", label: "Convention Center" },
  { key: "AUDITORIUM",        label: "Auditorium" },
  { key: "BANQUET_HALL",      label: "Banquet Hall" },
  { key: "RESORT",            label: "Resort" },
  { key: "HOTEL_RESTAURANT",  label: "Hotel / Restaurant" },
] as const;

export type VenueTypeKey = typeof VENUE_TYPE_OPTIONS[number]["key"];

export function venueTypeLabel(key: string): string {
  return VENUE_TYPE_OPTIONS.find((t) => t.key === key)?.label ?? key;
}
