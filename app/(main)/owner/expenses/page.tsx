import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { ExpenseManager } from "@/components/expense-manager";

type Props = { searchParams: Promise<Record<string, string>> };

export default async function ExpensesPage({ searchParams }: Props) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");

  const sp = await searchParams;
  const now = new Date();
  const year = parseInt(sp.year ?? String(now.getFullYear()));
  const month = parseInt(sp.month ?? String(now.getMonth() + 1));

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);

  const expenses = await db.expense.findMany({
    where: { orgId: session.orgId, date: { gte: from, lte: to } },
    include: { employee: { select: { id: true, name: true, role: true } } },
    orderBy: { date: "desc" },
  });

  const totalPaise = expenses.reduce((s, e) => s + e.amountPaise, 0);

  const serialized = expenses.map((e) => ({
    ...e,
    date: e.date.toISOString().slice(0, 10),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Expenses</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Track staff, utilities, and operational costs
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
            {new Date(year, month - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
            ₹{(totalPaise / 100).toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-zinc-400">total this month</div>
        </div>
      </div>
      <ExpenseManager
        key={`${year}-${month}`}
        expenses={serialized}
        year={year}
        month={month}
      />
    </div>
  );
}
