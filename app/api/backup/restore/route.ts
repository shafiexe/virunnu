import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { backupAccount } from "@/lib/backup/access";
import { finishRestore, restoreBatch, RestoreError } from "@/lib/backup/restore";
import { logActivity } from "@/lib/activity";
import { rateLimited, TOO_MANY } from "@/lib/rate-limit";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("batch"), key: z.string().min(1).max(40), rows: z.array(z.unknown()).max(1000), apply: z.boolean() }),
  z.object({ action: z.literal("finish"), summary: z.string().max(200).optional() }),
]);

// The browser reads the file and sends it in small batches, so a big backup never hits the size limit of one request.
export async function POST(req: NextRequest) {
  const a = await backupAccount();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  if (rateLimited(`restore:${a.ctx.orgId}`, 1500, 60 * 60_000)) return NextResponse.json(TOO_MANY, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The file could not be read" }, { status: 400 });
  try {
    if (parsed.data.action === "finish") {
      await finishRestore(a.kind, a.ctx);
      await logActivity(a.session, `Restored from a backup${parsed.data.summary ? `: ${parsed.data.summary}` : ""}`, "restore");
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(await restoreBatch(a.kind, a.ctx, parsed.data.key, parsed.data.rows, parsed.data.apply));
  } catch (e) {
    if (e instanceof RestoreError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[restore]", e);
    return NextResponse.json({ error: "Something went wrong while restoring. Nothing more was changed; you can try again." }, { status: 500 });
  }
}
