/**
 * Locale pinning for e2e specs.
 *
 * Playwright Chromium sends `Accept-Language: en-US` by default, so the
 * middleware resolves the UI to EN even though DEFAULT_LOCALE is "pt".
 * Specs that assert on the product's pt copy must pin the locale via the
 * `rt-locale` cookie (read by the middleware before Accept-Language).
 */
import type { Page } from "@playwright/test";
import { E2E_BASE_URL } from "./base-url";

const LOCALE_COOKIE_NAME = "rt-locale";

/** Pin the UI to pt-BR for the current page's context. Call before goto. */
export async function usePtLocale(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: "pt", url: E2E_BASE_URL },
  ]);
}
