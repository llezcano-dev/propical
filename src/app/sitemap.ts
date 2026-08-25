import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, SITE_URL } from "@/lib/i18n/alternates";
import type { Locale } from "@/lib/i18n/translations";

// Force per-request rendering. ISR (revalidate=N) wasn't enough — the
// build still pre-renders sitemap() once on the GH Actions runner where
// there's no DB, ships an empty snapshot, and serves that for the first
// `revalidate` window. force-dynamic skips the build-time render
// entirely, so /sitemap.xml is always generated at request time against
// the live DB. Crawl traffic on a sitemap is a few hits per day —
// running one Prisma query each is fine.
export const dynamic = "force-dynamic";

// Build a per-locale URL for a given default-locale path. The site is
// cookie-localised (no per-locale URL prefixes), so every locale shares
// the same URL — this just returns the bare path.
function localizedUrl(defaultPath: string, _locale: Locale): string {
  return `${SITE_URL}${defaultPath}`;
}

// Build the alternates.languages map for a given default-locale path.
// With a single shared URL per page, we emit only `x-default` — declaring
// multiple locales against one URL would be a duplicate-content signal.
function altLanguages(defaultPath: string): Record<string, string> {
  return { "x-default": localizedUrl(defaultPath, DEFAULT_LOCALE) };
}

/**
 * Sitemap. Per-locale entries for every public marketing page. Each entry
 * carries `alternates.languages` — Next.js renders these as
 * `<xhtml:link rel="alternate" hreflang="…">`.
 */
// Deploy-time constant for static-page lastmod. Using `new Date()` per
// request told Google "everything changed every crawl," which Google
// down-weights as a noisy signal and falls back to its own heuristics.
// The deploy SHA is set during the build step (NEXT_PUBLIC_GIT_COMMIT_SHA);
// we hash it into a Date pinned to the deploy. When the deploy SHA
// doesn't change, lastmod doesn't change. When you push a new build,
// every static lastmod jumps forward together.
const DEPLOY_LASTMOD_SOURCE =
  process.env.VERCEL_GIT_COMMIT_DATE ||
  process.env.NEXT_PUBLIC_GIT_COMMIT_DATE ||
  process.env.SOURCE_DATE_EPOCH ||
  "";
const STATIC_LASTMOD = (() => {
  if (DEPLOY_LASTMOD_SOURCE) {
    const ts = Number(DEPLOY_LASTMOD_SOURCE);
    if (Number.isFinite(ts) && ts > 0) return new Date(ts * 1000);
    const parsed = new Date(DEPLOY_LASTMOD_SOURCE);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  // Fallback: ISO date pinned to today's date at build time. Better than
  // a per-request `new Date()` because the value is captured once when
  // the bundle loads and stays stable for the lifetime of the running
  // process — multiple sitemap requests in the same dyno still get the
  // same timestamp instead of drifting by milliseconds.
  return new Date();
})();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticLastmod = STATIC_LASTMOD;

  // Static marketing surfaces. Each `localized: true` path generates one
  // entry per supported locale with hreflang siblings; `localized: false`
  // paths emit a single EN-only entry (used for legal copy that hasn't
  // been professionally translated — see middleware's LOCALIZABLE_PATHS
  // for the matching list).
  const staticPaths: Array<{
    path: string;
    changeFrequency: "weekly" | "monthly" | "yearly" | "daily";
    priority: number;
    localized: boolean;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1.0, localized: true },
    { path: "/onboard", changeFrequency: "monthly", priority: 0.9, localized: true },
    { path: "/signup", changeFrequency: "monthly", priority: 0.8, localized: true },
    { path: "/login", changeFrequency: "monthly", priority: 0.6, localized: true },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3, localized: false },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3, localized: false },
  ];

  const staticEntries: MetadataRoute.Sitemap = [];
  for (const entry of staticPaths) {
    // Cookie-localised site: one URL per path, shared across locales.
    // `localized` is kept in the config for documentation but no longer
    // forks the output — every path emits a single entry.
    staticEntries.push({
      url: localizedUrl(entry.path, DEFAULT_LOCALE),
      lastModified: staticLastmod,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: { languages: altLanguages(entry.path) },
    });
  }

  return staticEntries;
}
