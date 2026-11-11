import Anthropic from "@anthropic-ai/sdk";
import { fetchPageText, fetchSiteDetails, type SiteDetails } from "@/lib/fetch-page-text";
import { parseGoogleMapsCoords } from "@/lib/maps";
import { lookupGooglePlace } from "@/lib/google-places";

const AMENITIES = ["AC", "Projector", "Stage", "Parking", "Catering Kitchen", "Sound System", "Generator Backup", "Dressing Room", "CCTV"];

export function cleanList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t || t.length > 40 || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

const SYSTEM_PROMPT = `You fill in a registration form for a convention centre / wedding hall directory in Kerala, India.
You receive whatever the admin has: a pasted description, a WhatsApp message, brochure text, or text scraped from Google Maps / website / Instagram / Facebook / directory pages.
Facts (name, phone, email, address, prices, capacities, ratings, timings) must come only from the input — never invent them; use null when unknown. If several pages disagree, prefer the convention centre's own website, then Google Maps.
The description and suggestedAmenities are the only places you may add helpful wording; an admin will review them.`;

const USER_PROMPT = (text: string) => `Return a JSON object for the form:

{
  "name": string | null,
  "phone": string | null,            // primary contact mobile, digits only, 10-digit Indian number without +91 when possible
  "email": string | null,
  "address": string | null,          // street address as it would appear on Google Maps
  "city": string | null,
  "state": string | null,
  "pincode": string | null,          // 6 digits
  "googleMapsUrl": string | null,
  "googleRating": number | null,     // GOOGLE's own star rating (e.g. 4.7 from "4.7 ★ (262)" in a Google panel/Maps page). Ignore ratings from other sites (Justdial, Facebook, etc.)
  "googleReviewCount": number | null, // number of GOOGLE reviews (e.g. 262). Not votes from other sites
  "websiteUrl": string | null,       // not social media
  "instagramUrl": string | null,
  "facebookUrl": string | null,
  "youtubeUrl": string | null,
  "linkedinUrl": string | null,
  "twitterUrl": string | null,    // twitter.com / x.com profile
  "hallName": string | null,         // only if a specific hall name is given; otherwise null
  "capacity": number | null,         // guests the main hall holds (seated preferred)
  "priceRupees": number | null,      // price per booking slot in rupees, only if explicitly stated
  "description": string | null,      // 2-3 warm, factual sentences for customers (venue type, location, capacity, notable features). No made-up facts, no superlatives like "best".
  "amenities": string[],             // amenities explicitly stated in the input. Prefer these names when they fit: ${AMENITIES.join(", ")}; otherwise a short name (max 3 words)
  "suggestedAmenities": string[],    // up to 6 amenities commonly offered by similar venues that are NOT stated (e.g. "Bridal Room", "Valet Parking", "Lift", "Wi-Fi", "Power Backup", "Separate Dining Hall"). Never repeat ones in "amenities"
  "slots": [ { "name": string, "startTime": "HH:MM", "endTime": "HH:MM" } ]   // only if timings are stated, else []
}

Input:
${text}

Return ONLY the JSON object.`;

// Sanity's image CDN serves the full-size original unless asked; request a web-sized copy.
export function resizeCdn(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname === "cdn.sanity.io") {
      u.searchParams.set("w", "1600");
      u.searchParams.set("auto", "format");
      return u.toString();
    }
  } catch { /* keep as is */ }
  return url;
}

export const IMAGE_URL = /^https?:\/\/([^/]*\.)?(googleusercontent\.com|ggpht\.com)\/|\.(jpe?g|png|webp|avif)(\?|$)/i;

export const URL_RE = /https?:\/\/[^\s)>"']+/g;

export async function resolveMapsCoords(url: string): Promise<{ lat: number; lng: number } | null> {
  const direct = parseGoogleMapsCoords(url);
  if (direct) return direct;
  if (!/goo\.gl|maps\.app|google\.[a-z.]+\/maps/i.test(url)) return null;
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000) });
    return parseGoogleMapsCoords(res.url) ?? null;
  } catch {
    return null;
  }
}

export type PrefillResult = { status: number; body: Record<string, unknown> };

