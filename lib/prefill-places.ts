import { lookupGooglePlace, type PlaceInfo } from "@/lib/google-places";
import { fetchSiteDetails, type SiteDetails } from "@/lib/fetch-page-text";

// With no link given, a short line such as "Rozia Convention Centre Kondotty" is searched on Google, so the person
// can type just a name and city. The listing's website and map link are then read like links the person had pasted.
export async function searchByName(input: string, hasUrls: boolean) {
  const q = input.trim();
  if (hasUrls || q.length < 4 || q.length > 120 || q.split("\n").length > 2) return null;
  try {
    const place = await lookupGooglePlace(q, "");
    if (!place) return null;
    const text = [
      `Google listing found for "${q}":`, `Name: ${place.name}`, place.address && `Address: ${place.address}`, place.phone && `Phone: ${place.phone}`,
      place.website && `Website: ${place.website}`, place.rating != null && `Google rating: ${place.rating} (${place.reviewCount ?? 0} reviews)`, place.mapsUrl && `Maps link: ${place.mapsUrl}`,
    ].filter(Boolean).join("\n");
    const urls = [place.website, place.mapsUrl].filter((u): u is string => !!u);
    return { place, text, urls };
  } catch (e) {
    console.error("Name search on Google failed:", e);
    return null;
  }
}

// When Google knows the website but no link to it was given, read it too: its footer usually carries the social pages, email and photos.
export async function readPlaceWebsite(place: PlaceInfo | null, urls: string[], sites: SiteDetails[]) {
  if (!place?.website) return;
  const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  if (urls.some((u) => hostOf(u) === hostOf(place.website!))) return;
  try {
    const d = await fetchSiteDetails(place.website);
    if (d) sites.push(d);
  } catch { /* the website just isn't read */ }
}

export type FieldSource = "google" | "website" | "text" | "ai";

// Where each filled detail came from, so the person knows what to check
export function provenance(args: {
  x: Record<string, unknown>; place: PlaceInfo | null; mapsUrl?: string; coordsFromLink: boolean; sites: SiteDetails[];
}): Record<string, FieldSource> {
  const { x, place, mapsUrl, coordsFromLink, sites } = args;
  const out: Record<string, FieldSource> = {};
  const has = (v: unknown) => v !== null && v !== undefined && v !== "";
  const fromSite = (k: "instagram" | "facebook" | "youtube" | "linkedin" | "twitter") => sites.some((d) => d[k]);
  if (place) {
    if (place.rating != null) out.googleRating = "google";
    if (place.reviewCount != null) out.googleReviewCount = "google";
    if (place.lat != null) { out.lat = "google"; out.lng = "google"; }
    if (place.mapsUrl && !mapsUrl) out.googleMapsUrl = "google";
    if (!has(x.phone) && place.phone) out.phone = "google";
    if (!has(x.websiteUrl) && place.website) out.websiteUrl = "google";
  }
  if (coordsFromLink) { out.lat = "google"; out.lng = "google"; }
  if (mapsUrl) out.googleMapsUrl = "text";
  if (fromSite("instagram")) out.instagramUrl = "website";
  if (fromSite("facebook")) out.facebookUrl = "website";
  if (fromSite("youtube")) out.youtubeUrl = "website";
  if (fromSite("linkedin")) out.linkedinUrl = "website";
  if (fromSite("twitter")) out.twitterUrl = "website";
  if (sites.some((d) => d.emails.length)) out.email = "website";
  if (has(x.description)) out.description = "ai";
  return out;
}
