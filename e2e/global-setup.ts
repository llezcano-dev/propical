import { chromium, expect, type FullConfig, type Page } from "@playwright/test";
import path from "path";
import { E2E_BASE_URL } from "./fixtures/base-url";

const ROOT = path.resolve(__dirname, "..");

const TEST_USER = {
  email: "e2e@propical.com.br",
  password: "E2eTest123456!",
};

/**
 * Same hydration-race protection as e2e/fixtures/auth.ts: the login form
 * is a controlled input and a `fill` landing before React hydrates gets
 * reset to "" (which then blocks the submit via HTML5 `required`).
 * global-setup is the one remaining place that logged in with raw fills,
 * so it was susceptible to the same intermittent 30s timeout.
 */
async function waitHydrated(page: Page) {
  await page.waitForLoadState("networkidle");
}

async function fillSettled(page: Page, selector: string, value: string) {
  await expect(async () => {
    if ((await page.locator(selector).inputValue()) !== value) {
      await page.fill(selector, value);
    }
    await expect(page.locator(selector)).toHaveValue(value);
  }).toPass({ timeout: 10_000 });
}

/**
 * Global auth setup — logs in once with the seeded test user and saves
 * cookies to e2e/.auth/test-user.json.
 *
 * Every test in the "authenticated" Playwright project reuses these
 * cookies instead of hitting /api/auth/login directly, which keeps us
 * well under the 5-attempt/60s per-IP rate limit even when auth.spec.ts
 * also calls the login endpoint for its own assertions.
 */
async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${E2E_BASE_URL}/login`);
  await waitHydrated(page);
  await fillSettled(page, "input#username", TEST_USER.email);
  await fillSettled(page, "input#password", TEST_USER.password);

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.click("button[type='submit']"),
  ]);

  if (response.status() !== 200) {
    throw new Error(
      `Global setup login failed with status ${response.status()}`,
    );
  }

  await page.waitForURL("**/dashboard");

  const authFile = path.join(ROOT, "e2e", ".auth", "test-user.json");
  await context.storageState({ path: authFile });

  await browser.close();
}

export default globalSetup;