export async function centerPrefill(rawInput: string): Promise<PrefillResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: 503, body: { error: "AI features are not configured on this server." } };
  }
  const input = rawInput.trim().slice(0, 20000);
  if (input.length < 5) {
    return { status: 400, body: { error: "Paste some details or a link first" } };
  }

  const allUrls = [...new Set(input.match(URL_RE) ?? [])];
  const pastedImages = allUrls.filter((u) => IMAGE_URL.test(u));
  const urls = allUrls.filter((u) => !IMAGE_URL.test(u)).slice(0, 4);

  const sites: SiteDetails[] = [];
  const isGoogleSearch = (u: string) => {
    try {
      const x = new URL(u);
      return /(^|\.)google\.[a-z.]+$/i.test(x.hostname) && x.pathname.startsWith("/search");
    } catch {
      return false;
    }
  };
  const fetched = await Promise.all(
    urls.map(async (u) => {
      if (isGoogleSearch(u)) return { u, text: "" };
      const [pageText, site] = await Promise.allSettled([fetchPageText(u), fetchSiteDetails(u)]);
      const t = pageText.status === "fulfilled" ? pageText.value : "";
      const d = site.status === "fulfilled" ? site.value : null;
      let text = t.replace(/\s+/g, " ").length > 150 ? `Page ${u}:\n${t}` : "";
      if (d) {
        sites.push(d);
        const found = [
          d.instagram && `Instagram: ${d.instagram}`,
          d.facebook && `Facebook: ${d.facebook}`,
          d.youtube && `YouTube: ${d.youtube}`,
          d.linkedin && `LinkedIn: ${d.linkedin}`,
          d.twitter && `Twitter/X: ${d.twitter}`,
          d.whatsapp && `WhatsApp: ${d.whatsapp}`,
          ...d.phones.map((p) => `Phone: ${p}`),
          ...d.emails.map((e) => `Email: ${e}`),
        ].filter(Boolean).join("\n");
        text += `\n\nLinks and contact details found on ${u}:\n${found}\n\nEnd of page ${u} (footer text):\n${d.footerText}`;
      }
      return { u, text: text.trim() };
    })
  );
  const unreadable = fetched.filter((r) => !r.text).map((r) => r.u);
  const pageTexts = fetched.map((r) => r.text);

  let coords: { lat: number; lng: number } | null = null;
  const mapsLinks = urls
    .filter((u) => /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(u))
    .sort((a, b) => Number(/\/maps\/(dir|place)/.test(b)) - Number(/\/maps\/(dir|place)/.test(a)));
  const mapsUrl: string | undefined = mapsLinks[0];
  for (const u of mapsLinks) {
    coords = await resolveMapsCoords(u);
    if (coords) break;
  }

  const combined = [input, ...pageTexts.filter(Boolean)].join("\n\n").slice(0, 14000);

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: USER_PROMPT(combined) }],
    });
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("ai-center-prefill: no JSON in response:", JSON.stringify(message.content).slice(0, 800), "stop:", message.stop_reason);
      return { status: 500, body: { error: "Could not read the AI response. Please try again." } };
    }

    const x = JSON.parse(match[0]);
    const amenities = cleanList(x.amenities, 20);
    const have = new Set(amenities.map((a) => a.toLowerCase()));
    const suggestedAmenities = cleanList(x.suggestedAmenities, 6).filter((a) => !have.has(a.toLowerCase()));

    // Google's own data is authoritative for rating, review count and the map pin.
    let place = null;
    try {
      place = await lookupGooglePlace(
        typeof x.name === "string" ? x.name : "",
        [x.city, x.pincode].filter((v) => typeof v === "string" && v).join(" ")
      );
    } catch (e) {
      console.error("Google Places lookup failed:", e);
    }

    return {
      status: 200,
      body: {
      extracted: {
        ...x,
        googleMapsUrl: mapsUrl ?? x.googleMapsUrl ?? place?.mapsUrl ?? null,
        instagramUrl: sites.find((d) => d.instagram)?.instagram ?? x.instagramUrl ?? null,
        facebookUrl: sites.find((d) => d.facebook)?.facebook ?? x.facebookUrl ?? null,
        youtubeUrl: sites.find((d) => d.youtube)?.youtube ?? x.youtubeUrl ?? null,
        linkedinUrl: sites.find((d) => d.linkedin)?.linkedin ?? x.linkedinUrl ?? null,
        twitterUrl: sites.find((d) => d.twitter)?.twitter ?? x.twitterUrl ?? null,
        googleRating: place?.rating ?? x.googleRating ?? null,
        googleReviewCount: place?.reviewCount ?? x.googleReviewCount ?? null,
        lat: coords?.lat ?? place?.lat ?? null,
        lng: coords?.lng ?? place?.lng ?? null,
        email:
          sites.flatMap((d) => d.emails).find((e) => !/^(noreply|no-reply|donotreply)@/i.test(e)) ?? x.email ?? null,
        phone: x.phone ?? place?.phone ?? null,
        websiteUrl: x.websiteUrl ?? place?.website ?? null,
        amenities,
        suggestedAmenities,
        slots: Array.isArray(x.slots) ? x.slots : [],
      },
      unreadable,
      photos: [...new Set([...pastedImages, ...sites.flatMap((d) => d.images).map(resizeCdn)])].slice(0, 20),
      googlePlace: place ? { name: place.name, address: place.address } : null,
      placesConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
    },
    };
  } catch (err) {
    console.error("ai-center-prefill error:", err);
    return { status: 500, body: { error: "AI extraction failed. Please try again." } };
  }
}
