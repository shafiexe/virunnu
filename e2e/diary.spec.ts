import { expect, test } from "@playwright/test";
import { account, signIn } from "./helpers";
import { cleanDiaryEntries, defaultSlot, rowProblem } from "../lib/diary";

const SLOTS = [
  { id: "t-eve", name: "Evening", startTime: "18:00", endTime: "23:00" },
  { id: "t-morn", name: "Morning", startTime: "07:00", endTime: "12:00" },
];

test.describe("reading the diary", () => {
  test("a page that gives no slot gets Morning, and no year gets this year", () => {
    expect(defaultSlot(SLOTS)?.id).toBe("t-morn");
    expect(defaultSlot([{ id: "a", name: "Full day", startTime: "09:00", endTime: "21:00" }, { id: "b", name: "Night", startTime: "20:00", endTime: "23:00" }])?.id).toBe("a");
    const [e] = cleanDiaryEntries({ entries: [{ day: 14, month: 3, year: null, slotId: null, name: "  Anwar  ", phone: "+91 90000 12345", totalRupees: "₹45,000", advanceRupees: 10000 }] }, SLOTS, "2026-11-20");
    expect(e).toMatchObject({ date: "2026-03-14", yearAssumed: true, templateId: "t-morn", slotAssumed: true, name: "Anwar", phone: "9000012345", totalRupees: 45000, advanceRupees: 10000 });
  });

  test("a named slot is kept, a written year is used, and a two-digit year means 20xx", () => {
    const out = cleanDiaryEntries({ entries: [
      { day: 2, month: 1, year: 2025, slotId: "t-eve", name: "A", totalRupees: 1000 },
      { day: 3, month: 1, year: 26, slotId: "unknown-slot", name: "B", totalRupees: 1000 },
    ] }, SLOTS, "2026-11-20");
    expect(out[0]).toMatchObject({ date: "2025-01-02", yearAssumed: false, templateId: "t-eve", slotAssumed: false });
    expect(out[1]).toMatchObject({ date: "2026-01-03", yearAssumed: false, templateId: "t-morn", slotAssumed: true });
  });

  test("impossible dates are dropped, empty rows are noise, and nothing is guessed", () => {
    const out = cleanDiaryEntries({ entries: [
      { day: 31, month: 2, year: 2026, name: "Feb 31" },
      { day: null, month: null, year: null },
      "not an entry", null,
      { day: 5, month: 6, name: "Joseph", totalRupees: 0, advanceRupees: -5, phone: "12345" },
      { day: 7, month: 8, name: "Over", totalRupees: 1000, advanceRupees: 5000 },
    ] }, SLOTS, "2026-11-20");
    expect(out[0]).toMatchObject({ date: null, name: "Feb 31" });
    expect(out[1]).toMatchObject({ date: "2026-06-05", name: "Joseph", totalRupees: null, advanceRupees: null, phone: null });
    expect(out[2]).toMatchObject({ advanceRupees: 1000 });   // an advance can never be more than the total
    expect(out).toHaveLength(3);
    expect(cleanDiaryEntries(null, SLOTS, "2026-11-20")).toEqual([]);
    expect(cleanDiaryEntries({ entries: "x" }, SLOTS, "2026-11-20")).toEqual([]);
  });

  test("a row needs a date, a slot, a name or phone, and an amount", () => {
    const ok = { date: "2026-03-14", templateId: "t", name: "A", phone: null, totalRupees: 5000, advanceRupees: null };
    expect(rowProblem(ok)).toBeNull();
    expect(rowProblem({ ...ok, name: null, phone: "9000012345" })).toBeNull();
    expect(rowProblem({ ...ok, name: null })).toBe("invalid");
    expect(rowProblem({ ...ok, date: null })).toBe("invalid");
    expect(rowProblem({ ...ok, totalRupees: null })).toBe("invalid");
    expect(rowProblem({ ...ok, advanceRupees: 6000 })).toBe("invalid");
  });
});

