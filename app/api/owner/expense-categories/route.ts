import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().max(8).optional(),
});

// Default categories seeded for every new org (mirrors original expense enum)
const DEFAULTS = [
  { name: "Manager",           icon: "👨‍💼", sortOrder: 0  },
  { name: "Supervisor",        icon: "👤",  sortOrder: 1  },
  { name: "Cleaning Staff",    icon: "🧹",  sortOrder: 2  },
  { name: "Security Staff",    icon: "🔒",  sortOrder: 3  },
  { name: "Kitchen Staff",     icon: "🍳",  sortOrder: 4  },
  { name: "Event Coordinator", icon: "🎪",  sortOrder: 5  },
  { name: "Parking Attendant", icon: "🚗",  sortOrder: 6  },
  { name: "Maintenance Staff", icon: "🔧",  sortOrder: 7  },
  { name: "Electricity",       icon: "⚡",  sortOrder: 8  },
  { name: "Water",             icon: "💧",  sortOrder: 9  },
  { name: "Internet",          icon: "🌐",  sortOrder: 10 },
  { name: "Generator Fuel",    icon: "⛽",  sortOrder: 11 },
  { name: "Waste Management",  icon: "🗑️",  sortOrder: 12 },
  { name: "Cleaning Supplies", icon: "🧴",  sortOrder: 13 },
  { name: "Equipment Repair",  icon: "🔨",  sortOrder: 14 },
  { name: "Pest Control",      icon: "🐛",  sortOrder: 15 },
  { name: "Advertising",       icon: "📢",  sortOrder: 16 },
  { name: "Platform Fee",      icon: "💻",  sortOrder: 17 },
  { name: "Insurance",         icon: "🛡️",  sortOrder: 18 },
  { name: "License & Permit",  icon: "📜",  sortOrder: 19 },
  { name: "Office Supplies",   icon: "📎",  sortOrder: 20 },
  { name: "Refreshments",      icon: "🍽️",  sortOrder: 21 },
  { name: "Other",             icon: "📌",  sortOrder: 22 },
] as const;

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Always ensure all defaults exist — skipDuplicates makes this a safe no-op
  // for categories already present, and only inserts genuinely missing ones.
  await db.expenseCategory.createMany({
    data: DEFAULTS.map((d) => ({ ...d, orgId: session.orgId! })),
    skipDuplicates: true,
  });

  const categories = await db.expenseCategory.findMany({
    where: { orgId: session.orgId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, icon } = parsed.data;

  const existing = await db.expenseCategory.findFirst({ where: { orgId: session.orgId, name } });
  if (existing) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }

  const total = await db.expenseCategory.count({ where: { orgId: session.orgId } });

  const category = await db.expenseCategory.create({
    data: { orgId: session.orgId, name, icon: icon ?? "📌", sortOrder: total },
    include: { items: true },
  });

  return NextResponse.json({ category }, { status: 201 });
}
