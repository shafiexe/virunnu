// Anti-bot / error pages that come back as normal text but contain no listing data.
const BLOCK_PAGE = /access denied|403 forbidden|forbidden|just a moment|attention required|verify you are (a )?human|captcha|unusual traffic/i;

export async function fetchPageText(url: string): Promise<string> {
  if (!isPublicHttpUrl(url)) throw new Error("URL not allowed");
  // Try Jina Reader first — handles JS-rendered pages (Google, Instagram, Facebook)
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      headers: { "Accept": "text/plain", "X-No-Cache": "true" },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 100 && !BLOCK_PAGE.test(text.slice(0, 600))) return text.slice(0, 6000);
    }
  } catch { /* fall through */ }

  // Fallback: direct fetch
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Page returned ${response.status}`);
  const html = await response.text();
  if (BLOCK_PAGE.test(html.slice(0, 1500))) throw new Error("Page blocked automated access");

  // Extract from HTML
  const parts: string[] = [];
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  if (title) parts.push(`Name: ${title.replace(/ - Google.*$/, "").trim()}`);
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];
  if (metaDesc) parts.push(`Description: ${metaDesc}`);
  const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of ldMatches) {
    try { parts.push(JSON.stringify(JSON.parse(m[1]), null, 1).slice(0, 2000)); } catch { /* skip */ }
  }
  const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
  if (bodyText) parts.push(bodyText);
  return parts.join("\n\n");
}

export type SiteDetails = {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  linkedin?: string;
  twitter?: string;
  whatsapp?: string;
  phones: string[];
  emails: string[];
  footerText: string;
  images: string[];
};

const SKIP_HOSTS = /(^|\.)(google\.[a-z.]+|goo\.gl|instagram\.com|facebook\.com|fb\.com|youtube\.com|wa\.me)$/i;

export function isPublicHttpUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const h = u.hostname;
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return null;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[)/.test(h)) return null;
    return u;
  } catch {
    return null;
  }
}

// Reads a convention centre's own website directly: social/contact links (often icon-only, so
// invisible to text extraction) plus the page footer, where address and phone usually live.
export async function fetchSiteDetails(url: string): Promise<SiteDetails | null> {
  const u = isPublicHttpUrl(url);
  if (!u || SKIP_HOSTS.test(u.hostname)) return null;

  const res = await fetch(u.toString(), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; VirunnuBot/1.0)", Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const html = (await res.text()).slice(0, 2_000_000);

  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1].replace(/&amp;/g, "&").replace(/&#x27;/g, "'"));
  const details: SiteDetails = { phones: [], emails: [], footerText: "", images: [] };

  for (const h of hrefs) {
    let link: URL | null = null;
    if (/^https?:\/\//i.test(h)) {
      try { link = new URL(h); } catch { continue; }
    }
    if (link) {
      const host = link.hostname.replace(/^www\./, "");
      const parts = link.pathname.split("/").filter(Boolean);
      if (host === "instagram.com" && parts.length >= 1 && !["p", "reel", "reels", "explore", "accounts"].includes(parts[0])) {
        details.instagram ??= `https://www.instagram.com/${parts[0]}/`;
      } else if ((host === "facebook.com" || host === "fb.com") && parts.length >= 1 && !["sharer", "sharer.php", "share", "dialog", "tr"].includes(parts[0])) {
        details.facebook ??= `https://www.facebook.com${link.pathname.replace(/\/$/, "")}`;
      } else if (host === "youtube.com" && (["channel", "c", "user"].includes(parts[0]) && parts[1])) {
        details.youtube ??= `https://www.youtube.com/${parts[0]}/${parts[1]}`;
      } else if (host === "youtube.com" && parts[0]?.startsWith("@")) {
        details.youtube ??= `https://www.youtube.com/${parts[0]}`;
      } else if (host === "linkedin.com" && ["company", "in", "school", "showcase"].includes(parts[0]) && parts[1]) {
        details.linkedin ??= `https://www.linkedin.com/${parts[0]}/${parts[1]}`;
      } else if ((host === "twitter.com" || host === "x.com") && parts[0] && !["intent", "share", "home", "i", "hashtag", "search", "login"].includes(parts[0])) {
        details.twitter ??= `https://x.com/${parts[0]}`;
      } else if (host === "wa.me" && parts[0] && /^\d{8,15}$/.test(parts[0])) {
        details.whatsapp ??= parts[0];
      }
    } else if (/^tel:/i.test(h)) {
      const p = decodeURIComponent(h.slice(4)).trim();
      if (p && !details.phones.includes(p)) details.phones.push(p);
    } else if (/^mailto:/i.test(h)) {
      const e = decodeURIComponent(h.slice(7).split("?")[0]).trim();
      if (e && !details.emails.includes(e)) details.emails.push(e);
    }
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  details.footerText = text.slice(-1800);
  details.images = await pickPhotos(extractImageUrls(html, res.url || u.toString()));
  return details;
}

