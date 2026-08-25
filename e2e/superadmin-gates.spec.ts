/**
 * Superadmin gate regression — cron-url + schedule.
 *
 * Verifies the fixes are in place:
 *
 * - /api/calendar/cron-url embeds the cron SECRET (the key that lets
 *   anyone trigger a full system-wide sync), so it is superadmin-only.
 *   The secret must never reach a non-admin DOM.
 * - /api/calendar/schedule surfaces GLOBAL operator state (auto-sync
 *   toggle + frequency + the unscoped cron result), so it is
 *   superadmin-only on GET and PUT. The Tasks view
 *   (?view=tasks) and Settings view (?view=settings) are admin-only.
 *
 * Run with:  pnpm test:e2e superadmin-gates.spec.ts
 *
 * The superadmin session is MINTED (fixtures/superadmin.ts), never
 * created via /api/auth/login — the 5/60s login bucket is already near
 * its limit (global-setup + auth.spec = 4 of 5). The non-admin session
 * comes from a fresh signup (dev bypass).
 *
 * NOTE: No afterAll cleanup is needed — the test DB (data/test.db) is
 * wiped and re-seeded from scratch on every pnpm test:e2e invocation.
 */

import { test, expect } from "@playwright/test";
import { signup } from "./fixtures/auth";
import { createSuperadminUser, setSession } from "./fixtures/superadmin";

const RUN_TS = Date.now(); // stable across all tests in this file

// The cron URL embeds the secret as a query param — asserting it never
// renders for non-admins is the core acceptance criterion.
const CRON_URL_PATTERN = /\/api\/calendar\/cron\?secret=/;

// ── Non-admin: everything must 403 / render "Admin only." ─────────────
test.describe("Superadmin gates — non-admin", () => {
  test("non-admin gets 403 on both APIs and never sees the cron secret", async ({ page }) => {
    // Fresh signup (dev bypass) → role "user".
    const email = `e2e-nonadmin-${RUN_TS}@propical.com.br`;
    await signup(page, email, "StrongPass123!");

    // ── API: both endpoints are superadmin-only ──
    const cronRes = await page.request.get("/api/calendar/cron-url");
    expect(cronRes.status()).toBe(403);

    const schedRes = await page.request.get("/api/calendar/schedule");
    expect(schedRes.status()).toBe(403);

    // ── UI: Tasks and Settings views bounce to "Admin only." ──
    await page.goto("/dashboard?view=tasks");
    await expect(page.getByText("Admin only.")).toBeVisible();
    // The cron secret must never be in the non-admin DOM.
    await expect(page.getByText(CRON_URL_PATTERN)).toHaveCount(0);

    await page.goto("/dashboard?view=settings");
    await expect(page.getByText("Admin only.")).toBeVisible();
  });
});

// ── Superadmin: 200 + TasksPanel with the secret ──────────────────────
test.describe("Superadmin gates — superadmin", () => {
  let superadmin: { id: number; username: string };

  test.beforeAll(() => {
    superadmin = createSuperadminUser(`e2e-admin-${RUN_TS}`, "AdminPass123!");
  });

  test("superadmin sees the cron URL, schedule defaults and the Tasks panel", async ({ page }) => {
    await setSession(page.context(), superadmin, "superadmin");

    // ── API: cron-url 200 with a secret-bearing URL ──
    const cronRes = await page.request.get("/api/calendar/cron-url");
    expect(cronRes.status()).toBe(200);
    const cronBody = await cronRes.json();
    expect(cronBody.url).toContain("/api/calendar/cron?secret=");
    expect(cronBody.configured).toBe(true);

    // ── API: schedule 200 with fresh-DB defaults ──
    const schedRes = await page.request.get("/api/calendar/schedule");
    expect(schedRes.status()).toBe(200);
    const sched = await schedRes.json();
    expect(sched).toMatchObject({
      autoEnabled: false,
      frequencyMinutes: 10,
      lastRun: null,
      lastResult: null,
    });

    // ── API: superadmin may PUT (flips the global operator toggle).
    // Enables auto-sync so the TasksPanel frequency row renders below. ──
    const putRes = await page.request.put("/api/calendar/schedule", {
      data: { autoEnabled: true },
    });
    expect(putRes.status()).toBe(200);

    // ── UI: TasksPanel renders with the cron secret visible ──
    await page.goto("/dashboard?view=tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(page.getByText(CRON_URL_PATTERN)).toBeVisible();
    await expect(page.getByText("Sync every")).toBeVisible();
    // Frequency defaults to 10 minutes (matches the fresh-DB GET above).
    await expect(page.locator("select").first()).toHaveValue("10");
  });
});
