import { Prisma } from "@prisma/client";
import { strToU8, zipSync } from "fflate";
import { db } from "@/lib/db";
import { entitiesFor, ENTITIES, type BackupKind, type Ctx, type Entity } from "@/lib/backup/registry";

export const BACKUP_FORMAT = "virunnu-backup";
export const BACKUP_VERSION = 1;

type Row = Record<string, unknown>;
type Field = { name: string; kind: string; type: string; isList: boolean; relationFromFields?: readonly string[]; relationName?: string };

const models = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
const modelName = (delegate: string) => delegate[0].toUpperCase() + delegate.slice(1);
export const scalarFields = (e: Entity): Field[] => (models.get(modelName(e.model))?.fields ?? []).filter((f) => f.kind === "scalar" || f.kind === "enum") as Field[];

// A database row as plain JSON: dates as text, so the file can be read back exactly.
export function plain(row: Row, fields: Field[]): Row {
  const out: Row = {};
  for (const f of fields) {
    const v = row[f.name];
    out[f.name] = v instanceof Date ? v.toISOString() : v ?? null;
  }
  return out;
}

export type BackupData = Record<string, Row[]>;

export async function readAccount(kind: BackupKind, ctx: Ctx): Promise<BackupData> {
  const data: BackupData = {};
  for (const e of entitiesFor(kind)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await (db as any)[e.model].findMany({ where: e.where(ctx), orderBy: { id: "asc" } })) as Row[];
    const f = scalarFields(e);
    data[e.key] = rows.map((r) => plain(r, f));
  }
  return data;
}

// ── the readable files ───────────────────────────────────────────────────────
const HIDE = new Set(["id", "orgId", "catererId", "shareToken", "updatedAt", "heldUntil", "razorpayOrderId", "razorpayPaymentId", "lat", "lng"]);
const human = (n: string) => n.replace(/Paise$/, "").replace(/Bp$/, "").replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).replace(/\bId$/, "").trim();
const IST = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().replace("T", " ").slice(0, 16);

function cell(f: Field, v: unknown): string {
  if (v === null || v === undefined) return "";
  if (f.name.endsWith("Paise") && typeof v === "number") return (v / 100).toFixed(2);
  if (f.name.endsWith("Bp") && typeof v === "number") return (v / 100).toFixed(2);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (f.type === "DateTime" && typeof v === "string") return f.name === "date" || f.name.endsWith("On") || f.name === "validUntil" ? v.slice(0, 10) : IST(v);
  if (Array.isArray(v)) return v.join("; ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
const csvEscape = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function readableCsv(e: Entity, rows: Row[], names: Map<string, string>, parentOf: Map<string, string>): string {
  const fields = scalarFields(e).filter((f) => !HIDE.has(f.name));
  const header = [...fields.map((f) => {
    if (f.name.endsWith("Id") && parentOf.has(f.name)) return human(f.name);
    return f.name.endsWith("Paise") || f.name.endsWith("Bp") ? `${human(f.name)} (${f.name.endsWith("Bp") ? "%" : "₹"})` : human(f.name);
  }), "Ref (do not edit)"];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) {
    const cells = fields.map((f) => (f.name.endsWith("Id") && parentOf.has(f.name) && r[f.name] ? names.get(String(r[f.name])) ?? String(r[f.name]) : cell(f, r[f.name])));
    lines.push([...cells, String(r.id)].map(csvEscape).join(","));
  }
  return lines.join("\r\n");
}

const README = (title: string, when: string, files: string[]) => `${title}
Backup taken on ${when}

WHAT IS IN THIS FILE
Every record of your account at that moment, as sheets you can open in Excel or Google Sheets:
${files.map((f) => `  - ${f}`).join("\n")}
Amounts are in rupees. The last column, "Ref", identifies each row: please leave it as it is.

HOW TO GET YOUR DATA BACK
1. Sign in to Virunnu, open Settings, then "Backup".
2. Choose "Restore from a backup" and pick THIS .zip file (do not unzip it).
3. Check the summary it shows, then confirm.
Restoring adds anything that is missing and puts back the saved version of anything that has changed. It never deletes anything you have added since. A copy of your current data is downloaded just before, so you can undo.

NOT INCLUDED
Passwords and team logins (add your team again), photos (their links are kept, the photos themselves stay with Virunnu), and payments made on the website (Virunnu keeps those records).

The sheets are for reading and printing. Restoring uses the file called backup.json.
`;

export async function buildBackupZip(kind: BackupKind, ctx: Ctx, title: string): Promise<{ bytes: Uint8Array; counts: Record<string, number> }> {
  const data = await readAccount(kind, ctx);
  const list = entitiesFor(kind);
  // a name for every row, so other sheets can say "Hall A" instead of a code
  const names = new Map<string, string>();
  for (const e of list) for (const r of data[e.key]) names.set(String(r.id), e.name(r));
  const when = new Date().toISOString();
  const files: Record<string, Uint8Array> = {};
  const counts: Record<string, number> = {};
  const sheetNames: string[] = [];
  list.forEach((e, i) => {
    const rows = data[e.key];
    counts[e.key] = rows.length;
    const parentOf = new Map<string, string>();
    for (const f of scalarFields(e)) if (f.name.endsWith("Id")) parentOf.set(f.name, f.name);
    const file = `${String(i + 1).padStart(2, "0")} ${e.label}.csv`;
    sheetNames.push(`${file} (${rows.length})`);
    files[file] = strToU8("﻿" + readableCsv(e, rows, names, parentOf));
  });
  files["READ ME.txt"] = strToU8(README(title, new Date(new Date(when).getTime() + 330 * 60_000).toISOString().replace("T", " ").slice(0, 16) + " IST", sheetNames));
  files["backup.json"] = strToU8(JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, kind, title, exportedAt: when, entities: list.filter((e) => !e.exportOnly).map((e) => ({ key: e.key, count: data[e.key].length })), data }));
  return { bytes: zipSync(files, { level: 6 }), counts };
}
export { ENTITIES };
