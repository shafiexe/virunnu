import PDFDocument from "pdfkit";
import { ROBOTO_BOLD, ROBOTO_REGULAR } from "@/lib/pdf-fonts";

export type VenueInvoiceData = {
  invoiceNo: string; invoiceDate: string; status: string;
  business: string; venueName: string; address: string; gstin: string | null;
  customer: { name: string; phone: string };
  bookingDate: string; slot: string; bookingId: string;
  lines: { label: string; sub: string; basePaise: number }[];
  gst: { on: boolean; rate: number; basePaise: number; cgstPaise: number; sgstPaise: number };
  totalPaise: number;
  // what has been received so far and what is still due, from the booking's payments (0 and the whole total when none)
  receivedPaise: number; dueAfterPaise: number;
};

const money = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

// A real PDF of a convention-centre invoice, laid out like the one on screen. The logo, when there is one, is PNG or JPEG bytes.
export async function renderVenueInvoicePdf(d: VenueInvoiceData, logo?: Buffer | null): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Invoice ${d.invoiceNo} · ${d.business}`, Author: d.business } });
  doc.registerFont("R", Buffer.from(ROBOTO_REGULAR, "base64"));
  doc.registerFont("B", Buffer.from(ROBOTO_BOLD, "base64"));
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res, rej) => { doc.on("end", () => res(Buffer.concat(chunks))); doc.on("error", rej); });

  const L = 48, W = 499, INK = "#18181b", GREY = "#71717a", SOFT = "#e4e4e7";
  const text = (s: string, x: number, y: number, o: { w?: number; size?: number; bold?: boolean; color?: string; align?: "left" | "right" | "center" } = {}) =>
    doc.font(o.bold ? "B" : "R").fontSize(o.size ?? 10).fillColor(o.color ?? INK).text(s, x, y, { width: o.w, align: o.align ?? "left", lineBreak: o.w !== undefined });
  const heightOf = (s: string, w: number, size: number) => doc.font("R").fontSize(size).heightOfString(s, { width: w });
  const rule = (y: number, color = SOFT, width = 0.8) => doc.moveTo(L, y).lineTo(L + W, y).lineWidth(width).strokeColor(color).stroke();

  // header
  let y = 48;
  const tx = L;
  if (logo) { try { doc.image(logo, L, y, { fit: [150, 56] }); y += 62; } catch { /* unreadable picture: skip it */ } }
  text(d.business, tx, y, { w: 300, size: 13, bold: true, color: "#3f3f46" });
  text(d.venueName, tx, y + 17, { w: 300, size: 9, color: GREY });
  text(d.address, tx, y + 29, { w: 300, size: 9, color: GREY });
  if (d.gstin && d.gst.on) text(`GSTIN: ${d.gstin}`, tx, y + 41 + (heightOf(d.address, 300, 9) > 12 ? 10 : 0), { size: 9, bold: true });
  text(d.gst.on ? "TAX INVOICE" : "INVOICE", L + W - 200, 48, { w: 200, size: 17, bold: true, align: "right" });
  text(`No: ${d.invoiceNo}`, L + W - 200, 72, { w: 200, size: 9.5, bold: true, align: "right" });
  text(`Date: ${d.invoiceDate}`, L + W - 200, 86, { w: 200, size: 9.5, color: GREY, align: "right" });
  text(d.status.replace(/_/g, " "), L + W - 200, 101, { w: 200, size: 9, bold: true, color: d.status === "CONFIRMED" ? "#047857" : d.status === "CANCELLED" ? "#b91c1c" : "#b45309", align: "right" });
  y = Math.max(y + 62, 130);
  rule(y); y += 16;

  // bill to / booking details
  text("BILL TO", L, y, { size: 8, bold: true, color: GREY });
  text(d.customer.name, L, y + 12, { w: 230, size: 11, bold: true });
  text(d.customer.phone, L, y + 28, { size: 9.5, color: GREY });
  text("BOOKING DETAILS", L + 270, y, { size: 8, bold: true, color: GREY });
  text(`Date: ${d.bookingDate}`, L + 270, y + 12, { w: 229, size: 9.5 });
  text(`Slot: ${d.slot}`, L + 270, y + 26, { w: 229, size: 9.5 });
  text(`Booking ID: ${d.bookingId}`, L + 270, y + 40, { w: 229, size: 9.5, color: GREY });
  y += 66;

  // lines
  const hsn = d.gst.on;
  const amountX = L + W - 110;
  text("DESCRIPTION", L, y, { size: 8, bold: true, color: GREY });
  if (hsn) text("HSN", amountX - 70, y, { w: 60, size: 8, bold: true, color: GREY, align: "right" });
  text("AMOUNT", amountX, y, { w: 110, size: 8, bold: true, color: GREY, align: "right" });
  y += 14; rule(y, "#d4d4d8", 1.2); y += 8;
  for (const l of d.lines) {
    const h = heightOf(l.label, 300, 10.5) + heightOf(l.sub, 300, 8.5) + 12;
    if (y + h > 740) { doc.addPage(); y = 48; }
    text(l.label, L, y, { w: 300, size: 10.5 });
    text(l.sub, L, y + heightOf(l.label, 300, 10.5) + 1, { w: 300, size: 8.5, color: GREY });
    if (hsn) text("9963", amountX - 70, y, { w: 60, size: 8.5, color: GREY, align: "right" });
    text(money(l.basePaise), amountX, y, { w: 110, size: 10.5, bold: true, align: "right" });
    y += h; rule(y - 4, "#f4f4f5", 0.8);
  }

  // totals
  y += 8;
  if (y + 110 > 760) { doc.addPage(); y = 48; }
  const lx = L + W - 230;
  const row = (label: string, value: string, o: { small?: boolean; strong?: boolean } = {}) => {
    text(label, lx, y, { w: 120, size: o.strong ? 12 : o.small ? 9 : 10, bold: o.strong, color: o.small ? GREY : INK });
    text(value, lx + 120, y, { w: 110, size: o.strong ? 12 : o.small ? 9 : 10, bold: o.strong, color: o.small ? GREY : INK, align: "right" });
    y += o.strong ? 20 : 15;
  };
  if (d.gst.on) {
    row("Subtotal", money(d.gst.basePaise));
    row(`CGST @ ${d.gst.rate}%`, money(d.gst.cgstPaise), { small: true });
    row(`SGST @ ${d.gst.rate}%`, money(d.gst.sgstPaise), { small: true });
  }
  rule(y, "#d4d4d8", 1.2); y += 8;
  row("Total", money(d.totalPaise), { strong: true });
  if (d.receivedPaise > 0) {
    y += 2;
    row("Received", money(d.receivedPaise));
    row("Balance due", d.dueAfterPaise > 0 ? money(d.dueAfterPaise) : "Nil", { strong: true });
  }
  text("All amounts in Indian Rupees (INR)", lx, y, { w: 230, size: 8, color: "#a1a1aa", align: "right" });

  // footer
  const fy = Math.max(y + 60, 700);
  rule(fy - 10);
  text("This is a computer-generated invoice.", L, fy, { size: 8.5, color: "#a1a1aa" });
  text(`Thank you for choosing ${d.venueName}.`, L, fy + 12, { size: 8.5, color: "#a1a1aa" });
  text("For queries: support@virunnu.in", L + W - 220, fy, { w: 220, size: 8.5, color: "#a1a1aa", align: "right" });

  doc.end();
  return done;
}
