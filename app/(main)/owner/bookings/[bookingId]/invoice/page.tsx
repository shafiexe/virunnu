import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { formatRupees, withGST, GST_RATE } from "@/lib/gst";
import { PrintButton } from "@/components/print-button";

type Params = { params: Promise<{ bookingId: string }> };

export default async function InvoicePage({ params }: Params) {
  await connection();
  const { bookingId } = await params;
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { name: true, phone: true } },
      hallSlot: {
        include: {
          template: true,
          hall: {
            include: {
              venue: {
                include: { org: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!booking || booking.hallSlot.hall.venue.orgId !== session.orgId!) notFound();

  const venue = booking.hallSlot.hall.venue;
  const hall = booking.hallSlot.hall;
  const template = booking.hallSlot.template;
  const slot = booking.hallSlot;
  const customer = booking.user ?? { name: booking.guestName, phone: booking.guestPhone ?? "—" };

  // Compute GST breakdown from stored total
  const totalPaise = booking.totalPaise;
  const basePaise = Math.round(totalPaise / (1 + GST_RATE / 100));
  const gstPaise = totalPaise - basePaise;
  const cgstPaise = Math.round(gstPaise / 2);
  const sgstPaise = gstPaise - cgstPaise;

  const invoiceNo = `VIR-${booking.id.slice(-8).toUpperCase()}`;
  const invoiceDate = booking.createdAt.toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
  const bookingDate = new Date(slot.date).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <>
      {/* Print controls — hidden in print */}
      <div className="print:hidden bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Invoice {invoiceNo}</span>
        <div className="flex gap-2">
          <PrintButton />
        </div>
      </div>

      {/* Invoice — printable */}
      <div className="max-w-2xl mx-auto px-6 py-10 print:py-4 print:px-4 font-sans text-zinc-900">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="text-2xl font-bold text-amber-500 mb-0.5">വിരുന്ന്</div>
            <div className="text-sm font-semibold text-zinc-700">{venue.org?.name ?? "Virunnu Technologies"}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{venue.name}</div>
            <div className="text-xs text-zinc-500">{venue.address}, {venue.city}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-zinc-900 uppercase tracking-wide">Invoice</div>
            <div className="text-xs text-zinc-500 mt-1">No: <span className="font-semibold text-zinc-700">{invoiceNo}</span></div>
            <div className="text-xs text-zinc-500">Date: {invoiceDate}</div>
            <div className={`mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
              booking.status === "CONFIRMED"
                ? "bg-emerald-100 text-emerald-700"
                : booking.status === "CANCELLED"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {booking.status}
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Bill To</div>
            <div className="text-sm font-semibold text-zinc-900">{customer.name ?? "Guest"}</div>
            <div className="text-xs text-zinc-500">{customer.phone}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Booking Details</div>
            <div className="text-xs text-zinc-600">
              <div><span className="text-zinc-400">Date:</span> {bookingDate}</div>
              <div><span className="text-zinc-400">Slot:</span> {template.name} ({template.startTime}–{template.endTime})</div>
              <div><span className="text-zinc-400">Booking ID:</span> {booking.id.slice(-10).toUpperCase()}</div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-2 border-collapse">
          <thead>
            <tr className="border-b-2 border-zinc-200">
              <th className="text-left py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Description</th>
              <th className="text-right py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">HSN</th>
              <th className="text-right py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-100">
              <td className="py-3 text-zinc-800">
                Hall rental<br />
                <span className="text-xs text-zinc-400">{bookingDate} · {template.name} ({template.startTime}–{template.endTime})</span>
              </td>
              <td className="py-3 text-right text-zinc-500 text-xs">9963</td>
              <td className="py-3 text-right font-medium">₹{formatRupees(basePaise)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-zinc-600">
            <span>Subtotal</span>
            <span>₹{formatRupees(basePaise)}</span>
          </div>
          <div className="flex justify-between text-zinc-500 text-xs">
            <span>CGST @ {GST_RATE / 2}%</span>
            <span>₹{formatRupees(cgstPaise)}</span>
          </div>
          <div className="flex justify-between text-zinc-500 text-xs">
            <span>SGST @ {GST_RATE / 2}%</span>
            <span>₹{formatRupees(sgstPaise)}</span>
          </div>
          <div className="flex justify-between font-bold text-zinc-900 border-t-2 border-zinc-200 pt-2 mt-1 text-base">
            <span>Total</span>
            <span>₹{formatRupees(totalPaise)}</span>
          </div>
          <div className="text-[10px] text-zinc-400 text-right">All amounts in Indian Rupees (INR)</div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-zinc-200 text-xs text-zinc-400 flex justify-between">
          <div>
            <p>This is a computer-generated invoice.</p>
            <p>Thank you for choosing {venue.name}.</p>
          </div>
          <div className="text-right">
            <p>For queries: support@virunnu.in</p>
            <p>virunnu.in</p>
          </div>
        </div>
      </div>
    </>
  );
}
