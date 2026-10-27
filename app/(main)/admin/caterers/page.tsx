import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { AdminCaterersClient } from "@/components/admin-caterers-client";

export default async function AdminCaterersPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const caterers = await db.caterer.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <AdminCaterersClient initialCaterers={caterers} />;
}
