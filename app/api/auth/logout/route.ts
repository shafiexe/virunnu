import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  await clearSession();
  return NextResponse.redirect(new URL("/login", process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000")));
}
