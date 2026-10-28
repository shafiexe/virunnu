import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const DEFAULT_FACILITIES = [
  // Venue & Infrastructure
  { name: "Air Conditioning", description: "Full hall AC coverage for all guests", amountPaise: 500000, category: "VENUE", icon: "❄️", sortOrder: 0 },
  { name: "Stage Setup", description: "Elevated stage with skirting and backdrop", amountPaise: 1500000, category: "VENUE", icon: "🎭", sortOrder: 1 },
  { name: "Podium & Lectern", description: "Speaker podium with microphone stand", amountPaise: 200000, category: "VENUE", icon: "🎤", sortOrder: 2 },
  { name: "Generator Backup", description: "100% power backup during the event", amountPaise: 500000, category: "VENUE", icon: "⚡", sortOrder: 3 },
  // Audio / Visual
  { name: "Sound System", description: "Professional PA with subwoofers", amountPaise: 1000000, category: "AV", icon: "🔊", sortOrder: 10 },
  { name: "Projector & Screen", description: "HD projector with 16-ft screen", amountPaise: 800000, category: "AV", icon: "📽️", sortOrder: 11 },
  { name: "LED Backdrop", description: "Full LED video wall for stage backdrop", amountPaise: 2000000, category: "AV", icon: "📺", sortOrder: 12 },
  { name: "Wireless Microphones", description: "4 wireless handheld/lapel mics", amountPaise: 300000, category: "AV", icon: "🎙️", sortOrder: 13 },
  { name: "Live Streaming", description: "Multi-camera online broadcast", amountPaise: 2500000, category: "AV", icon: "📡", sortOrder: 14 },
  // Decoration
  { name: "Flower Decoration", description: "Premium fresh flower stage & table arrangements", amountPaise: 2000000, category: "DECORATION", icon: "💐", sortOrder: 20 },
  { name: "Balloon Decoration", description: "Themed balloon arch and centrepieces", amountPaise: 800000, category: "DECORATION", icon: "🎈", sortOrder: 21 },
  { name: "Lighting & Ambience", description: "Mood and effect lighting setup", amountPaise: 1500000, category: "DECORATION", icon: "💡", sortOrder: 22 },
  { name: "Table Linen & Skirting", description: "Elegant linen for all tables", amountPaise: 500000, category: "DECORATION", icon: "🪑", sortOrder: 23 },
  // Photography & Media
  { name: "Photography Package", description: "Professional event photographer (8 hrs)", amountPaise: 3000000, category: "MEDIA", icon: "📷", sortOrder: 30 },
  { name: "Videography Package", description: "Cinematic video coverage (8 hrs)", amountPaise: 4000000, category: "MEDIA", icon: "🎬", sortOrder: 31 },
  { name: "Drone Coverage", description: "Aerial photography and video", amountPaise: 1500000, category: "MEDIA", icon: "🚁", sortOrder: 32 },
  // Parking & Transport
  { name: "Parking Area", description: "Dedicated parking for 200+ vehicles", amountPaise: 0, category: "PARKING", icon: "🅿️", sortOrder: 40 },
  { name: "Valet Parking", description: "Attendant-managed valet service", amountPaise: 500000, category: "PARKING", icon: "🚗", sortOrder: 41 },
  // Services & Support
  { name: "Security Staff", description: "Trained security personnel throughout", amountPaise: 1000000, category: "SERVICES", icon: "💂", sortOrder: 50 },
  { name: "Housekeeping Team", description: "Dedicated cleaning & maintenance crew", amountPaise: 300000, category: "SERVICES", icon: "🧹", sortOrder: 51 },
  { name: "WiFi Access", description: "High-speed internet for guests", amountPaise: 300000, category: "SERVICES", icon: "📶", sortOrder: 52 },
  { name: "First Aid Station", description: "Qualified first-aid personnel on site", amountPaise: 200000, category: "SERVICES", icon: "🩺", sortOrder: 53 },
];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let orgId: string;
  if (session.role === "ADMIN") {
    const body = await req.json().catch(() => null);
    if (!body?.orgId) return NextResponse.json({ error: "orgId required in body for ADMIN" }, { status: 400 });
    orgId = body.orgId as string;
  } else {
    orgId = session.orgId!;
  }

  const existing = await db.facility.count({ where: { orgId } });
  if (existing > 0) return NextResponse.json({ error: "Facilities already exist" }, { status: 409 });

  await db.facility.createMany({
    data: DEFAULT_FACILITIES.map((f) => ({
      ...f,
      orgId,
      isCustom: false,
    })),
  });

  return NextResponse.json({ ok: true, count: DEFAULT_FACILITIES.length });
}
