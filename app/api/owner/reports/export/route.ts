import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { monthReport, parseMonth } from "@/lib/owner-month-report";
import { logActivity } from "@/lib/activity";

const rupees = (paise: number) => paise / 100;
const MONEY = "#,##0.00";

// The month's figures as an Excel workbook for the accountant: one sheet each for the summary, sales, money received,
// expenses and the year. Money is stored as numbers (rupees), so the accountant can add and filter it.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const r = await monthReport(session.orgId, parseMonth(req.nextUrl.searchParams.get("month") ?? undefined).key);
  const org = await db.organization.findUnique({ where: { id: session.orgId }, select: { name: true } });
  const { period: p, summary: s } = r;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Virunnu";
  wb.created = new Date();

  const sheet = (name: string, columns: { header: string; key: string; width: number; money?: boolean; date?: boolean }[], rows: Record<string, unknown>[], totals?: Record<string, unknown>) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width, style: c.money ? { numFmt: MONEY } : c.date ? { numFmt: "dd-mmm-yyyy" } : {} }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F5" } };
    rows.forEach((row) => ws.addRow(row));
    if (totals) { const t = ws.addRow(totals); t.font = { bold: true }; t.border = { top: { style: "thin" } }; }
    return ws;
  };

  // Summary
  const sum = wb.addWorksheet("Summary");
  sum.columns = [{ width: 42 }, { width: 20 }];
  sum.addRow([`${org?.name ?? "Convention centre"}: ${p.label}`]).font = { bold: true, size: 14 };
  sum.addRow([]);
  const lines: [string, number | string, boolean?][] = [
    ["Bookings for events this month", s.count],
    ["Billed, after discount (including GST)", rupees(s.billedPaise), true],
    ["  of which before GST", rupees(s.basePaise), true],
    ["  of which CGST", rupees(s.cgstPaise), true],
    ["  of which SGST", rupees(s.sgstPaise), true],
    ["Discounts given", rupees(s.discountPaise), true],
    ["Balance still to collect on these bookings", rupees(s.balancePaise), true],
    ["", ""],
    ["Payments received this month", rupees(s.receivedPaise + s.refundsPaise), true],
    ["Refunds given", rupees(s.refundsPaise), true],
    ["Received, after refunds", rupees(s.receivedPaise), true],
    ["Expenses", rupees(s.expensesPaise), true],
    ["", ""],
    ["Profit: received less expenses", rupees(s.profitCashPaise), true],
    ["Profit: billed before GST less expenses", rupees(s.basePaise - s.expensesPaise), true],
  ];
  for (const [label, value, money] of lines) { const row = sum.addRow([label, value]); if (money) row.getCell(2).numFmt = MONEY; }
  sum.addRow([]);
  const note = sum.addRow(["Billed is for events held in the month. Received and expenses are by the date they were recorded."]);
  note.font = { italic: true, color: { argb: "FF71717A" } };
  // the lines that matter most: billed, received after refunds, expenses and the first profit line
  for (const n of [4, 13, 14, 16]) sum.getRow(n).font = { bold: true };

  // Sales
  const gst = r.gstOn;
  sheet("Sales", [
    { header: "Event date", key: "date", width: 13, date: true }, { header: "Booking", key: "ref", width: 14 }, { header: "Customer", key: "customer", width: 26 }, { header: "Hall", key: "hall", width: 20 }, { header: "Slot", key: "slot", width: 14 }, { header: "Status", key: "status", width: 13 },
    { header: "Total", key: "gross", width: 14, money: true }, { header: "Discount", key: "discount", width: 12, money: true }, { header: "Billed", key: "net", width: 14, money: true },
    ...(gst ? [{ header: "Before GST", key: "base", width: 14, money: true }, { header: "CGST", key: "cgst", width: 12, money: true }, { header: "SGST", key: "sgst", width: 12, money: true }] : []),
    { header: "Received", key: "received", width: 14, money: true }, { header: "Balance", key: "balance", width: 14, money: true },
  ], r.sales.map((x) => ({ date: new Date(x.eventDate + "T00:00:00Z"), ref: x.ref, customer: x.customer, hall: x.hall, slot: x.slot, status: x.status, gross: rupees(x.grossPaise), discount: rupees(x.discountPaise), net: rupees(x.netPaise), base: rupees(x.basePaise), cgst: rupees(x.cgstPaise), sgst: rupees(x.sgstPaise), received: rupees(x.receivedPaise), balance: rupees(x.balancePaise) })),
  { customer: "Total", gross: rupees(r.sales.reduce((t, x) => t + x.grossPaise, 0)), discount: rupees(s.discountPaise), net: rupees(s.billedPaise), base: rupees(s.basePaise), cgst: rupees(s.cgstPaise), sgst: rupees(s.sgstPaise), received: rupees(r.sales.reduce((t, x) => t + x.receivedPaise, 0)), balance: rupees(s.balancePaise) });

  // Receipts
  sheet("Money received", [
    { header: "Date", key: "date", width: 13, date: true }, { header: "Customer", key: "customer", width: 26 }, { header: "Booking", key: "ref", width: 14 }, { header: "Mode", key: "method", width: 16 }, { header: "Note", key: "note", width: 36 }, { header: "Amount", key: "amount", width: 14, money: true },
  ], r.receipts.map((x) => ({ date: new Date(x.date + "T00:00:00Z"), customer: x.customer, ref: x.ref, method: x.method, note: x.note ?? "", amount: rupees(x.amountPaise) })),
  { customer: "Total", amount: rupees(r.receipts.reduce((t, x) => t + x.amountPaise, 0)) });

  // Expenses
  sheet("Expenses", [
    { header: "Date", key: "date", width: 13, date: true }, { header: "Category", key: "category", width: 22 }, { header: "Name", key: "label", width: 32 }, { header: "Notes", key: "notes", width: 36 }, { header: "Amount", key: "amount", width: 14, money: true },
  ], r.expenses.map((x) => ({ date: new Date(x.date + "T00:00:00Z"), category: x.category, label: x.label, notes: x.notes ?? "", amount: rupees(x.amountPaise) })),
  { label: "Total", amount: rupees(s.expensesPaise) });

  // The year
  sheet(`Year ${p.year}`, [
    { header: "Month", key: "month", width: 12 }, { header: "Billed", key: "billed", width: 16, money: true }, { header: "Before GST", key: "base", width: 16, money: true }, { header: "GST", key: "gst", width: 14, money: true },
    { header: "Received", key: "received", width: 16, money: true }, { header: "Expenses", key: "expenses", width: 16, money: true }, { header: "Profit", key: "profit", width: 16, money: true },
  ], r.year.map((y) => ({ month: y.label, billed: rupees(y.billedPaise), base: rupees(y.basePaise), gst: rupees(y.gstPaise), received: rupees(y.receivedPaise), expenses: rupees(y.expensesPaise), profit: rupees(y.profitPaise) })),
  { month: "Year", billed: rupees(r.year.reduce((t, y) => t + y.billedPaise, 0)), base: rupees(r.year.reduce((t, y) => t + y.basePaise, 0)), gst: rupees(r.year.reduce((t, y) => t + y.gstPaise, 0)), received: rupees(r.year.reduce((t, y) => t + y.receivedPaise, 0)), expenses: rupees(r.year.reduce((t, y) => t + y.expensesPaise, 0)), profit: rupees(r.year.reduce((t, y) => t + y.profitPaise, 0)) });

  const buffer = await wb.xlsx.writeBuffer();
  await logActivity(session, `Downloaded the ${p.label} report`);
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Virunnu-report-${p.key}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
