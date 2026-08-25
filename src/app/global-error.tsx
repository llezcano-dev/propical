"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. We&apos;ve been notified.</p>
          {error.digest && <p style={{ color: "#888", fontFamily: "monospace" }}>Error ID: {error.digest}</p>}
          <Link href="/" style={{ color: "#5b21b6" }}>Go home</Link>
        </div>
      </body>
    </html>
  );
}
