import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { pendingRequestCount } from "@/lib/owner-pending";

// How many requests to book are waiting, for the badge on the phone's bottom bar
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: await pendingRequestCount(session.orgId) }, { headers: { "Cache-Control": "no-store" } });
}
