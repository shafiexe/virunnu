import { db } from "@/lib/db";
import { TEMPLATE_KEYS, type Templates } from "@/lib/caterer-templates";

// The team's own wording, for the templates they have changed; the rest fall back to the defaults when a message is built.
export async function loadTemplates(orgId: string | null | undefined): Promise<Partial<Templates>> {
  if (!orgId) return {};
  const rows = await db.orgMessageTemplate.findMany({ where: { orgId, key: { in: [...TEMPLATE_KEYS] } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.body])) as Partial<Templates>;
}
