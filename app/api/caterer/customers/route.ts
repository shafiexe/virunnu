import { NextRequest, NextResponse } from "next/server";
import { getCatererForSession } from "@/lib/caterer-session";
import { customerSummaries } from "@/lib/caterer-customers";
import { normalizeCustomerPhone } from "@/lib/caterer-orders";
import { usualFor } from "@/lib/caterer-usual";

export async function GET(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const phone = sp.get("phone");
  const customers = await customerSummaries(ctx.caterer.id, {
    search: sp.get("search") ?? undefined,
    phone: phone && phone.replace(/\D/g, "").length >= 10 ? normalizeCustomerPhone(phone) : undefined,
  });
  // looking one customer up by phone (the order form does this): also say what they were charged last time
  const usual = phone && customers.length === 1 ? await usualFor(ctx.caterer.id, customers[0].id) : null;
  const hide = ctx.session.deny?.includes("hide.phones");
  return NextResponse.json({ customers: hide ? customers.map((c) => ({ ...c, phone: "" })) : customers, usual });
}
