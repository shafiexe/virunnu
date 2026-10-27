import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { CatererOnboardingForm } from "@/components/caterer-onboarding-form";

export default async function CatererOnboardingPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CATERER") redirect("/");

  const hasProfile = session.orgId
    ? !!(await db.caterer.findFirst({ where: { orgId: session.orgId } }))
    : false;

  if (hasProfile) redirect("/caterer/dashboard");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">List your catering service</h1>
          <p className="mt-2 text-zinc-500 text-sm">Set up your profile to get discovered by event planners.</p>
        </div>
        <CatererOnboardingForm />
      </div>
    </div>
  );
}
