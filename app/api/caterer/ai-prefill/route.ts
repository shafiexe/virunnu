import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set");
}
const client = new Anthropic();

const SYSTEM_PROMPT = `You are a data extraction assistant for a catering business directory in Kerala, India.
Extract structured information from raw text about a catering service and return it as JSON.
Be smart about inferring services from descriptions (e.g. "we do decoration" → include DECORATION service).
Generate a polished, professional description in English if the raw text is informal or in mixed languages.
For menu items, extract dish names, categories, prices (in rupees), and whether they're veg or non-veg.
The source may include Google Maps business data — extract phone, website, address, reviews and business description from it.`;

const USER_PROMPT = (text: string) => `Extract information from this raw caterer text and return a JSON object with these exact fields:

{
  "whatsappNumber": string | null,      // phone number for WhatsApp, with country code if present
  "email": string | null,               // email address
  "instagramUrl": string | null,        // full Instagram URL
  "facebookUrl": string | null,         // full Facebook URL
  "youtubeUrl": string | null,          // full YouTube URL
  "websiteUrl": string | null,          // website URL (not social media, not maps.google.com)
  "description": string,                // polished professional description (2-4 sentences)
  "cuisines": string[],                 // from: ["Kerala Sadhya", "North Indian", "South Indian", "Chinese", "Mughlai", "Continental", "Snacks & Tea", "Custom Menu"]
  "services": string[],                 // from: ["FOOD", "DECORATION", "SERVING_STAFF", "TENT_SHAMIANA", "SOUND_LIGHT", "TRANSPORT"]
  "menuItems": [                        // list of dishes/menu items found
    {
      "name": string,
      "category": string,               // from: ["Kerala Sadhya", "Breakfast", "Lunch", "Dinner", "Snacks & Tea", "Beverages", "Desserts & Sweets", "Starters", "Rice & Biryani", "Breads", "Special Package"]
      "description": string | null,
      "priceRupees": number,            // integer, 0 if price not mentioned
      "isVeg": boolean,
      "isSpecial": boolean              // true if labeled as special/signature dish
    }
  ]
}

Raw text:
${text}

Return ONLY the JSON object, no explanation or markdown.`;

/** Fetch a URL via Jina Reader (renders JS-heavy pages like Google, Instagram, Facebook)
 *  Falls back to direct fetch + HTML extraction if Jina fails. */
async function fetchPageText(url: string): Promise<string> {
  // Try Jina Reader first — handles JS-rendered pages
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain",
        "X-No-Cache": "true",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 100) return text.slice(0, 6000);
    }
  } catch { /* fall through to direct fetch */ }

  // Fallback: direct fetch + HTML extraction
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });
  const html = await response.text();
  return extractFromHtml(html);
}

/** Extract readable text from HTML — meta tags + JSON-LD structured data + body text */
function extractFromHtml(html: string): string {
  const parts: string[] = [];

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  if (title) parts.push(`Business name: ${title.replace(/ - Google (Maps|Search)$/, "").trim()}`);

  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1];
  if (metaDesc) parts.push(`Description: ${metaDesc}`);

  const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of ldMatches) {
    try {
      const obj = JSON.parse(m[1]);
      parts.push(`Structured data: ${JSON.stringify(obj, null, 1).slice(0, 2000)}`);
    } catch { /* skip */ }
  }

  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
  if (bodyText) parts.push(`Page text: ${bodyText}`);

  return parts.join("\n\n");
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "CATERER" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  let rawText: string = (body?.rawText ?? "").trim();
  const url: string = (body?.url ?? "").trim();

  // Fetch URL if provided — uses Jina Reader to handle JS-rendered pages (Google, Instagram, Facebook, etc.)
  if (url) {
    try {
      const urlText = await fetchPageText(url);
      rawText = `Source URL: ${url}\n\n${urlText}` + (rawText ? "\n\nAdditional notes:\n" + rawText : "");
    } catch (err) {
      console.error("URL fetch error:", err);
      return NextResponse.json({ error: "Could not read the URL. Try pasting the page text directly." }, { status: 400 });
    }
  }

  if (!rawText || rawText.length < 10) {
    return NextResponse.json({ error: "Please provide a URL or some text to extract from" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI features are not configured on this server." }, { status: 503 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: USER_PROMPT(rawText.slice(0, 5000)) }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonStr = text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const extracted = JSON.parse(jsonStr);

    return NextResponse.json({ extracted });
  } catch (err) {
    console.error("AI prefill error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("auth") || msg.includes("API key") || msg.includes("401")) {
      return NextResponse.json({ error: "AI API key is invalid or missing. Check server configuration." }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to extract data. Please try again." }, { status: 500 });
  }
}
