import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { entityByKey, type BackupKind, type Ctx } from "@/lib/backup/registry";
import { plain, scalarFields } from "@/lib/backup/export";

type Row = Record<string, unknown>;
export class RestoreError extends Error { constructor(message: string, readonly status = 400) { super(message); } }

const ID = /^[A-Za-z0-9_-]{8,40}$/;
export const MAX_BATCH = 1000;

function parseValue(f: { name: string; type: string }, v: unknown): unknown {
  if (v === null || v === undefined) return null;
  // the model description does not say which fields are lists, so a list is told by its shape (Json fields keep theirs as they are)
  if (Array.isArray(v) && f.type !== "Json") return v.map(String);
  switch (f.type) {
    case "Int": if (!Number.isInteger(v)) throw new RestoreError(`"${f.name}" should be a whole number`); return v;
    case "Float": if (typeof v !== "number" || !Number.isFinite(v)) throw new RestoreError(`"${f.name}" should be a number`); return v;
    case "Boolean": if (typeof v !== "boolean") throw new RestoreError(`"${f.name}" should be yes or no`); return v;
    case "DateTime": { const d = new Date(String(v)); if (Number.isNaN(d.getTime())) throw new RestoreError(`"${f.name}" is not a date`); return d; }
    case "Json": return v;
    default: if (typeof v !== "string") throw new RestoreError(`"${f.name}" should be text`); return v.slice(0, 20_000);
  }
}

export type BatchResult = { key: string; added: number; updated: number; same: number };

// One batch of rows from the file. With apply=false nothing is written: it only says what would happen.
export async function restoreBatch(kind: BackupKind, ctx: Ctx, key: string, rows: unknown, apply: boolean): Promise<BatchResult> {
  const e = entityByKey(kind, key);
  if (!e || e.exportOnly) throw new RestoreError(`"${key}" is not something that can be restored`);
  if (!Array.isArray(rows) || rows.length > MAX_BATCH) throw new RestoreError("The file could not be read");
  if (rows.length === 0) return { key, added: 0, updated: 0, same: 0 };

  const fields = scalarFields(e);
  const forced = e.forced?.(ctx) ?? {};
  const skip = new Set(["id", "updatedAt", ...(e.noRestore ?? []), ...Object.keys(forced)]);
  const writable = fields.filter((f) => !skip.has(f.name));

  const parsed = new Map<string, Row>();
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") throw new RestoreError("The file could not be read");
    const r = raw as Row;
    if (typeof r.id !== "string" || !ID.test(r.id)) throw new RestoreError("A row in the file has no valid Ref");
    const data: Row = {};
    for (const f of writable) if (f.name in r) data[f.name] = parseValue(f, r[f.name]);
    parsed.set(r.id, data);
  }
  const ids = [...parsed.keys()];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (db as any)[e.model];
  const [existing, owned] = await Promise.all([
    delegate.findMany({ where: { id: { in: ids } } }) as Promise<Row[]>,
    delegate.findMany({ where: { AND: [{ id: { in: ids } }, e.where(ctx)] }, select: { id: true } }) as Promise<{ id: string }[]>,
  ]);
  const ownedIds = new Set(owned.map((o) => o.id));
  // a Ref that is already used by someone else's record: this file is not from this account
  if (existing.some((x) => !ownedIds.has(String(x.id)))) throw new RestoreError("This file contains records that belong to another account, so nothing was restored.", 403);
  const have = new Map(existing.map((x) => [String(x.id), x]));

  const fresh: [string, Row][] = [];
  const changed: [string, Row][] = [];
  let same = 0;
  for (const [id, data] of parsed) {
    const row = have.get(id);
    if (!row) { fresh.push([id, data]); continue; }
    const keys = Object.keys(data);
    const before = plain(row, writable.filter((f) => keys.includes(f.name)));
    const after = plain(data, writable.filter((f) => keys.includes(f.name)));
    if (JSON.stringify(before, keys.sort()) === JSON.stringify(after, keys.sort())) same++; else changed.push([id, data]);
  }
  const result = { key, added: fresh.length, updated: changed.length, same };
  if (!apply) return result;

  // every row this one points to must be one of this account's own
  for (const p of e.parents ?? []) {
    const pe = entityByKey(kind, p.entity)!;
    const need = [...new Set([...parsed.values()].map((d) => d[p.field]).filter((v): v is string => typeof v === "string"))];
    if (need.length === 0) { if (!p.optional && fresh.length) throw new RestoreError(`A row points to a missing ${pe.label.toLowerCase()} record`); continue; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = await (db as any)[pe.model].findMany({ where: { AND: [{ id: { in: need } }, pe.where(ctx)] }, select: { id: true } }) as { id: string }[];
    if (found.length !== need.length) throw new RestoreError(`Some ${e.label.toLowerCase()} point to ${pe.label.toLowerCase()} that are not in your account`);
    if (!p.optional && [...parsed.values()].some((d) => d[p.field] == null)) throw new RestoreError(`A row has no ${p.field}`);
  }

  try {
    await db.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = (tx as any)[e.model];
      if (fresh.length) await t.createMany({ data: fresh.map(([id, data]) => ({ ...data, ...forced, id })) });
      for (const [id, data] of changed) await t.update({ where: { id }, data });
    }, { timeout: 60_000 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new RestoreError(`Some ${e.label.toLowerCase()} clash with ones you already have (the same number or name), so this part could not be restored.`, 409);
    if (err instanceof Prisma.PrismaClientValidationError) throw new RestoreError(`Some ${e.label.toLowerCase()} in the file are incomplete or from a different version.`);
    throw err;
  }
  return result;
}

// After everything is back, the totals that are kept on a row are worked out again from the payments under it.
export async function finishRestore(kind: BackupKind, ctx: Ctx): Promise<void> {
  if (kind === "OWNER") {
    await db.$executeRaw`UPDATE "Booking" b SET "advancePaise" = s.total
      FROM (SELECT "bookingId", SUM("amountPaise")::int AS total FROM "BookingPayment" GROUP BY "bookingId") s
      WHERE b.id = s."bookingId" AND b."orgId" = ${ctx.orgId} AND b."advancePaise" IS DISTINCT FROM s.total`;
    return;
  }
  const c = ctx.catererId!;
  await db.$executeRaw`UPDATE "CatererBill" b SET "receivedPaise" = COALESCE(s.total, 0)
    FROM (SELECT "billId", SUM("amountPaise")::int AS total FROM "CatererPayment" GROUP BY "billId") s
    WHERE b.id = s."billId" AND b."catererId" = ${c} AND b."receivedPaise" IS DISTINCT FROM COALESCE(s.total, 0)`;
  await db.$executeRaw`UPDATE "CatererPurchase" p SET "paidPaise" = COALESCE(s.total, 0)
    FROM (SELECT "purchaseId", SUM("amountPaise")::int AS total FROM "CatererPurchasePayment" GROUP BY "purchaseId") s
    WHERE p.id = s."purchaseId" AND p."catererId" = ${c} AND p."paidPaise" IS DISTINCT FROM COALESCE(s.total, 0)`;
  // numbers for the next invoice and quote carry on after the highest one restored
  await db.$executeRaw`UPDATE "Caterer" SET "nextInvoiceNumber" = GREATEST("nextInvoiceNumber", COALESCE((SELECT MAX(number) + 1 FROM "CatererBill" WHERE "catererId" = ${c}), 1)),
    "nextQuoteNumber" = GREATEST("nextQuoteNumber", COALESCE((SELECT MAX(number) + 1 FROM "CatererQuote" WHERE "catererId" = ${c}), 1)) WHERE id = ${c}`;
}
