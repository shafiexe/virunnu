import { amountInWords, BILL_LABEL, billMoney, formatInvoiceDate, rs, type BillTypeKey } from "@/lib/caterer-orders";

export type InvoiceBill = {
  number: number;
  type: BillTypeKey;
  createdAt: Date;
  subtotalPaise: number;
  discountPaise: number; taxPaise: number; gstRateBp: number; gstInclusive: boolean; gstPaise: number;
  discountReason: string | null;
  receivedPaise: number;
  lines: { name: string; unit: string; quantity: number; ratePaise: number; amountPaise: number }[];
};

// Set when the sheet is a quotation rather than an invoice
export type QuoteInfo = { label: string; validUntil: Date | null };

export type InvoiceParty = {
  caterer: { name: string; phone: string; whatsappNumber: string | null; address: string | null; city: string; upiId?: string | null; bankDetails?: string | null; invoiceNote?: string | null; logoUrl?: string | null; gstin?: string | null };
  customer: { name: string; phone: string; address: string | null };
  functionDate: Date;
  place: string | null;
};

const pct = (n: number) => (Math.round(n) / 100).toString();
const qty = (n: number) => (Number.isInteger(n) ? String(n) : String(n));
const cell = "border border-zinc-800 px-2 py-1";

function BillBlock({ bill, party, quote }: { bill: InvoiceBill; party: InvoiceParty; quote?: QuoteInfo }) {
  const m = billMoney(bill);
  const totalQty = bill.lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <section className="break-inside-avoid text-[13px] text-zinc-900">
      <h2 className="text-center text-xl font-bold mb-3">{quote ? "Quotation" : bill.gstRateBp > 0 ? "Tax Invoice" : "Invoice"} <span className="block text-xs font-medium text-zinc-500">{BILL_LABEL[bill.type]}</span></h2>

      <div className="border border-zinc-800">
        <div className="p-3 border-b border-zinc-800 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {party.caterer.logoUrl && <img src={party.caterer.logoUrl} alt="" className="h-14 w-14 shrink-0 object-contain" />}
          <div className="min-w-0">
            <div className="text-lg font-bold uppercase tracking-wide">{party.caterer.name}</div>
            <div className="text-xs">Phone: <span className="font-semibold">{party.caterer.phone}</span>{party.caterer.gstin && bill.gstRateBp > 0 && <span className="ml-3">GSTIN: <span className="font-semibold">{party.caterer.gstin}</span></span>}</div>
            {(party.caterer.address || party.caterer.city) && <div className="text-xs text-zinc-600">{[party.caterer.address, party.caterer.city].filter(Boolean).join(", ")}</div>}
          </div>
        </div>
        <div className="grid grid-cols-2 border-b border-zinc-800">
          <div className="p-3 border-r border-zinc-800">
            <div className="text-[11px] font-semibold uppercase text-zinc-500">Bill To</div>
            <div className="font-semibold">{party.customer.name}</div>
            <div className="text-xs">{party.customer.phone}</div>
            {party.customer.address && <div className="text-xs text-zinc-600">{party.customer.address}</div>}
          </div>
          <div className="p-3">
            <div className="text-[11px] font-semibold uppercase text-zinc-500">{quote ? "Quotation Details" : "Invoice Details"}</div>
            <div>No: <span className="font-semibold">{quote ? quote.label : bill.number}</span></div>
            <div>Date: <span className="font-semibold">{formatInvoiceDate(bill.createdAt)}</span></div>
            <div className="text-xs text-zinc-600">Function: {formatInvoiceDate(party.functionDate)}{party.place ? ` · ${party.place}` : ""}</div>
            {quote?.validUntil && <div className="text-xs text-zinc-600">Valid until: <span className="font-semibold">{formatInvoiceDate(quote.validUntil)}</span></div>}
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-zinc-100 text-xs">
              <th className={`${cell} w-8 text-left`}>#</th>
              <th className={`${cell} text-left`}>Item Name</th>
              <th className={`${cell} text-right`}>Quantity</th>
              <th className={`${cell} text-right`}>Price/ Unit (₹)</th>
              <th className={`${cell} text-right`}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {bill.lines.map((l, i) => (
              <tr key={i}>
                <td className={cell}>{i + 1}</td>
                <td className={`${cell} font-semibold`}>{l.name}</td>
                <td className={`${cell} text-right`}>{qty(l.quantity)}{l.unit && l.unit !== "nos" ? ` ${l.unit}` : ""}</td>
                <td className={`${cell} text-right`}>{rs(l.ratePaise)}</td>
                <td className={`${cell} text-right`}>{rs(l.amountPaise)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className={cell} />
              <td className={cell}>Total</td>
              <td className={`${cell} text-right`}>{qty(totalQty)}</td>
              <td className={cell} />
              <td className={`${cell} text-right`}>{rs(bill.subtotalPaise)}</td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-[1fr_16rem]">
          <div className="p-3 border-r border-zinc-800 text-xs">
            <div className="font-semibold uppercase text-zinc-500 text-[11px] mb-1">{quote ? "Amount In Words" : "Invoice Amount In Words"}</div>
            <div>{amountInWords(m.netPaise)}</div>
          </div>
          <div className="text-xs">
            <div className="flex justify-between px-3 py-1"><span>Sub Total</span><span>{rs(bill.subtotalPaise)}</span></div>
            {bill.discountPaise > 0 && (
              <div className="flex justify-between px-3 py-1"><span>Discount{bill.discountReason ? ` (${bill.discountReason})` : ""}</span><span>− {rs(bill.discountPaise)}</span></div>
            )}
            {bill.gstRateBp > 0 && !bill.gstInclusive && (
              <>
                <div className="flex justify-between px-3 py-1"><span>Taxable value</span><span>{rs(Math.max(0, bill.subtotalPaise - bill.discountPaise))}</span></div>
                <div className="flex justify-between px-3 py-1"><span>CGST {pct(bill.gstRateBp / 2)}%</span><span>{rs(Math.floor(bill.gstPaise / 2))}</span></div>
                <div className="flex justify-between px-3 py-1"><span>SGST {pct(bill.gstRateBp / 2)}%</span><span>{rs(bill.gstPaise - Math.floor(bill.gstPaise / 2))}</span></div>
              </>
            )}
            <div className="flex justify-between px-3 py-1 font-bold border-t border-zinc-800 text-sm"><span>Total</span><span>{rs(m.netPaise)}</span></div>
            {bill.gstRateBp > 0 && bill.gstInclusive && (
              <div className="px-3 pb-1 text-[11px] text-zinc-500">Includes GST {pct(bill.gstRateBp)}%: CGST {rs(Math.floor(bill.gstPaise / 2))} + SGST {rs(bill.gstPaise - Math.floor(bill.gstPaise / 2))} on {rs(Math.max(0, bill.subtotalPaise - bill.discountPaise) - bill.gstPaise)}</div>
            )}
            {!quote && (
              <>
                <div className="flex justify-between px-3 py-1 border-t border-zinc-300"><span>Received</span><span>{rs(bill.receivedPaise)}</span></div>
                <div className="flex justify-between px-3 py-1 font-semibold"><span>Balance</span><span>{rs(m.balancePaise)}</span></div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// One bill, or both bills of a function on a single sheet with a combined total.
export function CatererInvoice({ party, bills, quote }: { party: InvoiceParty; bills: InvoiceBill[]; quote?: QuoteInfo }) {
  const totals = bills.reduce(
    (a, b) => { const m = billMoney(b); return { net: a.net + m.netPaise, received: a.received + b.receivedPaise, balance: a.balance + m.balancePaise }; },
    { net: 0, received: 0, balance: 0 }
  );

  return (
    <div className="bg-white text-zinc-900 max-w-3xl mx-auto px-5 py-6 space-y-8 font-sans">
      {bills.map((b) => <BillBlock key={b.type} bill={b} party={party} quote={quote} />)}

      {bills.length > 1 && (
        <section className="break-inside-avoid border border-zinc-800 p-4 text-sm space-y-1">
          <div className="text-[11px] font-semibold uppercase text-zinc-500">Combined summary</div>
          {bills.map((b) => (
            <div key={b.type} className="flex justify-between text-xs"><span>{quote ? quote.label : `Invoice ${b.number}`} · {BILL_LABEL[b.type]}</span><span>{rs(billMoney(b).netPaise)}</span></div>
          ))}
          <div className="flex justify-between font-bold border-t border-zinc-300 pt-1"><span>Total</span><span>{rs(totals.net)}</span></div>
          {!quote && (
            <>
              <div className="flex justify-between text-xs"><span>Received</span><span>{rs(totals.received)}</span></div>
              <div className="flex justify-between font-semibold"><span>Balance</span><span>{rs(totals.balance)}</span></div>
            </>
          )}
        </section>
      )}

      <div className="grid grid-cols-2 gap-6 pt-2 text-xs">
        <div className="space-y-2 text-zinc-600">
          {(party.caterer.upiId || party.caterer.bankDetails) && (
            <div>
              <div className="font-semibold uppercase text-[11px] text-zinc-500">Pay to</div>
              {party.caterer.upiId && <div>UPI: <span className="font-semibold text-zinc-900">{party.caterer.upiId}</span></div>}
              {party.caterer.bankDetails && <div className="whitespace-pre-line">{party.caterer.bankDetails}</div>}
            </div>
          )}
          {party.caterer.invoiceNote && <div className="whitespace-pre-line">{party.caterer.invoiceNote}</div>}
          <div className="text-zinc-400">This is a computer-generated {quote ? "quotation" : "invoice"}.</div>
        </div>
        <div className="border border-zinc-800 p-3 text-center">
          <div className="font-semibold text-left mb-8">For {party.caterer.name}:</div>
          Authorized Signatory
        </div>
      </div>
    </div>
  );
}
