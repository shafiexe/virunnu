import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=in`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Virunnu/1.0 (Kerala hall booking app)",
      "Accept-Language": "en",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) return NextResponse.json({ error: "Geocode failed" }, { status: 502 });

  const data = await res.json();
  if (!data[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
}
