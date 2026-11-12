"use client";

import { ErrorScreen } from "@/components/error-screen";

// Used only when the page frame itself breaks, so it carries its own <html>.
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <ErrorScreen {...props} />
      </body>
    </html>
  );
}
