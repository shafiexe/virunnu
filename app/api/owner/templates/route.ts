import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { TEMPLATE_KEYS, TEMPLATE_DEFAULTS, TEMPLATE_VARIABLES, type TemplateKey } from "@/services/notification.service";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.orgId!;

  const overrides = await db.orgMessageTemplate.findMany({
    where: { orgId },
    select: { key: true, body: true, subject: true },
  });

  const overrideMap = new Map(overrides.map((o) => [o.key, o]));

  const templates = TEMPLATE_KEYS.map((key) => {
    const override = overrideMap.get(key);
    return {
      key,
      body: override?.body ?? TEMPLATE_DEFAULTS[key as TemplateKey],
      subject: override?.subject ?? null,
      isDefault: !override,
      variables: TEMPLATE_VARIABLES[key as TemplateKey] ?? [],
    };
  });

  return NextResponse.json({ templates });
}
