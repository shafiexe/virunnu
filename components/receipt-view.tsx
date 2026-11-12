import { formatRupees } from "@/lib/gst";
import { VirunnuLogo } from "@/components/virunnu-logo";
import type { ReceiptData } from "@/lib/booking-receipt";

// The receipt itself: the same for the owner and for the customer who opens the link.
export function ReceiptView({ r }: { r: NonNullable<ReceiptData> }) {
  return (
    <div className="max-w-xl mx-auto px-5 sm:px-6 py-8 print:py-4 print:px-4 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          {r.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={r.logoUrl} alt="" className="mb-2 h-14 max-w-[200px] object-contain" />
            : <div className="mb-1"><VirunnuLogo fontSize={24} /></div>}
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{r.business}</div>
          <div className="text-xs text-zinc-500">{r.address}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold uppercase tracking-wide">Receipt</div>
          <div className="text-xs text-zinc-500 mt-1">No: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{r.no}</span></div>
          <div className="text-xs text-zinc-500">Date: {r.paidOn}</div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-zinc-200 dark:border-zinc-700 px-5 py-5 mb-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Received from</div>
        <div className="text-base font-semibold">{r.customerName}</div>
        <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Amount</div>
        <div className="text-3xl font-bold">₹{formatRupees(r.amountPaise)}</div>
        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{r.method}{r.note ? ` · ${r.note}` : ""}</div>
      </div>

      <div className="text-xs text-zinc-500 mb-1">Towards the booking of</div>
      <div className="text-sm font-semibold">{r.towardsTitle}</div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">{r.towardsLine}</div>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400"><span>Booking total</span><span>₹{formatRupees(r.netPaise)}</span></div>
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400"><span>Received so far</span><span>₹{formatRupees(r.paidPaise)}</span></div>
        <div className="flex justify-between font-bold border-t-2 border-zinc-200 dark:border-zinc-700 pt-2 mt-1 text-base"><span>Balance due</span><span>{r.balancePaise > 0 ? `₹${formatRupees(r.balancePaise)}` : "Nil"}</span></div>
      </div>

      <div className="mt-12 pt-5 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-400">
        <p>This is a computer-generated receipt. Thank you for choosing {r.thanksName}.</p>
      </div>
    </div>
  );
}
