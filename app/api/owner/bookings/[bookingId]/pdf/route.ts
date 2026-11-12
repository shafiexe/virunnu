import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { splitForVenue } from "@/lib/gst";
import { addonDetail } from "@/lib/addons";
import { renderVenueInvoicePdf, type VenueInvoiceData } from "@/lib/venue-invoice-pdf";

// PDF of a booking's invoice for the convention centre that took it
export async function GET(_req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { bookingId } = await params;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      addons: true, user: { select: { name: true, phone: true } },
      hallSlot: { include: { template: true, hall: { include: { venue: { include: { org: { select: { name: true } } } } } } } },
    },
  });
  if (!booking || booking.hallSlot.hall.venue.orgId !== session.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const venue = booking.hallSlot.hall.venue;
  const template = booking.hallSlot.template;
  const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const bookingDate = day(new Date(booking.hallSlot.date));
  const customer = booking.user ?? { name: booking.guestName, phone: booking.guestPhone ?? "—" };

  // the hall rental and each add-on are separate lines; every line is GST-inclusive, so split each one
  const addonsPaise = booking.addons.reduce((s, a) => s + a.pricePaise, 0);
  const lines = [
    { label: "Hall rental", sub: `${bookingDate} · ${template.name} (${template.startTime}–${template.endTime})`, split: splitForVenue(booking.totalPaise - addonsPaise, venue) },
    ...booking.addons.map((a) => ({ label: a.name, sub: addonDetail(a) ?? "Add-on service", split: splitForVenue(a.pricePaise, venue) })),
  ];
  const on = lines[0].split.enabled;
  const sum = (f: (s: (typeof lines)[number]["split"]) => number) => lines.reduce((s, l) => s + f(l.split), 0);

  const data: VenueInvoiceData = {
    invoiceNo: `VIR-${booking.id.slice(-8).toUpperCase()}`, invoiceDate: day(booking.createdAt), status: booking.status,
    business: venue.org?.name ?? "Virunnu Technologies", venueName: venue.name, address: `${venue.address}, ${venue.city}`, gstin: venue.gstin,
    customer: { name: customer.name ?? "Guest", phone: customer.phone }, bookingDate, slot: `${template.name} (${template.startTime}–${template.endTime})`, bookingId: booking.id.slice(-10).toUpperCase(),
    lines: lines.map((l) => ({ label: l.label, sub: l.sub, basePaise: l.split.basePaise })),
    gst: { on, rate: lines[0].split.rate, basePaise: sum((s) => s.basePaise), cgstPaise: sum((s) => s.cgstPaise), sgstPaise: sum((s) => s.sgstPaise) },
    totalPaise: booking.totalPaise,
  };

  // the logo, when it is a picture a PDF can hold (WebP is converted)
  let logo: Buffer | null = null;
  const stored = await db.orgLogo.findUnique({ where: { orgId: venue.orgId } });
  if (stored) {
    const bytes = Buffer.from(stored.data);
    if (stored.contentType === "image/png" || stored.contentType === "image/jpeg") logo = bytes;
    else { try { const { default: sharp } = await import("sharp"); logo = await sharp(bytes).png().toBuffer(); } catch { logo = null; } }
  }

  const pdf = await renderVenueInvoicePdf(data, logo);
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Invoice-${data.invoiceNo}.pdf"`, "Cache-Control": "private, no-store" } });
}