const IMG_EXT = /\.(jpe?g|png|webp|avif)(\?|$)/i;
const JUNK = /(logo|icon|favicon|sprite|avatar|placeholder|pixel|badge|flag|arrow|whatsapp|instagram|facebook|youtube|linkedin|twitter|payment|loader|spinner|thumb-?\d{1,2}x|qr)/i;

function absolutize(raw: string, base: string): string | null {
  try {
    let u = new URL(raw.trim().replace(/&amp;/g, "&"), base);
    // Next.js optimizer URLs: /_next/image?url=<original>&w=640 — use the original image
    if (u.pathname.endsWith("/_next/image") && u.searchParams.get("url")) {
      u = new URL(u.searchParams.get("url")!, u.origin);
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

// Candidate gallery images in page order (hero/og image first), unfiltered by size.
function extractImageUrls(html: string, base: string): string[] {
  const found: string[] = [];
  const add = (raw?: string) => {
    if (!raw || raw.startsWith("data:")) return;
    const abs = absolutize(raw, base);
    if (abs && IMG_EXT.test(abs) && !JUNK.test(abs.split("/").pop() ?? "") && !found.includes(abs)) found.push(abs);
  };

  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/gi)) add(m[1]);

  for (const m of html.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    const tag = m[0];
    const w = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] ?? 0);
    const h = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1] ?? 0);
    if ((w && w < 250) || (h && h < 150)) continue;
    const srcset = tag.match(/\b(?:data-)?srcset=["']([^"']+)["']/i)?.[1];
    if (srcset) {
      const best = srcset
        .split(",")
        .map((c) => c.trim().split(/\s+/))
        .sort((a, b) => parseInt(b[1] ?? "0") - parseInt(a[1] ?? "0"))[0];
      add(best?.[0]);
    }
    add(tag.match(/\b(?:data-src|data-lazy-src|data-original|src)=["']([^"']+)["']/i)?.[1]);
  }

  for (const m of html.matchAll(/url\(["']?([^"')]+)["']?\)/gi)) add(m[1]);
  for (const m of html.matchAll(/"image"\s*:\s*"([^"]+)"/gi)) add(m[1]);

  // Same picture at several sizes (…-640.jpg / …-1920.jpg) → keep the first seen
  const seen = new Set<string>();
  return found.filter((u) => {
    const key = u.split("?")[0].replace(/[-_]\d{2,4}x\d{2,4}(?=\.)/, "").replace(/[-_]\d{3,4}(?=\.[a-z]+$)/i, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Keeps only images that load and are big enough to be real photos (not icons/thumbnails).
async function pickPhotos(candidates: string[], max = 16): Promise<string[]> {
  const checked = await Promise.all(
    candidates.slice(0, 30).map(async (url) => {
      try {
        const r = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(5000) });
        const type = r.headers.get("content-type") ?? "";
        const len = Number(r.headers.get("content-length") ?? 0);
        if (!r.ok || !type.startsWith("image/") || type.includes("svg")) return null;
        if (len && len < 25_000) return null;
        return url;
      } catch {
        return null;
      }
    })
  );
  return checked.filter((u): u is string => !!u).slice(0, max);
}
