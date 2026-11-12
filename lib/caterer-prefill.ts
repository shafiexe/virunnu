import Anthropic from "@anthropic-ai/sdk";
import { fetchPageText, fetchSiteDetails, type SiteDetails } from "@/lib/fetch-page-text";
import { lookupGooglePlace } from "@/lib/google-places";
import { provenance, readPlaceWebsite, searchByName } from "@/lib/prefill-places";
import { cleanList, resizeCdn, IMAGE_URL, URL_RE, resolveMapsCoords } from "@/lib/center-prefill";
import { SERVICE_KEYS, MEAL_TYPES } from "@/services/caterer-setup.service";

export type PrefillImage = { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };
export type PrefillResult = { status: number; body: Record<string, unknown> };

const SYSTEM_PROMPT = `You fill in a registration form for a catering team directory in Kerala, India. A traveller will use it to find a caterer near them for a meal for a group, so where they work, how many guests they handle, how soon they can serve, and price per plate matter most.
You receive whatever the caterer has: pasted text, WhatsApp messages, website / Instagram / Facebook / Google Maps text, and photos of menu cards or brochures.
Facts (name, phone, email, address, prices, guest counts, years, FSSAI number, past events) must come only from the input — never invent them; use null or an empty list when unknown. Dish names and prices must be copied exactly as written.
The description and suggestedServices are the only places you may add helpful wording; a person will review them.`;

const USER_PROMPT = (text: string, hasImages: boolean) => `Return a JSON object for the form:

{
  "name": string | null,
  "phone": string | null,              // primary contact mobile, digits only, 10-digit Indian number without +91 when possible
  "whatsappPhone": string | null,
  "email": string | null,
  "city": string | null,               // base town/city
  "address": string | null,
  "pincode": string | null,            // 6 digits
  "googleMapsUrl": string | null,
  "googleRating": number | null,       // GOOGLE's own star rating only; ignore Justdial/Facebook etc.
  "googleReviewCount": number | null,  // number of GOOGLE reviews only
  "websiteUrl": string | null,         // not social media
  "instagramUrl": string | null,
  "facebookUrl": string | null,
  "youtubeUrl": string | null,
  "linkedinUrl": string | null,
  "twitterUrl": string | null,         // twitter.com / x.com profile
  "description": string | null,        // 2-3 warm, factual sentences for customers (what they cook, who they serve, experience). No made-up facts, no superlatives like "best".
  "cuisines": string[],                // e.g. "Kerala", "Malabar", "North Indian", "Chinese", "Arabic", "Continental", "Bakery & Snacks"
  "services": string[],                // ONLY from: ${SERVICE_KEYS.join(", ")} — those clearly offered
  "suggestedServices": string[],       // from the same list: commonly offered by similar caterers but NOT stated
  "mealTypes": string[],               // ONLY from: ${MEAL_TYPES.join(", ")} — those they serve
  "serviceAreas": string[],            // towns / districts they say they serve (e.g. "Kozhikode", "Wayanad")
  "serviceRadiusKm": number | null,
  "minGuests": number | null,
  "maxGuests": number | null,
  "leadTimeHours": number | null,      // notice they need, in hours (e.g. "same day" = 6, "1 day notice" = 24)
  "teamSize": number | null,
  "yearsExperience": number | null,
  "fssaiNumber": string | null,
  "packages": [ { "name": string, "pricePerPlate": number, "isVeg": boolean, "dishes": string[] } ],   // set menus / combos priced per plate or per head
  "items": [ { "name": string, "category": string | null, "priceRupees": number, "isVeg": boolean } ], // individually priced dishes (max 40)
  "pastEvents": [ { "title": string, "type": string | null, "guests": number | null, "note": string | null } ]  // events they say they have catered
}
${hasImages ? "\nThe attached image(s) are menu cards / brochures: read every package, dish and price from them.\n" : ""}
Input:
${text || "(no text — use the attached images)"}

Return ONLY the JSON object.`;

const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined;
};
const int = (v: unknown) => {
  const n = num(v);
  return n === undefined ? undefined : Math.round(n);
};
const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

