import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getCatererForSession } from "@/lib/caterer-session";
import { loadTemplates } from "@/lib/caterer-templates-server";
import { CatererMessageSettings } from "@/components/caterer-message-settings";
import { CatererSummarySettings } from "@/components/caterer-summary-settings";
import { WriteOnly, ReadOnlyShield } from "@/components/access-context";

export default async function MessagesPage() {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const { caterer } = ctx;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 [&>*]:max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Messages</h1>
        <p className="text-sm text-zinc-500 mt-0.5">The WhatsApp wording your buttons write for you, and the summary sent to you each night</p>
      </div>
      <ReadOnlyShield page="messages">
      <CatererMessageSettings initial={await loadTemplates(caterer.orgId)} />
      <CatererSummarySettings initial={{ enabled: caterer.summaryEnabled, via: caterer.summaryVia, email: caterer.summaryEmail ?? caterer.email, phone: caterer.whatsappNumber ?? caterer.phone }} />
      </ReadOnlyShield>
    </div>
  );
}
