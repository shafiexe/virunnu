import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { OwnerOnboardingForm } from "@/components/owner-onboarding-form";

export default async function OwnerOnboardingPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  // Non-owners who have never onboarded get the full flow
  // Existing owners can reach this page via "Add venue" to add another
  if (!session.orgId) {
    // no org yet — show full onboarding
  } else if (session.role !== "OWNER") {
    redirect("/owner/dashboard");
  }

  const isAddingAnother = session.role === "OWNER" && !!session.orgId;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {isAddingAnother ? "Add a new venue" : "List your convention center"}
          </h1>
          <p className="mt-2 text-zinc-500 text-sm">
            {isAddingAnother
              ? "Add another venue to your account."
              : "Set up your venue in a few minutes and start accepting bookings."}
          </p>
        </div>
        <OwnerOnboardingForm />
      </div>
    </div>
  );
}
