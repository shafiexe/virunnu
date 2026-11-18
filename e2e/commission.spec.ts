import { expect, test } from "@playwright/test";
import { commissionOf, feeOf, owedOf } from "../lib/commission-math";

// The money rules on their own: nothing here needs the app, the database or Razorpay.
test.describe("online payment money rules", () => {
  test("Virunnu keeps 1% of the whole amount paid, rounded to the paisa", () => {
    expect(commissionOf(5_000_000)).toBe(50_000); // ₹50,000 -> ₹500
    expect(commissionOf(10_000)).toBe(100); // ₹100 -> ₹1
    expect(commissionOf(0)).toBe(0);
    expect(commissionOf(12_345)).toBe(123); // 123.45 -> 123
    expect(commissionOf(12_350)).toBe(124); // 123.5 -> 124
  });

  test("Razorpay's fee is only believed when it is a whole, non-negative number of paise", () => {
    expect(feeOf({ fee: 118_000 })).toBe(118_000);
    expect(feeOf({ fee: 0 })).toBe(0);
    for (const bad of [{}, { fee: null }, { fee: "118000" }, { fee: -5 }, { fee: 1.5 }, { fee: NaN }, null, undefined]) expect(feeOf(bad as never), JSON.stringify(bad)).toBeNull();
  });

  test("the venue is owed what was paid, less Virunnu's 1%, less Razorpay's fee, less what was already sent", () => {
    // ₹50,000 paid online: Razorpay took ₹1,180 (fee and GST), Virunnu keeps ₹500
    const b = { onlinePaise: 5_000_000, commissionPaise: 50_000, gatewayFeePaise: 118_000, paidOutPaise: 0 };
    expect(owedOf(b)).toBe(4_832_000); // ₹48,320
    expect(owedOf({ ...b, paidOutPaise: 4_000_000 })).toBe(832_000);
    // a fee not reported yet counts as nothing, so the amount owed looks higher than it really is: the payouts page says so until the fee arrives
    expect(owedOf({ ...b, gatewayFeePaise: 0 })).toBe(4_950_000);
    expect(owedOf({ onlinePaise: 0, commissionPaise: 0, gatewayFeePaise: 0, paidOutPaise: 0 })).toBe(0);
  });
});
