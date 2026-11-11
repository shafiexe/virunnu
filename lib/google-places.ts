export type PlaceInfo = {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
};

const GENERIC = new Set(["convention", "centre", "center", "hall", "auditorium", "international", "the", "and", "banquet", "wedding", "events", "event"]);

function tokens(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2 && !GENERIC.has(t));
}

// Returns null when no key is configured, nothing matched, or the match doesn't look like the same place.
export async function lookupGooglePlace(name: string, hint: string): Promise<PlaceInfo | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !name) return null;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery: `${name} ${hint}`.trim(), maxResultCount: 3, regionCode: "IN" }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    console.error("Google Places error:", res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const data = await res.json();
  const want = tokens(name);

  for (const p of data.places ?? []) {
    const got = new Set(tokens(p.displayName?.text ?? ""));
    const hits = want.filter((t) => got.has(t)).length;
    if (want.length > 0 && hits === 0) continue;
    if (want.length > 1 && hits / want.length < 0.5) continue;
    return {
      name: p.displayName?.text ?? name,
      address: p.formattedAddress ?? null,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      rating: typeof p.rating === "number" ? p.rating : null,
      reviewCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
      phone: p.nationalPhoneNumber ?? null,
      website: p.websiteUri ?? null,
      mapsUrl: p.googleMapsUri ?? null,
    };
  }
  return null;
}
