import PDFDocument from "pdfkit";
import { amountInWords, BILL_LABEL, billMoney, formatInvoiceDate, rs } from "@/lib/caterer-orders";
import { ROBOTO_BOLD, ROBOTO_REGULAR } from "@/lib/pdf-fonts";
import type { InvoiceBill, InvoiceParty, QuoteInfo } from "@/components/caterer-invoice";

// A real PDF of one or two bills, laid out like the invoice on screen.
// The logo, when there is one, is passed in as image bytes (PNG or JPEG).
export async function renderInvoicePdf(party: InvoiceParty, bills: InvoiceBill[], logo?: Buffer | null, quote?: QuoteInfo): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 36, info: { Title: `${quote ? `Quotation ${quote.label}` : `Invoice ${bills.map((b) => b.number).join(", ")}`} · ${party.caterer.name}`, Author: party.caterer.name } });
  doc.registerFont("R", Buffer.from(ROBOTO_REGULAR, "base64"));
  doc.registerFont("B", Buffer.from(ROBOTO_BOLD, "base64"));
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });

  const L = 36, W = 523, BOTTOM = 842 - 48, INK = "#18181b", GREY = "#71717a", LINE = "#27272a", SOFT = "#d4d4d8", HEAD = "#f4f4f5";
  const pct = (n: number) => String(Math.round(n) / 100);
  const qty = (n: number) => String(n);
  const cols = [28, 235, 70, 90, 100];

  const text = (s: string, x: number, y: number, o: { w?: number; size?: number; bold?: boolean; color?: string; align?: "left" | "right" | "center" } = {}) => {
    doc.font(o.bold ? "B" : "R").fontSize(o.size ?? 10).fillColor(o.color ?? INK).text(s, x, y, { width: o.w, align: o.align ?? "left", lineBreak: o.w !== undefined });
  };
  const heightOf = (s: string, w: number, size: number, bold = false) => doc.font(bold ? "B" : "R").fontSize(size).heightOfString(s, { width: w });
  const box = (x: number, y: number, w: number, h: number, fill?: string) => {
    if (fill) doc.rect(x, y, w, h).fill(fill);
    doc.lineWidth(0.7).strokeColor(LINE).rect(x, y, w, h).stroke();
  };

  const drawBill = (bill: InvoiceBill) => {
    const m = billMoney(bill);
    let y = 36;
    text(quote ? "Quotation" : bill.gstRateBp > 0 ? "Tax Invoice" : "Invoice", L, y, { w: W, size: 17, bold: true, align: "center" });
    y += 22;
    text(BILL_LABEL[bill.type], L, y, { w: W, size: 9, color: GREY, align: "center" });
    y += 18;

    // business header
    const c = party.caterer;
    const addr = [c.address, c.city].filter(Boolean).join(", ");
    const headH = 62;
    box(L, y, W, headH);
    let tx = L + 10;
    if (logo) { try { doc.image(logo, L + 8, y + 6, { fit: [50, 50], align: "center", valign: "center" }); tx = L + 68; } catch { /* unreadable picture: skip it */ } }
    text(c.name.toUpperCase(), tx, y + 8, { w: W - (tx - L) - 10, size: 13, bold: true });
    text(`Phone: ${c.phone}${c.gstin && bill.gstRateBp > 0 ? `     GSTIN: ${c.gstin}` : ""}`, tx, y + 27, { w: W - (tx - L) - 10, size: 9 });
    if (addr) text(addr, tx, y + 41, { w: W - (tx - L) - 10, size: 9, color: GREY });
    y += headH;

    // bill to / details
    const half = W / 2, detH = quote?.validUntil ? 76 : 66;
    box(L, y, half, detH); box(L + half, y, half, detH);
    text("BILL TO", L + 10, y + 7, { size: 8, bold: true, color: GREY });
    text(party.customer.name, L + 10, y + 19, { w: half - 20, size: 11, bold: true });
    text(party.customer.phone, L + 10, y + 34, { w: half - 20, size: 9 });
    if (party.customer.address) text(party.customer.address, L + 10, y + 47, { w: half - 20, size: 8.5, color: GREY });
    text(quote ? "QUOTATION DETAILS" : "INVOICE DETAILS", L + half + 10, y + 7, { size: 8, bold: true, color: GREY });
    text(`No: ${quote ? quote.label : bill.number}`, L + half + 10, y + 19, { size: 10, bold: true });
    text(`Date: ${formatInvoiceDate(bill.createdAt)}`, L + half + 10, y + 33, { size: 10 });
    text(`Function: ${formatInvoiceDate(party.functionDate)}${party.place ? ` · ${party.place}` : ""}`, L + half + 10, y + 46, { w: half - 20, size: 8.5, color: GREY });
    if (quote?.validUntil) text(`Valid until: ${formatInvoiceDate(quote.validUntil)}`, L + half + 10, y + 60, { size: 8.5, bold: true });
    y += detH;

    // items
    const header = () => {
      let x = L;
      box(L, y, W, 20, HEAD);
      const labels = ["#", "Item Name", "Quantity", "Price/ Unit (₹)", "Amount (₹)"];
      labels.forEach((lab, i) => {
        text(lab, x + 6, y + 6, { w: cols[i] - 12, size: 8.5, bold: true, align: i > 1 ? "right" : "left" });
        x += cols[i];
      });
      y += 20;
    };
    const money = (p: number) => (p / 100).toLocaleString("en-IN", { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 });
    header();
    bill.lines.forEach((l, i) => {
      const nameH = heightOf(l.name, cols[1] - 12, 9.5, true);
      const rowH = Math.max(20, nameH + 10);
      if (y + rowH > BOTTOM - 20) { doc.addPage(); y = 36; header(); }
      let x = L;
      const cells = [String(i + 1), l.name, `${qty(l.quantity)}${l.unit && l.unit !== "nos" ? ` ${l.unit}` : ""}`, money(l.ratePaise), money(l.amountPaise)];
      cells.forEach((v, k) => {
        doc.lineWidth(0.5).strokeColor(SOFT).rect(x, y, cols[k], rowH).stroke();
        text(v, x + 6, y + 5, { w: cols[k] - 12, size: 9.5, bold: k === 1, align: k > 1 ? "right" : "left" });
        x += cols[k];
      });
      y += rowH;
    });
    // total row
    if (y + 22 > BOTTOM) { doc.addPage(); y = 36; }
    box(L, y, W, 20);
    text("Total", L + cols[0] + 6, y + 6, { size: 9.5, bold: true });
    text(qty(bill.lines.reduce((s, l) => s + l.quantity, 0)), L + cols[0] + cols[1], y + 6, { w: cols[2] - 6, size: 9.5, bold: true, align: "right" });
    text(money(bill.subtotalPaise), L + W - cols[4], y + 6, { w: cols[4] - 6, size: 9.5, bold: true, align: "right" });
    y += 20;

    // totals
    const rows: [string, string, boolean?][] = [["Sub Total", rs(bill.subtotalPaise)]];
    if (bill.discountPaise > 0) rows.push([`Discount${bill.discountReason ? ` (${bill.discountReason})` : ""}`, `− ${rs(bill.discountPaise)}`]);
    if (bill.gstRateBp > 0 && !bill.gstInclusive) {
      const cg = Math.floor(bill.gstPaise / 2);
      rows.push(["Taxable value", rs(Math.max(0, bill.subtotalPaise - bill.discountPaise))], [`CGST ${pct(bill.gstRateBp / 2)}%`, rs(cg)], [`SGST ${pct(bill.gstRateBp / 2)}%`, rs(bill.gstPaise - cg)]);
    }
    rows.push(["Total", rs(m.netPaise), true]);
    if (!quote) rows.push(["Received", rs(bill.receivedPaise)], ["Balance", rs(m.balancePaise), true]);
    const extra = bill.gstRateBp > 0 && bill.gstInclusive
      ? `Includes GST ${pct(bill.gstRateBp)}%: CGST ${rs(Math.floor(bill.gstPaise / 2))} + SGST ${rs(bill.gstPaise - Math.floor(bill.gstPaise / 2))} on ${rs(Math.max(0, bill.subtotalPaise - bill.discountPaise) - bill.gstPaise)}`
      : "";
    const blockH = rows.length * 17 + (extra ? 26 : 0) + 6;
    if (y + blockH > BOTTOM - 130) { doc.addPage(); y = 36; }
    box(L, y, W, blockH);
    doc.moveTo(L + 300, y).lineTo(L + 300, y + blockH).lineWidth(0.7).strokeColor(LINE).stroke();
    text(quote ? "AMOUNT IN WORDS" : "INVOICE AMOUNT IN WORDS", L + 10, y + 8, { size: 8, bold: true, color: GREY });
    text(amountInWords(m.netPaise), L + 10, y + 21, { w: 280, size: 9.5 });
    let ty = y + 5;
    for (const [label, value, strong] of rows) {
      if (strong) doc.moveTo(L + 300, ty - 1).lineTo(L + W, ty - 1).lineWidth(0.5).strokeColor(SOFT).stroke();
      text(label, L + 310, ty + 3, { w: 110, size: strong ? 10 : 9.5, bold: strong });
      text(value, L + 420, ty + 3, { w: W - 430, size: strong ? 10 : 9.5, bold: strong, align: "right" });
      ty += 17;
    }
    if (extra) text(extra, L + 310, ty + 2, { w: W - 320, size: 7.5, color: GREY });
    y += blockH + 14;
    return y;
  };

  const footer = (y: number) => {
    const c = party.caterer;
    if (y + 110 > BOTTOM) { doc.addPage(); y = 36; }
    let ly = y;
    if (c.upiId || c.bankDetails) {
      text("PAY TO", L, ly, { size: 8, bold: true, color: GREY }); ly += 12;
      if (c.upiId) { text(`UPI: ${c.upiId}`, L, ly, { w: 300, size: 9.5, bold: true }); ly += 14; }
      if (c.bankDetails) { text(c.bankDetails, L, ly, { w: 300, size: 9, color: GREY }); ly += heightOf(c.bankDetails, 300, 9) + 6; }
    }
    if (c.invoiceNote) { text(c.invoiceNote, L, ly, { w: 300, size: 9, color: GREY }); ly += heightOf(c.invoiceNote, 300, 9) + 6; }
    text(`This is a computer-generated ${quote ? "quotation" : "invoice"}.`, L, ly, { size: 8, color: "#a1a1aa" });
    box(L + W - 200, y, 200, 80);
    text(`For ${c.name}:`, L + W - 190, y + 8, { w: 180, size: 9.5, bold: true });
    text("Authorized Signatory", L + W - 200, y + 62, { w: 200, size: 9, align: "center" });
  };

  bills.forEach((b, i) => {
    if (i > 0) doc.addPage();
    let y = drawBill(b);
    if (i === bills.length - 1 && bills.length > 1) {
      // combined summary
      const totals = bills.reduce((a, x) => { const mm = billMoney(x); return { net: a.net + mm.netPaise, received: a.received + x.receivedPaise, balance: a.balance + mm.balancePaise }; }, { net: 0, received: 0, balance: 0 });
      const h = 22 + bills.length * 14 + (quote ? 22 : 54);
      if (y + h > BOTTOM - 110) { doc.addPage(); y = 36; }
      box(L, y, W, h);
      text("COMBINED SUMMARY", L + 10, y + 8, { size: 8, bold: true, color: GREY });
      let sy = y + 24;
      for (const x of bills) { text(`${quote ? quote.label : `Invoice ${x.number}`} · ${BILL_LABEL[x.type]}`, L + 10, sy, { size: 9 }); text(rs(billMoney(x).netPaise), L + W - 130, sy, { w: 120, size: 9, align: "right" }); sy += 14; }
      for (const [lab, val, strong] of (quote ? [["Total", totals.net, true]] : [["Total", totals.net, true], ["Received", totals.received, false], ["Balance", totals.balance, true]]) as readonly (readonly [string, number, boolean])[]) {
        text(lab, L + 10, sy + 4, { size: strong ? 10 : 9, bold: strong }); text(rs(val), L + W - 130, sy + 4, { w: 120, size: strong ? 10 : 9, bold: strong, align: "right" }); sy += 16;
      }
      y += h + 14;
    }
    if (i === bills.length - 1) footer(y);
  });

  doc.end();
  return done;
}
