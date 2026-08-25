import { expect, type Page } from "@playwright/test";

/**
 * Auth helpers for e2e tests.
 *
 * App default locale is EN (English). Error messages from the server
 * are in English. Form labels are in English.
 *
 * E2E credentials (from prisma/seed-test-user.ts, seeded by run-e2e.sh):
 *   e2e@propical.com.br / E2eTest123456!
 *
 * NOTE: this is a DEDICATED e2e user, separate from the manual dev user
 * (test@propical.com.br) that `pnpm dev` + `pnpm db:seed-test-user`
 * create by default. Keeping them apart means manual testing never
 * pollutes the e2e data (e.g. a leftover property that would flip the
 * visual baseline from the onboarding wizard to the calendar).
 */

const TEST_USER = {
  email: "e2e@propical.com.br",
  password: "E2eTest123456!",
};

/**
 * Fill a controlled input, retrying until the value actually sticks.
 *
 * Fixes the React hydration race: if `page.fill()` lands before React
 * hydrates a controlled input, the hydration pass resets the value to
 * "" (the component's initial state), which then trips the HTML5
 * `required` validation and blocks the submit — the test hangs waiting
 * for a response that never comes. Retrying `fill` + asserting
 * `toHaveValue` guarantees the value is committed before we move on.
 *
 * The `inputValue()` pre-check skips the `fill` on retry iterations
 * where the value already stuck (avoids a redundant write).
 */
async function fillSettled(page: Page, selector: string, value: string) {
  await expect(async () => {
    if ((await page.locator(selector).inputValue()) !== value) {
      await page.fill(selector, value);
    }
    await expect(page.locator(selector)).toHaveValue(value);
  }).toPass({ timeout: 10_000 });
}

/**
 * Wait for the page to finish hydrating before interacting with it.
 *
 * The hydration race is not fully solved by `fillSettled` alone: React
 * can reset a controlled input to "" AFTER `fillSettled` verifies the
 * value but BEFORE the submit click lands. The only reliable fix is to
 * ensure hydration is complete before we start filling. On the
 * login/signup pages (no background polling) `networkidle` is a safe
 * proxy for "hydration done" — the JS bundle + the one-shot
 * `/api/site-config` fetch have settled.
 */
async function waitHydrated(page: Page) {
  await page.waitForLoadState("networkidle");
}

export { fillSettled, waitHydrated };

/**
 * Sign up a new user. In dev mode without RESEND_API_KEY, the API
 * creates the account + sets the session cookie immediately (returning
 * `{ user }`), but the client always transitions to step "verify".
 * We wait for that transition then navigate to /dashboard directly
 * — the session cookie is already set.
 */
export async function signup(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/signup");
  await waitHydrated(page);
  await fillSettled(page, "input#email", email);
  await fillSettled(page, "input#password", password);
  await page.click("button[type='submit']");

  // The API sets the session cookie on success. The client moves to
  // the "verify" step (shows input#code). Wait for it, then go to dashboard.
  await page.waitForSelector("input#code", { timeout: 10_000 });
  await page.goto("/dashboard");
  await page.waitForURL("/dashboard");
}

/**
 * Log in with the seeded test user.
 */
export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await waitHydrated(page);
  await fillSettled(page, "input#username", TEST_USER.email);
  await fillSettled(page, "input#password", TEST_USER.password);

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.click("button[type='submit']"),
  ]);

  if (response.status() !== 200) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Login failed with status ${response.status()}: ${body.slice(0, 200)}`,
    );
  }

  await page.waitForURL("/dashboard");
}

/**
 * Log out from the dashboard.
 */
export async function logout(page: Page): Promise<void> {
  await page.click('button[aria-label="User menu"]');
  // Logout button has rose-colored text
  await page.click("button.text-rose-500");
  await page.waitForURL("/login");
}

/**
 * Verify protected redirect.
 */
export async function assertProtectedRedirect(
  page: Page,
  targetPath: string,
): Promise<void> {
  await page.goto(targetPath);
  await page.waitForURL(`/login?next=${encodeURIComponent(targetPath)}`);
}

export { TEST_USER };
