import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { loadOrderInitial } from "@/lib/caterer-order-initial";
import { gstFor } from "@/lib/caterer-gst";
import { BackToList } from "@/components/back-to-list";
import { CatererOrderForm } from "@/components/caterer-order-form";
import type { PriceItem } from "@/components/caterer-items-manager";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ date?: string; customer?: string; enquiry?: string; copy?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const { date, customer: customerId, enquiry: enquiryId, copy } = await searchParams;
  const enquiry = enquiryId ? await db.cateringEnquiry.findFirst({ where: { id: enquiryId, catererId: ctx.caterer.id } }) : null;
  const customer = customerId ? await db.catererCustomer.findFirst({ where: { id: customerId, catererId: ctx.caterer.id } }) : null;

  const copied = copy ? await loadOrderInitial(ctx.caterer.id, copy) : null;
  // for a returning customer, offer their latest order as a starting point
  const last = !copied && customer ? await db.catererOrder.findFirst({ where: { catererId: ctx.caterer.id, customerId: customer.id, status: { not: "CANCELLED" } }, orderBy: { date: "desc" }, select: { id: true, date: true, eventType: true } }) : null;

  const people = (await db.employee.findMany({ where: { orgId: ctx.caterer.orgId!, isActive: true }, select: { id: true, name: true, role: true, payType: true, salaryPaise: true, dailyRatePaise: true }, orderBy: { name: "asc" } })).map((e) => ({ id: e.id, name: e.name, role: e.role, payType: (e.payType === "DAILY" ? "DAILY" : "MONTHLY") as "DAILY" | "MONTHLY", ratePaise: (e.payType === "DAILY" ? e.dailyRatePaise : e.salaryPaise) ?? 0 }));
  const items = await db.catererItem.findMany({ where: { catererId: ctx.caterer.id }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 [&>*]:max-w-3xl space-y-5">
      <BackToList href="/caterer/orders" label="Back to orders" />
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">New order</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{copied ? `Copied from ${copied.customerName}'s earlier order. Change the date and anything else.` : enquiry ? `From the enquiry by ${enquiry.name}` : `Next invoice number: ${ctx.caterer.nextInvoiceNumber}`}</p>
      </div>
      {last && (
        <a href={`/caterer/orders/new?copy=${last.id}${date ? `&date=${date}` : ""}`} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200 hover:bg-amber-100">
          <span>Start from {customer?.name}&apos;s last order ({last.eventType ?? "Function"}, {last.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })})</span>
          <span className="font-semibold shrink-0">Copy items →</span>
        </a>
      )}
      {items.length === 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Your price list is empty, so there is nothing to tick yet. Add your usual items in <a href="/caterer/items" className="font-semibold underline">Menu &amp; Prices</a> first, or add one-off items below.
        </div>
      )}
      <CatererOrderForm gstRates={{ FOOD: gstFor(ctx.caterer, "FOOD"), SERVICE: gstFor(ctx.caterer, "SERVICE") }} key={copy ?? "new"} template={copied ? { ...copied.initial, notes: null, foodDiscountPaise: 0, foodDiscountReason: null, serviceDiscountPaise: 0, serviceDiscountReason: null } : undefined} people={people} catalog={items as PriceItem[]} prefill={copied ? undefined : customer ? { name: customer.name, phone: customer.phone, address: customer.address ?? "" } : enquiry ? { name: enquiry.name, phone: enquiry.phone, address: "", notes: [enquiry.guestCount ? `${enquiry.guestCount} guests` : "", enquiry.message ?? ""].filter(Boolean).join(" — ") } : undefined} enquiryId={enquiry?.id} defaultDate={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : enquiry?.eventDate ? enquiry.eventDate.toISOString().slice(0, 10) : undefined} />
    </div>
  );
}
