import type { Locale } from "@/lib/i18n/translations";

// Single source of truth for what locales the public site serves.
// Mirrors the SUPPORTED_LOCALES constant in src/middleware.ts — keep
// them in sync when adding a language. (Inline duplication is
// deliberate: middleware runs in Edge runtime and importing from
// arbitrary modules is fragile; one extra const to update per new
// language is cheap.)
//
// Locale is resolved per-visitor via cookie → browser Accept-Language
// → DEFAULT_LOCALE. There are NO per-locale URL prefixes: every visitor
// shares the same URL and the language is chosen by the `rt-locale`
// cookie (set by the LocaleSwitcher) or the browser's language. This is
// a deliberate product decision for a not-yet-published app — it keeps
// URLs stable and avoids the SEO complexity of subdirectory routing.
export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "pt", "es"];
export const DEFAULT_LOCALE: Locale = "pt";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://propical.com.br";

/**
 * Build the per-page metadata alternates map. Because the site is
 * cookie-localised (no per-locale URLs), every locale shares the same
 * canonical URL. We emit only `x-default` as the hreflang sibling —
 * declaring multiple locales against one URL would be a duplicate-content
 * signal to Google. `x-default` points at the canonical URL.
 */
export function localizedAlternates(
  defaultPath: string,
  _currentLocale: Locale,
): { canonical: string; languages: Record<string, string> } {
  return {
    canonical: defaultPath,
    languages: { "x-default": defaultPath },
  };
}

/**
 * Prefix a default-locale path with the user's resolved locale. No-op in
 * the cookie-based world — internal links are always unprefixed.
 */
export function localePath(defaultPath: string, _locale: Locale): string {
  return defaultPath;
}

export { SITE_URL };