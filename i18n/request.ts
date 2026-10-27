import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("NEXT_LOCALE")?.value ?? "ml";
  const locale = raw === "en" ? "en" : "ml";
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