test.describe("adding bookings from the diary", () => {
  test.describe.configure({ timeout: 120_000 });
  test("every row is checked first, nothing changes until it is applied, and customers are not messaged", async ({ browser }) => {
    const centre = account().centre;
    const ctx = await browser.newContext();
    await signIn(ctx, centre.phone, centre.password);
    const api = ctx.request;
    const day = (n: number) => new Date(Date.now() + n * 86400_000).toLocaleDateString("en-CA");
    const base = 300 + (Date.now() % 40);
    const d1 = day(base), d2 = day(base + 1), past = day(-400 - (Date.now() % 20));
    const cal = async (d: string) => (await (await api.get(`/api/owner/calendar?venueId=${centre.venueId}&year=${d.slice(0, 4)}&month=${Number(d.slice(5, 7))}`)).json());
    const first = await cal(d1);
    const hall = first.venue.halls[0];
    const [t0, t1] = [hall.slotTemplates[0].id, hall.slotTemplates[1].id];
    const bulk = (apply: boolean, rows: object[], hallId = hall.id) => api.post("/api/owner/bookings/bulk", { data: { venueId: centre.venueId, hallId, apply, rows }, failOnStatusCode: false });

    await api.post("/api/owner/blocked-dates", { data: { hallId: hall.id, date: d2, reason: "diary test" } });
    const rows = [
      { date: d1, templateId: t0, name: "Diary Anwar", phone: "9000000771", totalRupees: 50000, advanceRupees: 10000 },
      { date: d1, templateId: t1, name: "Diary No Phone", totalRupees: 30000 },
      { date: d1, templateId: t0, name: "Diary Twin", totalRupees: 20000 },                 // same date and slot as the first row
      { date: d2, templateId: t0, name: "Diary Blocked", totalRupees: 20000 },              // that date is blocked
      { date: past, templateId: t0, name: "Diary Old", phone: "9000000772", totalRupees: 40000, advanceRupees: 40000 }, // an old record is allowed
      { date: d1, templateId: t1, totalRupees: 20000 },                                     // no name or phone
    ];

    // checking changes nothing
    const dry = await (await bulk(false, rows)).json();
    expect(dry.checks).toEqual(["ok", "ok", "duplicate", "blocked", "ok", "invalid"]);
    expect(dry.added).toBe(0);
    expect(JSON.stringify(await cal(d1))).not.toContain("Diary");

    // applying adds only the rows that were fine
    const done = await (await bulk(true, rows)).json();
    expect(done.added).toBe(3);
    const after = JSON.stringify(await cal(d1));
    expect(after).toContain("Diary Anwar");
    expect(after).toContain("Diary No Phone");
    expect(after).not.toContain("Diary Twin");
    expect(JSON.stringify(await cal(past))).toContain("Diary Old");

    // the advance is recorded as a payment, and the booking without a phone keeps its name
    const list = await (await api.get(`/api/owner/bookings?search=Diary&pageSize=100`)).json();
    const byName = (n: string) => list.data.find((b: { user?: { name?: string }; guestName?: string }) => (b.user?.name ?? b.guestName) === n);
    expect(byName("Diary Anwar")).toMatchObject({ status: "ADVANCE_PAID", totalPaise: 5000000, advancePaise: 1000000 });
    expect(byName("Diary No Phone")).toMatchObject({ status: "CONFIRMED", guestName: "Diary No Phone", userId: null });
    expect(byName("Diary Old")).toMatchObject({ status: "CONFIRMED" });

    // running it again can never double-book
    const again = await (await bulk(true, rows)).json();
    expect(again.added).toBe(0);
    expect(again.checks[0]).toBe("booked");

    // another hall's id, a made-up one, or too many rows are refused
    expect((await bulk(false, rows, "cmzzzzzzzzzzzzzzzzzzzzzzz")).status()).toBe(404);
    expect((await bulk(false, [])).status()).toBe(400);
    expect((await bulk(false, rows.map((r) => ({ ...r, totalRupees: -1 })))).status()).toBe(400);
    await ctx.close();
  });
});
