import crypto from "crypto";
import { expect, test } from "@playwright/test";
import { checkOnlineAmount, signatureMatches } from "../lib/online-amount";
import { account, signIn } from "./helpers";

const TOTAL = 11_800_000; // ₹1,18,000 (a hall of ₹1,00,000 plus GST)
const rule = { totalPaise: TOTAL, minimumAdvancePaise: 5_000_000, requireFullPayment: false };

test.describe("online payment rules", () => {
  test("only an advance the venue allows, or the exact full amount, is accepted", () => {
    expect(checkOnlineAmount({ ...rule, isFullPayment: true, amountPaise: TOTAL })).toBeNull();
    expect(checkOnlineAmount({ ...rule, isFullPayment: false, amountPaise: 5_000_000 })).toBeNull();
    expect(checkOnlineAmount({ ...rule, isFullPayment: false, amountPaise: TOTAL - 100 })).toBeNull();
    // ₹1 "full payment", or a part payment called full
    expect(checkOnlineAmount({ ...rule, isFullPayment: true, amountPaise: 100 })).toMatch(/full payment is/i);
    expect(checkOnlineAmount({ ...rule, isFullPayment: true, amountPaise: 5_000_000 })).toMatch(/full payment is/i);
    // below the venue's minimum advance, or a token amount
    expect(checkOnlineAmount({ ...rule, isFullPayment: false, amountPaise: 4_999_999 })).toMatch(/at least/i);
    expect(checkOnlineAmount({ ...rule, minimumAdvancePaise: 0, isFullPayment: false, amountPaise: 100 })).toMatch(/at least/i);
    // an "advance" that is the whole amount, and a hall that needs full payment
    expect(checkOnlineAmount({ ...rule, isFullPayment: false, amountPaise: TOTAL })).toMatch(/use full payment/i);
    expect(checkOnlineAmount({ ...rule, requireFullPayment: true, isFullPayment: false, amountPaise: 5_000_000 })).toMatch(/needs the full payment/i);
  });

  test("a payment signature is checked exactly", () => {
    const sig = crypto.createHmac("sha256", "secret").update("order_1|pay_1").digest("hex");
    expect(signatureMatches("secret", "order_1", "pay_1", sig)).toBe(true);
    expect(signatureMatches("secret", "order_1", "pay_2", sig)).toBe(false);
    expect(signatureMatches("other", "order_1", "pay_1", sig)).toBe(false);
    expect(signatureMatches("secret", "order_1", "pay_1", "")).toBe(false);
    expect(signatureMatches("secret", "order_1", "pay_1", sig.slice(0, -2))).toBe(false);
    // the old fallback secret must not make a forged signature pass
    const forged = crypto.createHmac("sha256", "placeholder").update("order_1|pay_1").digest("hex");
    expect(signatureMatches("real-secret", "order_1", "pay_1", forged)).toBe(false);
  });

  test("the server refuses a cheap or mislabelled payment, and a taken date", async ({ page }) => {
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    const api = page.context().request;
    const event = new Date(Date.now() + 75 * 86400_000);
    const date = event.toLocaleDateString("en-CA");
    const cal = await (await api.get(`/api/owner/calendar?venueId=${centre.venueId}&year=${event.getFullYear()}&month=${event.getMonth() + 1}`)).json();
    const hall = cal.venue.halls[0];
    const slot = `virtual_${hall.slotTemplates[0].id}_${date}`;
    const guest = { guestName: "Cheap Booker", guestPhone: "9000000990" };

    // ₹1 as the "full payment" of a ₹1,18,000 hall
    const cheap = await api.post("/api/payments/create-order", { data: { hallSlotId: slot, amountPaise: 100, isFullPayment: true, ...guest } });
    expect(cheap.status()).toBe(400);
    expect((await cheap.json()).error).toMatch(/full payment is/i);
    // a token "advance"
    const token = await api.post("/api/payments/create-order", { data: { hallSlotId: slot, amountPaise: 100, isFullPayment: false, ...guest } });
    expect(token.status()).toBe(400);
    expect((await token.json()).error).toMatch(/at least/i);

    // a proper advance passes our rules and goes on to the gateway (which, with no live keys here, answers with its own error)
    const proper = await api.post("/api/payments/create-order", { data: { hallSlotId: slot, amountPaise: 5_000_000, isFullPayment: false, ...guest } });
    expect([200, 502]).toContain(proper.status());

    // and nothing can be confirmed for that amount either, whatever signature is sent
    const sneaky = await api.post("/api/bookings/confirm-payment", { data: { hallSlotId: slot, ...guest, razorpayOrderId: "order_x", razorpayPaymentId: "pay_x", razorpaySignature: "x", amountPaise: 100, isFullPayment: true } });
    expect([400, 502, 503]).toContain(sneaky.status());
    const after = await (await api.get(`/api/owner/calendar?venueId=${centre.venueId}&year=${event.getFullYear()}&month=${event.getMonth() + 1}`)).json();
    expect(JSON.stringify(after.slots ?? [])).not.toContain("Cheap Booker");

    // a date that is already booked is refused before any money is asked for
    const made = await api.post("/api/owner/bookings", { data: { venueId: centre.venueId, hallId: hall.id, templateId: hall.slotTemplates[1].id, date, customerPhone: "9000000991", customerName: "Taken Date", amountRupees: 100000, advanceRupees: 50000 } });
    expect(made.status()).toBe(201);
    const taken = await api.post("/api/payments/create-order", { data: { hallSlotId: `virtual_${hall.slotTemplates[1].id}_${date}`, amountPaise: 5_000_000, isFullPayment: false, ...guest } });
    expect(taken.status()).toBe(409);
  });
});
