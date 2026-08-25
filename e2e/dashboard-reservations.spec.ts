/**
 * Dashboard with real reservations — regression coverage for the
 * PlatformDot rollout.
 *
 * WHY THIS SPEC EXISTS: the visual baseline (visual.spec.ts) seeds a
 * property with ZERO reservations ("Sin reservas → calendario vacío"),
 * so the two render paths that NEED reservation data never executed in
 * e2e. A swapped variable name (`res` ↔ `next`) slipped through as a
 * runtime ReferenceError:
 *   - dashboard.tsx property-card "next guest" line (res.platform)
 *   - dashboard.tsx ReservationRow (next.platform)
 *
 * This spec seeds 5 properties, each with reservations straddling today
 * (current stay + upcoming + later), loads the dashboard, and asserts
 * the data ACTUALLY renders — no React/Next error overlay, names visible.
 *
 * Run with:  pnpm test:e2e dashboard-reservations.spec.ts
 */

import { test, expect } from "@playwright/test";

const RUN_TS = Date.now();
const PROP_PREFIX = `C2a-${RUN_TS}-`;
const PLATFORMS = ["airbnb", "booking", "direct", "vrbo", "expedia"];

/** ISO date string (YYYY-MM-DD) for today + N days. */
function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

test.describe("Dashboard — renders with real reservations (C2a regression)", () => {
  const propertyIds: number[] = [];

  test.beforeAll(async ({ request }) => {
    for (let i = 0; i < 5; i++) {
      const platform = PLATFORMS[i % PLATFORMS.length];

      const propRes = await request.post("/api/properties", {
        data: { name: `${PROP_PREFIX}${i}` },
      });
      expect(propRes.ok()).toBeTruthy();
      const prop = (await propRes.json()) as { id: number };
      propertyIds.push(prop.id);

      // Three non-overlapping stays per property: one straddling today
      // (current guest), one within the next 7 days, one further out.
      const current = await request.post("/api/reservations", {
        data: {
          propertyId: prop.id,
          name: `${PROP_PREFIX}${i}-current`,
          checkIn: isoDate(-2),
          checkOut: isoDate(2),
          platform,
        },
      });
      const next = await request.post("/api/reservations", {
        data: {
          propertyId: prop.id,
          name: `${PROP_PREFIX}${i}-next`,
          checkIn: isoDate(4),
          checkOut: isoDate(8),
          platform,
        },
      });
      const later = await request.post("/api/reservations", {
        data: {
          propertyId: prop.id,
          name: `${PROP_PREFIX}${i}-later`,
          checkIn: isoDate(14),
          checkOut: isoDate(18),
          platform,
        },
      });

      expect(current.ok(), `current reservation prop ${i}`).toBeTruthy();
      expect(next.ok(), `next reservation prop ${i}`).toBeTruthy();
      expect(later.ok(), `later reservation prop ${i}`).toBeTruthy();
    }
  });

  test.afterAll(async ({ request }) => {
    for (const id of propertyIds) {
      await request.delete(`/api/properties/${id}`).catch(() => {});
    }
  });

  test("portfolio dashboard renders property cards + reservation list without errors", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Property cards render (portfolio grid) — the card header is the
    // exact property name. El nombre también aparece en las filas del
    // listado (label de propiedad) y en el dropdown del navbar, así que
    // tomamos el primer match.
    await expect(
      page.getByText(`${PROP_PREFIX}0`, { exact: true }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Current stays render in the reservation list ("Currently staying").
    await expect(
      page.getByText(`${PROP_PREFIX}0-current`, { exact: true }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Next stays render (both the card's "next guest" line and the list).
    await expect(
      page.getByText(`${PROP_PREFIX}2-next`, { exact: true }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // No Next.js error overlay. El portal [data-nextjs-dialog] existe en el
    // DOM aunque no haya error (dev overlay), pero debe estar OCULTO — con
    // el ReferenceError de render quedaba visible cubriendo la página.
    await expect(page.locator("[data-nextjs-dialog]")).toBeHidden();
    expect(pageErrors).toEqual([]);
  });

  test("selected-property reservation list renders its rows", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    // view=guests (sin ?reservation) monta el Dashboard con selectedProperty,
    // cuyo listado de reservas usa ReservationRow — distinto del grid del
    // PropertyCalendar que renderiza view=calendar.
    await page.goto(`/dashboard?property=${propertyIds[0]}&view=guests`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(`${PROP_PREFIX}0-current`, { exact: true }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("[data-nextjs-dialog]")).toBeHidden();
    expect(pageErrors).toEqual([]);
  });
});
