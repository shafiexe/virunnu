import type { Instrumentation } from "next";

// Every error the server hits while answering a page or an API call is mailed to ALERT_EMAIL (see lib/alert.ts).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const message = err instanceof Error ? err.message : String(err);
  const { raiseAlert } = await import("@/lib/alert");
  await raiseAlert("Server error", `${request.method} ${request.path}\n${context.routeType} ${context.routePath}\n${message}`);
};
