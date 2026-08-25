/**
 * Cross-tenant cleaner leak — security regression test.
 *
 * Verifies the fix is in place:
 *
 * 1. Enumeration — GET /api/users is superadmin-only. Non-superadmins
 *    cannot list or filter cleaners (the legacy `?role=cleaner` public
 *    filter is gone). The cleaner picker now uses the scoped
 *    /api/cleaners pool (ownerUserId: session.userId).
 *
 * 2. Assignment — the legacy username-based branch of
 *    POST /api/cleaner-assignments is removed. Only the profile-based
 *    branch (cleanerProfileId) remains and is already scoped by
 *    Cleaner.ownerUserId === session.userId.
 *
 * Run with:  pnpm test:e2e cleaner-leak.spec.ts
 *
 * NOTE: No afterAll cleanup is needed — the test DB (data/test.db) is
 * wiped and re-seeded from scratch on every pnpm test:e2e invocation
 * (see scripts/run-e2e.sh).
 */

import { test, expect } from "@playwright/test";
import { signup } from "./fixtures/auth";
import { createProperty } from "./fixtures/property";
import { createCleanerUser } from "./fixtures/cleaner";

// ── Constants ─────────────────────────────────────────────────────────
const RUN_TS = Date.now(); // stable across all tests in this file
const CLEANER_USERNAME = `e2e-cleaner-${RUN_TS}`;
const CLEANER_PASSWORD = "CleanerPass123!";
const USER_B_PASSWORD = "TenantBPass123!";

/** Generate a unique tenant-B email (unique per call via Date.now). */
function tenantBEmail(): string {
  return `e2e-tenant-b-${Date.now()}@propical.com.br`;
}

// ── Shared state ──────────────────────────────────────────────────────
let cleaner: { id: number; username: string };

// ── Setup ─────────────────────────────────────────────────────────────
test.beforeAll(async () => {
  // Create the cleaner user directly in the DB — no HTTP API supports
  // creating role "cleaner" (signup and POST /api/users hardcode "user").
  // Safe to run while the dev server is up: it's an INSERT, not a DB rebuild.
  cleaner = await createCleanerUser(CLEANER_USERNAME, CLEANER_PASSWORD);
});

// ── Tests ─────────────────────────────────────────────────────────────
test.describe("Legacy cleaner cross-tenant leak", () => {
  test("1.1 — non-superadmins cannot enumerate cleaners via /api/users", async ({
    page,
  }) => {
    // ── User A (seeded test user, role "user", auth via storageState) ──
    // /api/users is superadmin-only after the fix. A non-superadmin
    // must get 403, NOT a list of every cleaner in the system.
    const resA = await page.request.get("/api/users?role=cleaner");
    expect(resA.status()).toBe(403);

    // ── User B (brand-new user, different "tenant") ──
    const emailB = tenantBEmail();
    const ctxB = await page.context().browser()!.newContext();
    const pageB = await ctxB.newPage();
    await signup(pageB, emailB, USER_B_PASSWORD);

    // B is also a non-superadmin. The enumeration leak is closed.
    const resB = await pageB.request.get("/api/users?role=cleaner");
    expect(resB.status()).toBe(403);

    await ctxB.close();
  });

  test("1.2 — legacy username-based assignment is rejected", async ({
    page,
  }) => {
    // ── User B creates a property ──
    const emailB = tenantBEmail();
    const ctxB = await page.context().browser()!.newContext();
    const pageB = await ctxB.newPage();
    await signup(pageB, emailB, USER_B_PASSWORD);

    const propB = await createProperty(pageB, `Leak-Test-B-${RUN_TS}`);

    // B attempts to assign cleaner C via the legacy username branch.
    // That branch was removed: POST only accepts cleanerProfileId.
    // The request must be rejected with a 4xx — B cannot acquire another
    // tenant's cleaner account by username.
    const assignRes = await pageB.request.post("/api/cleaner-assignments", {
      data: { propertyId: propB.id, username: cleaner.username },
    });
    expect(assignRes.status()).toBeGreaterThanOrEqual(400);

    // The POST was rejected, so B's property has no assignment at all
    // (the response shape no longer carries `username` — assignments now
    // reference cleaner profiles only).
    const listRes = await pageB.request.get(
      `/api/cleaner-assignments?propertyId=${propB.id}`,
    );
    expect(listRes.ok()).toBeTruthy();
    const assignments = await listRes.json();
    expect(assignments).toHaveLength(0);

    await ctxB.close();
  });
});
