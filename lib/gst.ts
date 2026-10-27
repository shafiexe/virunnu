// GST rate for convention hall / banquet services (India)
// HSN 9963 — 18% GST for tariffs above ₹7,500/day (CGST 9% + SGST 9%)
export const GST_RATE = 18;

// Owner enters price INCLUSIVE of GST. Split out the components.
// totalPaise = basePaise + gstPaise, where gst = base × rate/100
// → basePaise = totalPaise × 100 / (100 + rate)
export function splitGST(inclusivePaise: number, rate = GST_RATE) {
  const basePaise = Math.round(inclusivePaise * 100 / (100 + rate));
  const gstPaise = inclusivePaise - basePaise;
  return {
    basePaise,
    gstPaise,
    totalPaise: inclusivePaise,
    cgstPaise: Math.round(gstPaise / 2),
    sgstPaise: Math.ceil(gstPaise / 2),
    rate,
  };
}

// Keep for any legacy callers — but owner price is now GST-inclusive so prefer splitGST
export function withGST(basePaise: number, rate = GST_RATE) {
  return splitGST(basePaise, rate);
}

export function formatRupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}
