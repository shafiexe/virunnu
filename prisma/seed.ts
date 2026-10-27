import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient, SlotStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function loadDotEnv() {
  const envPath = resolve(".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["'](.*)["']$/, "$1");
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "seed-org-1" },
    update: {},
    create: {
      id: "seed-org-1",
      name: "Skyline Events",
    },
  });

  const venue = await prisma.venue.upsert({
    where: { id: "seed-venue-1" },
    update: {},
    create: {
      id: "seed-venue-1",
      name: "Skyline Grand Hall",
      address: "MG Road",
      city: "Kochi",
      state: "Kerala",
      pincode: "682001",
      lat: 9.9312,
      lng: 76.2673,
      orgId: org.id,
    },
  });

  const hall = await prisma.hall.upsert({
    where: { id: "seed-hall-1" },
    update: {},
    create: {
      id: "seed-hall-1",
      name: "Banquet Hall A",
      capacity: 200,
      pricePerSlot: 500000,
      amenities: ["AC", "Projector", "Catering Kitchen"],
      venueId: venue.id,
    },
  });

  const morning = await prisma.slotTemplate.upsert({
    where: { id: "seed-tmpl-morning" },
    update: {},
    create: {
      id: "seed-tmpl-morning",
      name: "Morning",
      startTime: "09:00",
      endTime: "13:00",
      hallId: hall.id,
    },
  });

  const evening = await prisma.slotTemplate.upsert({
    where: { id: "seed-tmpl-evening" },
    update: {},
    create: {
      id: "seed-tmpl-evening",
      name: "Evening",
      startTime: "16:00",
      endTime: "21:00",
      hallId: hall.id,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    for (const template of [morning, evening]) {
      await prisma.hallSlot.upsert({
        where: {
          hallId_templateId_date: {
            hallId: hall.id,
            templateId: template.id,
            date,
          },
        },
        update: {},
        create: {
          hallId: hall.id,
          templateId: template.id,
          date,
          status: SlotStatus.AVAILABLE,
        },
      });
    }
  }

  // Caterers
  const caterers = [
    {
      id: "seed-caterer-1",
      name: "Royal Feast Catering",
      phone: "+914842345678",
      city: "Kochi",
      description: "Specialising in traditional Kerala sadya and fusion banquet menus for weddings and events.",
      cuisines: ["Kerala Sadya", "North Indian", "Chinese"],
    },
    {
      id: "seed-caterer-2",
      name: "Malabar Kitchen",
      phone: "+914952345679",
      city: "Kozhikode",
      description: "Authentic Malabar cuisine — biriyani, seafood specials, and live counters.",
      cuisines: ["Malabar", "Seafood", "Biriyani"],
    },
    {
      id: "seed-caterer-3",
      name: "Spice Route Events",
      phone: "+914972345680",
      city: "Thrissur",
      description: "Multi-cuisine buffet catering for corporate events, weddings, and receptions.",
      cuisines: ["Kerala", "Continental", "BBQ"],
    },
  ];

  for (const c of caterers) {
    await prisma.caterer.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, state: "Kerala" },
    });
  }

  console.log("Seed complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
