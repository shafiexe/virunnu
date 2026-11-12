// GST on a catering bill. Rates are in hundredths of a percent (500 = 5%, 250 = 2.5%).
// Prices either already include GST (the invoice just shows the part that is GST) or GST is added on top of the total.

export type GstSnapshot = { gstRateBp: number; gstInclusive: boolean };

export function computeGst(subtotalPaise: number, discountPaise: number, snap: GstSnapshot) {
  const payable = Math.max(0, subtotalPaise - discountPaise);
  if (snap.gstRateBp <= 0) return { gstPaise: 0, taxPaise: 0, taxablePaise: payable };
  if (snap.gstInclusive) {
    const gstPaise = payable - Math.round((payable * 10000) / (10000 + snap.gstRateBp));
    return { gstPaise, taxPaise: 0, taxablePaise: payable - gstPaise };
  }
  const gstPaise = Math.round((payable * snap.gstRateBp) / 10000);
  return { gstPaise, taxPaise: gstPaise, taxablePaise: payable };
}

// What a new bill of this kind gets from the caterer's GST settings
export function gstFor(caterer: { gstEnabled: boolean; foodGstBp: number; serviceGstBp: number; gstInclusive: boolean }, type: "FOOD" | "SERVICE"): GstSnapshot {
  return { gstRateBp: caterer.gstEnabled ? (type === "FOOD" ? caterer.foodGstBp : caterer.serviceGstBp) : 0, gstInclusive: caterer.gstInclusive };
}

export const bpToPercent = (bp: number) => bp / 100;
export const percentToBp = (pct: number) => Math.round(pct * 100);
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
