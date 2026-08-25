import { test, expect } from "@playwright/test";
import { login, logout, signup, TEST_USER, assertProtectedRedirect, fillSettled, waitHydrated } from "./fixtures/auth";
// DB lifecycle: `scripts/run-e2e.sh` creates + seeds test.db before
// starting the dev server. NO beforeAll that deletes the DB — the
// server has it open and deleting it causes SQLITE_READONLY on writes.

// The AuthError component and Next.js route announcer both use role="alert".
const errorAlert = (page: import("@playwright/test").Page) =>
  page.locator('[role="alert"]:not([id="__next-route-announcer__"])');

test.describe("Auth — Signup", () => {
  test("1.1 — signup creates account and redirects to /dashboard", async ({ page }) => {
    const uniqueEmail = `e2e-new-${Date.now()}@propical.com.br`;
    await signup(page, uniqueEmail, "StrongPass123!");

    expect(page.url()).toContain("/dashboard");
    await expect(page.locator('button[aria-label="User menu"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test("1.2 — signup with duplicate email shows error", async ({ page }) => {
    await page.goto("/signup");
    await waitHydrated(page);
    await fillSettled(page, "input#email", TEST_USER.email);
    await fillSettled(page, "input#password", "SomePass123!");
    await page.click("button[type='submit']");

    const alert = errorAlert(page);
    await expect(alert).toBeVisible({ timeout: 5000 });
    expect(await alert.textContent()).toBeTruthy();
  });
});

test.describe("Auth — Login", () => {
  test("1.3 — login with valid credentials redirects to /dashboard", async ({ page }) => {
    await login(page);
    expect(page.url()).toContain("/dashboard");
    await expect(page.locator('button[aria-label="User menu"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test("1.4 — login with invalid password shows error", async ({ page }) => {
    await page.goto("/login");
    await waitHydrated(page);
    await fillSettled(page, "input#username", TEST_USER.email);
    await fillSettled(page, "input#password", "WrongPassword999!");
    await page.click("button[type='submit']");

    const alert = errorAlert(page);
    await expect(alert).toBeVisible({ timeout: 5000 });
    expect(await alert.textContent()).toBeTruthy();
  });

  // 1.5 was removed — redundant with 1.4 (both test invalid
  // credentials hitting /api/auth/login), and every POST to login
  // consumes a slot from the shared 5-attempt/60s per-IP bucket.
});

test.describe("Auth — Session gating", () => {
  test("1.6 — /dashboard without session redirects to /login?next=/dashboard", async ({ page }) => {
    await assertProtectedRedirect(page, "/dashboard");
  });

  test("1.7 — logout clears session and redirects to /login", async ({ page }) => {
    await login(page);
    await logout(page);
    expect(page.url()).toContain("/login");

    await assertProtectedRedirect(page, "/dashboard");
  });
});

test.describe("Auth — Health check", () => {
  test("server is running and login API is reachable", async ({ page }) => {
    // In cold start Turbopack may still be compiling — wait for the
    // login page to actually render before probing the endpoints.
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("input#username", { timeout: 10_000 });

    const homeRes = await page.request.get("/");
    expect(homeRes.ok()).toBe(true);

    const loginRes = await page.request.get("/login");
    expect(loginRes.ok()).toBe(true);

    // Don't POST to login — GET proves reachability and a POST would
    // consume a rate-limit slot for no additional coverage.
  });
});
