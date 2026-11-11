import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// A business's logo. Public, because it appears on invoices customers open from a link.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const logo = await db.orgLogo.findUnique({ where: { orgId } });
  if (!logo) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(logo.data), {
    headers: { "Content-Type": logo.contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
