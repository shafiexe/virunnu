import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { Lock } from "lucide-react";
import { getSession } from "@/lib/session";
import { firstAllowedPage } from "@/lib/caterer-access";

export default async function NoAccessPage() {
  await connection();
  const session = await getSession();
  const next = firstAllowedPage(session?.deny);
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500"><Lock className="h-7 w-7" /></span>
      <h1 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">You don&apos;t have access to this page</h1>
      <p className="mt-1 text-sm text-zinc-500">The owner of this account has hidden it from you. Ask them if you need it.</p>
      {next && <Link href={next} className="mt-5 inline-flex rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-sm font-semibold text-zinc-900">Go to what you can open</Link>}
    </div>
  );
}
