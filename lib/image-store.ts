import sharp from "sharp";
import { db } from "@/lib/db";
import { fetchPublicImage, FetchRefused } from "@/lib/safe-fetch";

export class ImageError extends Error {}

// Where photos live. With a Vercel Blob store connected to the project (BLOB_READ_WRITE_TOKEN is added by Vercel), they go there and
// are served from its CDN. Without one they are kept in the database and served at /api/img/<id>, so it works with no set-up.
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_HOST = ".public.blob.vercel-storage.com";

export const isStoredHere = (url: string) => url.startsWith("/api/img/") || url.includes(BLOB_HOST);
const isExternal = (url: string) => /^https?:\/\//i.test(url) && !isStoredHere(url);

// Any picture in, one tidy JPEG out: turned the right way up, no larger than a screen needs, and with the camera's location data removed.
async function normalise(bytes: Buffer) {
  try {
    return await sharp(bytes, { failOn: "none" }).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch {
    throw new ImageError("That file is not a photo we can read. Use a JPG, PNG or WebP picture.");
  }
}

export async function saveImage(bytes: Buffer, orgId: string | null): Promise<string> {
  const jpeg = await normalise(bytes);
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`photos/${orgId ?? "shared"}/photo.jpg`, jpeg, { access: "public", contentType: "image/jpeg", addRandomSuffix: true });
    return blob.url;
  }
  // a database full of one account's pictures is a risk, so each account has a generous limit
  if (orgId && (await db.storedImage.count({ where: { orgId } })) >= 300) throw new ImageError("You have reached the limit of 300 saved photos. Remove some first.");
  const row = await db.storedImage.create({ data: { orgId, contentType: "image/jpeg", data: new Uint8Array(jpeg) }, select: { id: true } });
  return `/api/img/${row.id}`;
}

// Takes a copy of a photo that is only a link. Fails with a message a person can read when the link is not a photo or cannot be reached.
export async function importFromLink(url: string, orgId: string | null): Promise<string> {
  if (isStoredHere(url)) return url;
  try {
    const { bytes } = await fetchPublicImage(url);
    return await saveImage(bytes, orgId);
  } catch (e) {
    if (e instanceof FetchRefused || e instanceof ImageError) throw e;
    throw new ImageError("Could not copy that photo.");
  }
}

// Same, but never throws: a link that cannot be copied stays as it was, so nothing that worked before stops working.
export async function importOrKeep(url: string, orgId: string | null): Promise<{ url: string; copied: boolean }> {
  if (!isExternal(url)) return { url, copied: isStoredHere(url) };
  try { return { url: await importFromLink(url, orgId), copied: true }; } catch { return { url, copied: false }; }
}

export async function deleteImage(url: string) {
  try {
    if (url.startsWith("/api/img/")) await db.storedImage.deleteMany({ where: { id: url.slice("/api/img/".length) } });
    else if (url.includes(BLOB_HOST) && useBlob()) { const { del } = await import("@vercel/blob"); await del(url); }
  } catch { /* an image that is already gone is fine */ }
}

// Copies a list of links a few at a time. Result is in the same order.
export async function importMany(urls: string[], orgId: string | null, concurrency = 4) {
  const out: { url: string; copied: boolean }[] = new Array(urls.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
    while (next < urls.length) { const i = next++; out[i] = await importOrKeep(urls[i], orgId); }
  }));
  return out;
}

// Every photo of a venue's halls that is still only a link
export async function importVenuePhotos(venueId: string, orgId: string) {
  const photos = await db.hallPhoto.findMany({ where: { hall: { venueId } }, select: { id: true, url: true } });
  const todo = photos.filter((p) => isExternal(p.url));
  const done = await importMany(todo.map((p) => p.url), orgId);
  await Promise.all(todo.map((p, i) => (done[i].copied ? db.hallPhoto.update({ where: { id: p.id }, data: { url: done[i].url } }) : null)));
  return { copied: done.filter((d) => d.copied).length, kept: done.filter((d) => !d.copied).length };
}

// A caterer's photo list
export async function importCatererPhotos(catererId: string, orgId: string) {
  const c = await db.caterer.findUnique({ where: { id: catererId }, select: { photos: true } });
  if (!c) return { copied: 0, kept: 0 };
  const done = await importMany(c.photos, orgId);
  if (done.some((d) => d.copied && d.url !== c.photos[done.indexOf(d)])) await db.caterer.update({ where: { id: catererId }, data: { photos: done.map((d) => d.url) } });
  return { copied: done.filter((d, i) => d.copied && d.url !== c.photos[i]).length, kept: done.filter((d) => !d.copied).length };
}
