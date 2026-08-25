import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE_NAME, isLocale } from "@/lib/i18n/cookie";
import { DEFAULT_LOCALE } from "@/lib/i18n/alternates";
import type { Locale } from "@/lib/i18n/translations";

/**
 * Read the current visitor's locale on the server. Mirrors what the
 * client `useI18n()` hook resolves to, but works inside server
 * components, layouts, and `generateMetadata()` where hooks aren't
 * available.
 *
 * Defaults to DEFAULT_LOCALE ("pt") when no rt-locale cookie is set.
 * Falls back to it for any unknown value so a stale cookie can't crash
 * a render.
 *
 * Used by:
 *   - src/app/page.tsx (home)
 *   - src/app/onboard/page.tsx layout (where the wizard is server-shell)
 *   - src/components/marketing-header.tsx (nav labels)
 *   - any other server-rendered marketing surface
 *
 * Pattern at the call site:
 *   const locale = await getLocale();
 *   const t = translations[locale];
 *   <h1>{t.heroTitle}</h1>
 *
 * That gives readable code per-page without bringing the client-side
 * useI18n() context into server components (which would force them
 * client-side and lose the SSR/SEO benefits).
 */
export async function getLocale(): Promise<Locale> {
  // Middleware (src/middleware.ts) sets `x-locale` to the resolved
  // locale based on cookie → browser Accept-Language → default. Reading
  // from the header keeps marketing pages aligned with what the visitor
  // actually resolved. Header is missing for static-render bypass /
  // direct page rendering during build — fall through to cookie +
  // default in that case.
  try {
    const h = await headers();
    const fromHeader = h.get("x-locale");
    if (isLocale(fromHeader)) return fromHeader;
  } catch {
    // headers() throws when called outside a request scope (e.g. during
    // static asset generation). Fall through to cookie.
  }
  try {
    const store = await cookies();
    const value = store.get(LOCALE_COOKIE_NAME)?.value;
    if (isLocale(value)) return value;
    return DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}


