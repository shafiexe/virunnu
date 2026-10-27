import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { WorkflowTemplates } from "@/components/workflow-templates";

export default async function WorkflowsPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Templates</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Message templates for SMS and WhatsApp communications</p>
      </div>
      <WorkflowTemplates />
    </div>
  );
}