export async function catererPrefill(rawInput: string, images: PrefillImage[] = []): Promise<PrefillResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: 503, body: { error: "AI features are not configured on this server." } };
  }
  const input = rawInput.trim().slice(0, 20000);
  if (input.length < 5 && images.length === 0) {
    return { status: 400, body: { error: "Paste some details, a link, or upload a menu card photo first" } };
  }

  const allUrls = [...new Set(input.match(URL_RE) ?? [])];
  const pastedImages = allUrls.filter((u) => IMAGE_URL.test(u));
  const urls = allUrls.filter((u) => !IMAGE_URL.test(u)).slice(0, 4);

  // just a name (and city) typed: find the Google listing and read its website and map link as if they had been pasted
  const named = images.length === 0 ? await searchByName(input, urls.length > 0) : null;
  if (named) urls.push(...named.urls.slice(0, 4));

  const isGoogleSearch = (u: string) => {
    try {
      const x = new URL(u);
      return /(^|\.)google\.[a-z.]+$/i.test(x.hostname) && x.pathname.startsWith("/search");
    } catch {
      return false;
    }
  };

  const sites: SiteDetails[] = [];
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

  let coords: { lat: number; lng: number } | null = null;
  const mapsLinks = urls
    .filter((u) => /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(u))
    .sort((a, b) => Number(/\/maps\/(dir|place)/.test(b)) - Number(/\/maps\/(dir|place)/.test(a)));
  const mapsUrl: string | undefined = mapsLinks[0];
  for (const u of mapsLinks) {
    coords = await resolveMapsCoords(u);
    if (coords) break;
  }

  const combined = [input, named?.text, ...fetched.map((r) => r.text).filter(Boolean)].filter(Boolean).join("\n\n").slice(0, 14000);

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((img) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: img.mediaType, data: img.data },
            })),
            { type: "text" as const, text: USER_PROMPT(combined, images.length > 0) },
          ],
        },
      ],
    });
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("caterer-prefill: no JSON in response, stop:", message.stop_reason);
      return { status: 500, body: { error: "Could not read the AI response. Please try again." } };
    }
    const x = JSON.parse(match[0]);

    const services = cleanList(x.services, 6).filter((v) => (SERVICE_KEYS as readonly string[]).includes(v));
    const suggestedServices = cleanList(x.suggestedServices, 6).filter(
      (v) => (SERVICE_KEYS as readonly string[]).includes(v) && !services.includes(v)
    );
    const mealTypes = cleanList(x.mealTypes, 4).filter((v) => (MEAL_TYPES as readonly string[]).includes(v));

    const packages = (Array.isArray(x.packages) ? x.packages : [])
      .map((p: Record<string, unknown>) => ({
        name: str(p?.name, 80),
        pricePerPlate: int(p?.pricePerPlate),
        isVeg: p?.isVeg !== false,
        dishes: cleanList(p?.dishes, 30),
      }))
      .filter((p: { name?: string; pricePerPlate?: number }) => p.name && p.pricePerPlate)
      .slice(0, 12);

    const items = (Array.isArray(x.items) ? x.items : [])
      .map((i: Record<string, unknown>) => ({
        name: str(i?.name, 80),
        category: str(i?.category, 40) ?? "",
        priceRupees: int(i?.priceRupees),
        isVeg: i?.isVeg !== false,
      }))
      .filter((i: { name?: string; priceRupees?: number }) => i.name && i.priceRupees)
      .slice(0, 40);

    const pastEvents = (Array.isArray(x.pastEvents) ? x.pastEvents : [])
      .map((e: Record<string, unknown>) => ({
        title: str(e?.title, 100),
        type: str(e?.type, 40) ?? "",
        guests: int(e?.guests),
        note: str(e?.note, 200) ?? "",
      }))
      .filter((e: { title?: string }) => e.title)
      .slice(0, 10);

    let place = named?.place ?? null;
    if (!place) {
      try {
        place = await lookupGooglePlace(
          typeof x.name === "string" ? x.name : "",
          [x.city].filter((v) => typeof v === "string" && v).join(" ")
        );
      } catch (e) {
        console.error("Google Places lookup failed:", e);
      }
    }
    // the listing's own website, when no link to it was given
    await readPlaceWebsite(place, urls, sites);

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
          email: sites.flatMap((d) => d.emails).find((e) => !/^(noreply|no-reply|donotreply)@/i.test(e)) ?? x.email ?? null,
          googleRating: place?.rating ?? x.googleRating ?? null,
          googleReviewCount: place?.reviewCount ?? x.googleReviewCount ?? null,
          lat: coords?.lat ?? place?.lat ?? null,
          lng: coords?.lng ?? place?.lng ?? null,
          phone: x.phone ?? place?.phone ?? null,
          websiteUrl: x.websiteUrl ?? place?.website ?? null,
          cuisines: cleanList(x.cuisines, 15),
          serviceAreas: cleanList(x.serviceAreas, 15),
          services,
          suggestedServices,
          mealTypes,
          packages,
          items,
          pastEvents,
        },
        photos: [...new Set([...pastedImages, ...sites.flatMap((d) => d.images).map(resizeCdn)])].slice(0, 20),
        unreadable,
        sources: provenance({ x, place, mapsUrl, coordsFromLink: !!coords && !!mapsUrl, sites }),
        googlePlace: place ? { name: place.name, address: place.address } : null,
        placesConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      },
    };
  } catch (err) {
    console.error("caterer-prefill error:", err);
    return { status: 500, body: { error: "AI extraction failed. Please try again." } };
  }
}

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// Validates uploaded menu-card images from the browser (already downscaled client-side).
export function parseImages(raw: unknown): PrefillImage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 3)
    .filter(
      (i): i is PrefillImage =>
        i && typeof i.data === "string" && i.data.length < 3_500_000 && (MEDIA_TYPES as readonly string[]).includes(i.mediaType)
    )
    .map((i) => ({ mediaType: i.mediaType, data: i.data.replace(/^data:[^,]+,/, "") }));
}
