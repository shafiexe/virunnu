import { NextResponse } from "next/server";
import { backupAccount } from "@/lib/backup/access";
import { buildBackupZip } from "@/lib/backup/export";
import { logActivity } from "@/lib/activity";
import { rateLimited, TOO_MANY } from "@/lib/rate-limit";

// The whole account as one .zip: readable sheets for people, and the file restore reads.
export async function GET() {
  const a = await backupAccount();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  if (rateLimited(`backup:${a.ctx.orgId}`, 20, 60 * 60_000)) return NextResponse.json(TOO_MANY, { status: 429 });
  const { bytes, counts } = await buildBackupZip(a.kind, a.ctx, a.title);
  await logActivity(a.session, `Downloaded a backup (${Object.values(counts).reduce((t, n) => t + n, 0)} records)`, "backup");
  const name = a.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "account";
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="virunnu-backup-${name}-${new Date().toISOString().slice(0, 10)}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
