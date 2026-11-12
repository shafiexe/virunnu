import { lookup } from "dns/promises";
import { isIP } from "net";

// Fetching a link a person typed in is a way to make our server visit addresses it should not (our own network, cloud metadata).
// So: http(s) only, ordinary ports, the name must resolve to public addresses only, redirects are followed by hand and checked
// each time, and the body is cut off at a size limit.
export class FetchRefused extends Error {}

function privateIPv4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}
function privateIPv6(ip: string) {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  if (mapped) return privateIPv4(mapped[1]);
  return v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff");
}
export const isPrivateAddress = (ip: string) => (isIP(ip) === 4 ? privateIPv4(ip) : isIP(ip) === 6 ? privateIPv6(ip) : true);

async function assertPublic(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new FetchRefused("Only http and https links can be read");
  if (url.port && url.port !== "80" && url.port !== "443") throw new FetchRefused("That link uses an unusual port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) throw new FetchRefused("That link points inside a private network");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => { throw new FetchRefused("That address could not be found"); });
  if (addrs.length === 0 || addrs.some((a) => isPrivateAddress(a.address))) throw new FetchRefused("That link points inside a private network");
}

// Fetches any address a person typed in, following redirects by hand so every hop is checked, never reaching a private network.
export async function fetchGuarded(raw: string | URL, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs, ...rest } = init;
  let url: URL;
  try { url = new URL(raw); } catch { throw new FetchRefused("That is not a valid link"); }
  const signal = rest.signal ?? AbortSignal.timeout(timeoutMs ?? 10_000);
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(url);
    const res = await fetch(url, { ...rest, signal, redirect: "manual" });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) { url = new URL(next, url); continue; }
    return res;
  }
  throw new FetchRefused("That link redirects too many times");
}

export async function fetchPublicImage(raw: string, opts: { maxBytes?: number; timeoutMs?: number } = {}): Promise<{ bytes: Buffer; contentType: string }> {
  const maxBytes = opts.maxBytes ?? 8 * 1024 * 1024;
  let url: URL;
  try { url = new URL(raw); } catch { throw new FetchRefused("That is not a valid link"); }
  const signal = AbortSignal.timeout(opts.timeoutMs ?? 10_000);

  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, { signal, redirect: "manual", headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.5", "User-Agent": "Mozilla/5.0 (compatible; VirunnuPhotoImport/1.0)" } }).catch(() => { throw new FetchRefused("Could not reach that link"); });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) { url = new URL(res.headers.get("location")!, url); continue; }
    if (!res.ok) throw new FetchRefused(`That link answered with an error (${res.status})`);
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    // a picture only: not a web page, and not an SVG, which can carry scripts
    if (!contentType.startsWith("image/") || contentType.includes("svg")) throw new FetchRefused("That link is not a photo");
    if (Number(res.headers.get("content-length") ?? 0) > maxBytes) throw new FetchRefused("That photo is too large");
    const reader = res.body?.getReader();
    if (!reader) throw new FetchRefused("That link had no photo");
    const chunks: Uint8Array[] = []; let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) { reader.cancel().catch(() => {}); throw new FetchRefused("That photo is too large"); }
      chunks.push(value);
    }
    return { bytes: Buffer.concat(chunks), contentType };
  }
  throw new FetchRefused("That link redirects too many times");
}
