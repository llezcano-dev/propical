/**
 * Navbar — contextual "Todas as propriedades" dropdown (U1).
 *
 * The dropdown's neutral entry navigates to a context-dependent
 * destination (src/lib/navigation.ts `allPropertiesDestination`):
 *   - dual views (cleaning, reports) → keep the current view, now global
 *   - property-scoped views (calendar, sync, …) → land on the Panel
 *
 * And property-scoped tabs reached without a property render the
 * "Selecione uma propriedade" selector (PropertyRequiredView) instead of
 * the old silent ghost state that painted the Panel with no property.
 *
 * Run with:  pnpm test:e2e navbar.spec.ts
 */

import { test, expect } from "@playwright/test";
import { createProperty, deleteProperty } from "./fixtures/property";
import { usePtLocale } from "./fixtures/locale";

const RUN_TS = Date.now();

test.describe("Navbar — dropdown 'Todas as propriedades' contextual (U1)", () => {
  test("A1 — sin propiedad seleccionada: selector + hint, sin ghost state", async ({
    page,
  }) => {
    await usePtLocale(page);
    const prop = await createProperty(page, `E4-A1-${RUN_TS}`);
    try {
      // Property-scoped view without a selected property → the required
      // selector renders, NOT the calendar Panel (no ghost state).
      await page.goto("/dashboard?view=calendar");

      await expect(
        page.getByRole("heading", { name: "Selecione uma propriedade" }),
      ).toBeVisible();
      // The switcher offers the existing property as a pill to pick.
      await expect(page.getByRole("link", { name: prop.name })).toBeVisible();
      // Hint on the property-scoped tabs (native title on the NavTab).
      await expect(
        page
          .locator('nav button[title="Selecione uma propriedade primeiro"]')
          .first(),
      ).toBeVisible();
      // No ghost state: the calendar grid never renders.
      await expect(page.locator("[data-date]")).toHaveCount(0);
      // Top-bar selector is the neutral "all" label, not a phantom name.
      await expect(
        page.getByRole("button", { name: "Todas as propriedades" }),
      ).toBeVisible();
    } finally {
      await deleteProperty(page, prop.id);
    }
  });

  test("A2 — en Limpeza, 'Todas as propriedades' queda en Limpeza global", async ({
    page,
  }) => {
    await usePtLocale(page);
    const prop = await createProperty(page, `E4-A2-${RUN_TS}`);
    try {
      await page.goto("/dashboard?view=cleaning");

      // Portfolio cleaning renders (global scope, no property selected).
      await expect(page).toHaveURL(/view=cleaning/);
      await expect(page.getByRole("button", { name: "Todas as propriedades" })).toBeVisible();

      // Select the property via the dropdown (keeps the cleaning view).
      await page.getByRole("button", { name: "Todas as propriedades" }).click();
      await page.getByRole("button", { name: prop.name }).click();
      await expect(page.getByText(prop.name).first()).toBeVisible();

      // Back to the neutral entry → STAYS in cleaning (dual view).
      await page.getByRole("button", { name: prop.name }).click();
      await page.getByRole("button", { name: "Todas as propriedades", exact: true }).click();
      await expect(page).toHaveURL(/view=cleaning/);
    } finally {
      await deleteProperty(page, prop.id);
    }
  });

  test("A3 — en Calendário, 'Todas' aterriza en Painel", async ({ page }) => {
    await usePtLocale(page);
    const prop = await createProperty(page, `E4-A3-${RUN_TS}`);
    try {
      await page.goto(`/dashboard?property=${prop.id}&view=calendar`);
      await expect(page.locator("[data-date]").first()).toBeVisible();

      // Neutral entry → allPropertiesDestination("calendar") = "dashboard".
      await page.getByRole("button", { name: prop.name }).click();
      await page.getByRole("button", { name: "Todas as propriedades", exact: true }).click();

      // Lands on the Panel: URL `/dashboard` (view = default → no param),
      // calendar grid gone, selector back to the neutral label.
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.locator("[data-date]")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Todas as propriedades" }),
      ).toBeVisible();
    } finally {
      await deleteProperty(page, prop.id);
    }
  });
});
