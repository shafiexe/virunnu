// One-off: copies every hall and caterer photo that is still only a link into Virunnu's own storage, so it cannot expire.
// Safe to run again: photos already copied are skipped, and a link that cannot be copied is left as it is.
//   npx tsx --env-file=.env scripts/import-photo-links.ts
// Run it with the DATABASE_URL (and BLOB_READ_WRITE_TOKEN, if you use Vercel Blob) of the place whose photos you want to copy.
import { db } from "../lib/db";
import { importCatererPhotos, importVenuePhotos } from "../lib/image-store";

async function main() {
  const venues = await db.venue.findMany({ select: { id: true, name: true, orgId: true } });
  for (const v of venues) {
    const r = await importVenuePhotos(v.id, v.orgId);
    if (r.copied || r.kept) console.log(`venue   ${v.name}: copied ${r.copied}, left as a link ${r.kept}`);
  }
  const caterers = await db.caterer.findMany({ where: { orgId: { not: null } }, select: { id: true, name: true, orgId: true } });
  for (const c of caterers) {
    const r = await importCatererPhotos(c.id, c.orgId!);
    if (r.copied || r.kept) console.log(`caterer ${c.name}: copied ${r.copied}, left as a link ${r.kept}`);
  }
  console.log("done");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
