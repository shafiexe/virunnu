import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rate-limit";
import type { SessionPayload } from "@/lib/session";

// Every AI call costs money, so each account has an hourly and a daily allowance per helper. Team members share their account's allowance.
// (Like the other limits this is kept per server instance, so it holds back runaway use rather than being an exact count.)
const LIMITS = {
  "booking-draft": { hour: 60, day: 200 },
  "read-bill": { hour: 40, day: 150 },
  "diary-read": { hour: 60, day: 200 },
  prefill: { hour: 10, day: 30 },
} as const;

export function aiLimited(kind: keyof typeof LIMITS, session: SessionPayload): NextResponse | null {
  const who = session.orgId ?? session.userId;
  const l = LIMITS[kind];
  if (rateLimited(`ai:${kind}:${who}:h`, l.hour, 60 * 60_000) || rateLimited(`ai:${kind}:${who}:d`, l.day, 24 * 60 * 60_000)) {
    return NextResponse.json({ error: "You have used this helper a lot today. Please try again later, or fill it in by hand." }, { status: 429 });
  }
  return null;
}
