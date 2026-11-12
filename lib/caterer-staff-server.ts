import { db } from "@/lib/db";
import { periodRange } from "@/lib/caterer-finance";
import type { PayTypeKey } from "@/lib/caterer-staff";

// Each active person with what they earned this month, what has been paid and what is left to pay.
// A monthly person earns their salary; a daily person earns days worked × day rate.
export async function staffMonth(catererId: string, orgId: string, month: string) {
  const { from, to } = periodRange("month", month);
  const [people, attendance, payments, jobs] = await Promise.all([
    db.employee.findMany({ where: { orgId, isActive: true }, orderBy: { name: "asc" } }),
    db.catererAttendance.findMany({ where: { catererId, date: { gte: from, lte: to } } }),
    db.catererStaffPayment.findMany({ where: { catererId, date: { gte: from, lte: to } } }),
    // functions each person was put on, shown on their page
    db.catererOrderStaff.findMany({ where: { order: { catererId, status: { not: "CANCELLED" }, date: { gte: from, lte: to } } }, select: { employeeId: true, amountPaise: true } }),
  ]);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return people.map((p) => {
    const type: PayTypeKey = p.payType === "DAILY" ? "DAILY" : "MONTHLY";
    const days = attendance.filter((a) => a.employeeId === p.id).reduce((s, a) => s + a.units, 0);
    const myJobs = jobs.filter((j) => j.employeeId === p.id);
    const earned = type === "DAILY" ? Math.round(days * (p.dailyRatePaise ?? 0)) : p.salaryPaise ?? 0;
    const paid = payments.filter((x) => x.employeeId === p.id).reduce((s, x) => s + x.amountPaise, 0);
    const todayUnits = attendance.find((a) => a.employeeId === p.id && a.date.toISOString().slice(0, 10) === today)?.units ?? null;
    return {
      id: p.id, name: p.name, role: p.role, phone: p.phone, payType: type,
      ratePaise: type === "DAILY" ? p.dailyRatePaise ?? 0 : p.salaryPaise ?? 0,
      days, functions: myJobs.length, earnedPaise: earned, paidPaise: paid, toPayPaise: Math.max(0, earned - paid), todayUnits,
    };
  });
}
