/**
 * Admin shell access gate — security regression test.
 *
 * The middleware gates /api/admin/* at the boundary, but the page routes
 * under /dashboard/admin/* are a client-rendered shell. The admin layout
 * adds a defense-in-depth `notFound()` so a non-superadmin
 * who deep-links to any /dashboard/admin/* page gets the global 404
 * instead of the shell content.
 *
 * Run with:  pnpm test:e2e admin-gate.spec.ts
 *
 * NOTE: No afterAll cleanup is needed — the test DB (data/test.db) is
 * wiped and re-seeded from scratch on every pnpm test:e2e invocation
 * (see scripts/run-e2e.sh). This spec lives in the "auth" Playwright
 * project (no storageState) so `signup` starts from a logged-out context.
 */

import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { signup } from "./fixtures/auth";
import { createSuperadminUser, createUserWithRole, setSession } from "./fixtures/superadmin";

const ROOT = path.resolve(__dirname, "..");
const RUN_TS = Date.now(); // stable across all tests in this file

// ── Tests ─────────────────────────────────────────────────────────────
test.describe("Admin shell access gate", () => {
  test("2.1 — non-superadmin gets 404 on the admin shell", async ({
    page,
  }) => {
    // Sign up a fresh non-superadmin user (signup hardcodes role "user").
    const email = `e2e-nonadmin-${Date.now()}@propical.com.br`;
    await signup(page, email, "StrongPass123!");

    // Deep-link straight to the admin shell. A non-superadmin must hit
    // the global 404 page — not the shell, not a redirect.
    await page.goto("/dashboard/admin");

    await expect(page.getByText("404", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("This page doesn't exist")).toBeVisible();
    // The admin shell renders a sidebar <nav>; the 404 page does not.
    await expect(page.locator("nav")).toHaveCount(0);
  });

  test("2.2 — non-superadmin gets 404 on a nested admin page", async ({
    page,
  }) => {
    const email = `e2e-nonadmin-${Date.now()}@propical.com.br`;
    await signup(page, email, "StrongPass123!");

    await page.goto("/dashboard/admin/workspace/users");

    await expect(page.getByText("404", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("nav")).toHaveCount(0);
  });
});

// ── Seed superadmin guard — refuses the default "admin" in prod ──────
// CLI tests — no browser. The seed (prisma/seed.ts) calls
// assertSeedAllowsSuperadmin() which throws when NODE_ENV=production and
// the username resolves to "admin" (case-insensitive). A custom username
// + explicit password must succeed and persist.
test.describe("Seed superadmin guard", () => {
  function seedEnv(username: string, withPassword: boolean): NodeJS.ProcessEnv {
    return {
      ...process.env,
      NODE_ENV: "production",
      SEED_ADMIN_USERNAME: username,
      ...(withPassword ? { SEED_ADMIN_PASSWORD: "SeedAdminPass123!" } : {}),
      DATABASE_URL: "file:./data/test.db",
    };
  }

  test("refuses the default 'admin' username in production (exit ≠ 0)", () => {
    expect(() =>
      execSync("npx tsx prisma/seed.ts", {
        cwd: ROOT,
        env: seedEnv("admin", true),
        stdio: "pipe",
        encoding: "utf-8",
      }),
    ).toThrow(/Refusing to seed a superadmin named "admin" in production/);
  });

  test("custom username + password seeds successfully and persists", () => {
    const username = `e2e-seed-admin-${RUN_TS}`;
    const run = () =>
      execSync("npx tsx prisma/seed.ts", {
        cwd: ROOT,
        env: seedEnv(username, true),
        stdio: "pipe",
        encoding: "utf-8",
      });

    const first = run();
    expect(first).toContain(`Superadmin created: ${username}`);
    // Second run hits the update branch → proves the row actually persisted.
    const second = run();
    expect(second).toContain(`Superadmin password updated: ${username}`);
  });
});

// ── Superadmin suspend self-guard ─────────────────────────────────────
// API tests with a real superadmin session. The session is MINTED
// (e2e/fixtures/superadmin.ts) instead of going through /api/auth/login,
// keeping us off the 5/60s login rate-limit bucket.
test.describe("Superadmin suspend gate", () => {
  let superadmin: { id: number; username: string };
  let targetUser: { id: number; username: string };

  test.beforeAll(() => {
    superadmin = createSuperadminUser(`e2e-admin-${RUN_TS}`, "AdminPass123!");
    targetUser = createUserWithRole(`e2e-target-${RUN_TS}`, "TargetPass123!", "user");
  });

  test("superadmin cannot suspend their own account (400)", async ({ page }) => {
    await setSession(page.context(), superadmin, "superadmin");

    const res = await page.request.post(`/api/admin/users/${superadmin.id}/suspend`);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/Cannot suspend your own account/);
  });

  test("superadmin can suspend another user (200)", async ({ page }) => {
    await setSession(page.context(), superadmin, "superadmin");

    const res = await page.request.post(`/api/admin/users/${targetUser.id}/suspend`);
    expect(res.status()).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
