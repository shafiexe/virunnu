import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import Anthropic from "@anthropic-ai/sdk";
import { fetchPageText } from "@/lib/fetch-page-text";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set");
}
const client = new Anthropic();

const SYSTEM_PROMPT = `You are a data extraction assistant for a venue and convention centre directory in Kerala, India.
Extract structured information from raw text, web page content, or Google/Instagram/Facebook page data about a convention centre or event venue.
Generate a polished, professional description in English.
Be smart: if the page mentions hall capacities, extract them. If it mentions amenities, list them.`;

const USER_PROMPT = (text: string) => `Extract information about this convention centre / event venue and return a JSON object:

{
  "name": string | null,                // venue/business name
  "description": string,                // polished professional description (2-4 sentences)
  "phone": string | null,               // primary phone number
  "whatsappPhone": string | null,       // WhatsApp number (if different)
  "email": string | null,               // email address
  "address": string | null,             // street address
  "city": string | null,                // city name
  "websiteUrl": string | null,          // website URL (not social media)
  "instagramUrl": string | null,        // full Instagram URL
  "facebookUrl": string | null,         // full Facebook URL
  "googleMapsUrl": string | null,       // Google Maps URL if mentioned
  "venueType": string | null,           // e.g. "CONVENTION_HALL", "WEDDING_HALL", "BANQUET_HALL"
  "amenities": string[],                // list of amenities/facilities mentioned (e.g. "AC", "Parking", "Stage", "Sound system", "Catering", "Generator")
  "halls": [                            // halls/spaces if mentioned
    {
      "name": string,                   // hall name (e.g. "Main Hall", "Banquet Hall A")
      "capacitySeated": number | null,  // seated capacity
      "capacityStanding": number | null, // standing/reception capacity
      "priceRupees": number | null      // price per booking slot in rupees (0 if not mentioned)
    }
  ],
  "photos": string[]                    // direct image URLs found in the page (jpg/png/webp), max 20
}

Raw text / page content:
${text}

Return ONLY the JSON object, no explanation or markdown.`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  let rawText: string = (body?.rawText ?? "").trim();
  const url: string = (body?.url ?? "").trim();

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
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: USER_PROMPT(rawText.slice(0, 5000)) }],
    });

    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");

    // Robust JSON extraction: find the outermost { ... } block in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in AI response:", text.slice(0, 500));
      return NextResponse.json({ error: "Could not parse AI response. Please try again." }, { status: 500 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ extracted });
  } catch (err) {
    console.error("AI prefill error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("auth") || msg.includes("API key") || msg.includes("401")) {
      return NextResponse.json({ error: "AI API key is invalid or missing. Check server configuration." }, { status: 503 });
    }
    if (msg.includes("model") || msg.includes("not found") || msg.includes("404")) {
      return NextResponse.json({ error: `Model error: ${msg}` }, { status: 503 });
    }
    return NextResponse.json({ error: `Extraction failed: ${msg}` }, { status: 500 });
  }
}
