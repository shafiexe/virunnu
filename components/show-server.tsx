import { getSession } from "@/lib/session";

// Server-side version of <Show>: when the owner hid this from the person, the content is not built at all,
// so it is not in the page they receive. Use it on server pages; the client version only hides what is already sent.
export async function ShowS({ what, children, fallback = null }: { what: "phones" | "profit" | "salaries"; children: React.ReactNode; fallback?: React.ReactNode }) {
  const session = await getSession();
  return session?.deny?.includes(`hide.${what}`) ? <>{fallback}</> : <>{children}</>;
}

export const hidesFor = (deny: readonly string[] | undefined, what: "phones" | "profit" | "salaries") => !!deny?.includes(`hide.${what}`);
