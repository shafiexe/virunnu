import { connection } from "next/server";
export const instant = false;
import { notFound } from "next/navigation";
import { loadStatement } from "@/lib/caterer-bills";
import { orgLogoUrl } from "@/lib/org-logo";
import { CatererStatement, type StatementRow } from "@/components/caterer-statement";
import { PrintButton } from "@/components/print-button";

export default async function SharedStatementPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const customer = await loadStatement({ shareToken: token });
  if (!customer) notFound();

  const rows: StatementRow[] = customer.orders.flatMap((o) =>
    o.bills.map((b) => ({
      number: b.number, type: b.type, createdAt: b.createdAt, functionDate: o.date, cancelled: o.status === "CANCELLED",
      subtotalPaise: b.subtotalPaise, discountPaise: b.discountPaise, taxPaise: b.taxPaise, receivedPaise: b.receivedPaise,
    }))
  ).sort((a, b) => b.number - a.number);

  return (
    <div className="py-6">
      <style>{`@media print { body { background: white !important } .no-print { display: none !important } }`}</style>
      <div className="no-print max-w-3xl mx-auto px-5 pb-4 flex justify-end"><PrintButton /></div>
      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none px-5 py-6">
        <CatererStatement
          logoUrl={await orgLogoUrl(customer.caterer.orgId)} catererName={customer.caterer.name} catererPhone={customer.caterer.phone}
          customer={{ name: customer.name, phone: customer.phone }} rows={rows}
        />
      </div>
    </div>
  );
}
