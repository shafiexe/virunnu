import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { quoteGstFor } from "@/lib/caterer-quotes";
import { loadOrderInitial } from "@/lib/caterer-order-initial";
import { BackToList } from "@/components/back-to-list";
import { CatererOrderForm } from "@/components/caterer-order-form";
import type { PriceItem } from "@/components/caterer-items-manager";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ customer?: string; copy?: string; enquiry?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const { customer: customerId, copy, enquiry: enquiryId } = await searchParams;
  const [items, customer, copied, enquiry] = await Promise.all([
    db.catererItem.findMany({ where: { catererId: ctx.caterer.id }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    customerId ? db.catererCustomer.findFirst({ where: { id: customerId, catererId: ctx.caterer.id } }) : null,
    copy ? loadOrderInitial(ctx.caterer.id, copy) : null,
    enquiryId ? db.cateringEnquiry.findFirst({ where: { id: enquiryId, catererId: ctx.caterer.id } }) : null,
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 [&>*]:max-w-3xl space-y-5">
      <BackToList href="/caterer/quotes" label="Back to quotations" />
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">New quotation</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{copied ? `Copied from ${copied.customerName}'s order. Change the prices and date.` : "A price you can send before the customer confirms. It is not an order until they say yes."}</p>
      </div>
      <CatererOrderForm
        quote={{}} people={[]} catalog={items as PriceItem[]} gstRates={quoteGstFor(ctx.caterer)} key={copy ?? "new"}
        template={copied ? { ...copied.initial, notes: null, team: [], foodDiscountPaise: 0, foodDiscountReason: null, serviceDiscountPaise: 0, serviceDiscountReason: null } : undefined}
        prefill={copied ? undefined : customer ? { name: customer.name, phone: customer.phone, address: customer.address ?? "" } : enquiry ? { name: enquiry.name, phone: enquiry.phone, address: "", notes: [enquiry.guestCount ? `${enquiry.guestCount} guests` : "", enquiry.message ?? ""].filter(Boolean).join(" — ") } : undefined}
        defaultDate={enquiry?.eventDate ? enquiry.eventDate.toISOString().slice(0, 10) : undefined}
      />
    </div>
  );
}
