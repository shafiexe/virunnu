import { BILL_LABEL, billMoney, formatInvoiceDate, rs, STATE_LABEL, type BillTypeKey } from "@/lib/caterer-orders";

export type StatementRow = {
  number: number; type: BillTypeKey; createdAt: Date; functionDate: Date; cancelled: boolean;
  subtotalPaise: number; discountPaise: number; taxPaise: number; receivedPaise: number;
};

const STATE_STYLE = {
  PAID: "bg-emerald-100 text-emerald-800",
  PARTLY: "bg-amber-100 text-amber-800",
  UNPAID: "bg-red-100 text-red-700",
} as const;

// All invoices for one customer with what is closed and what is still due.
export function CatererStatement({ catererName, catererPhone, customer, rows, logoUrl }: {
  logoUrl?: string | null; catererName: string; catererPhone: string; customer: { name: string; phone: string }; rows: StatementRow[];
}) {
  const live = rows.filter((r) => !r.cancelled);
  const totals = live.reduce(
    (a, r) => { const m = billMoney(r); return { billed: a.billed + m.netPaise, received: a.received + r.receivedPaise, due: a.due + m.balancePaise }; },
    { billed: 0, received: 0, due: 0 }
  );
  const open = live.filter((r) => billMoney(r).balancePaise > 0);
  const closed = live.filter((r) => billMoney(r).balancePaise === 0);

  const table = (list: StatementRow[], title: string) =>
    list.length > 0 && (
      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{title} · {list.length}</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left">Invoice</th>
                <th className="px-3 py-2 text-left">Function</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Received</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map((r) => {
                const m = billMoney(r);
                return (
                  <tr key={r.number}>
                    <td className="px-3 py-2 whitespace-nowrap"><span className="font-semibold">#{r.number}</span><span className="block text-xs text-zinc-500">{BILL_LABEL[r.type]} · {formatInvoiceDate(r.createdAt)}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatInvoiceDate(r.functionDate)}</td>
                    <td className="px-3 py-2 text-right">{rs(m.netPaise)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{rs(r.receivedPaise)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${m.balancePaise > 0 ? "text-red-600" : "text-zinc-400"}`}>{m.balancePaise > 0 ? rs(m.balancePaise) : "—"}</td>
                    <td className="px-3 py-2"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATE_STYLE[m.state]}`}>{STATE_LABEL[m.state]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );

  return (
    <div className="space-y-5 text-zinc-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {logoUrl && <img src={logoUrl} alt="" className="h-14 max-w-[200px] object-contain" />}
      <div>
        <div className="text-xs text-zinc-500">Statement of account</div>
        <h1 className="text-2xl font-bold">{customer.name}</h1>
        <div className="text-sm text-zinc-600">{customer.phone} · from {catererName} ({catererPhone})</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3"><div className="text-[11px] text-zinc-500">Total billed</div><div className="text-lg font-bold">{rs(totals.billed)}</div></div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3"><div className="text-[11px] text-emerald-700">Received</div><div className="text-lg font-bold text-emerald-800">{rs(totals.received)}</div></div>
        <div className={`rounded-xl border p-3 ${totals.due > 0 ? "bg-red-50 border-red-200" : "bg-zinc-50 border-zinc-200"}`}><div className={`text-[11px] ${totals.due > 0 ? "text-red-600" : "text-zinc-500"}`}>Balance due</div><div className={`text-lg font-bold ${totals.due > 0 ? "text-red-700" : ""}`}>{rs(totals.due)}</div></div>
      </div>

      {table(open, "Open invoices (balance due)")}
      {table(closed, "Closed invoices")}
      {live.length === 0 && <p className="text-sm text-zinc-500">No invoices yet.</p>}
    </div>
  );
}
