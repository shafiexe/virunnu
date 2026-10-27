import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const apps = await db.catererApplication.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(apps);
}
