import { db } from "@/lib/db";

// Make sure the person and function named on a purchase really belong to this team
export async function checkLinks(catererId: string, orgId: string, employeeId?: string, orderId?: string) {
  if (employeeId && !(await db.employee.findFirst({ where: { id: employeeId, orgId }, select: { id: true } }))) return "That person isn't on your team list";
  if (orderId && !(await db.catererOrder.findFirst({ where: { id: orderId, catererId }, select: { id: true } }))) return "That function wasn't found";
  return null;
}
