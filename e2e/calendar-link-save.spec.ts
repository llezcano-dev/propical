/**
 * Calendar link save — regression coverage for B7.
 *
 * WHY THIS SPEC EXISTS: POST /api/calendar/links hardcoded the platform
 * allowlist to ["airbnb","booking"], so saving a Vrbo preset or a custom
 * platform from view=sync returned 400. The client swallowed the error
 * silently AND the draft save button dropped the draft row even when the
 * POST failed — so a new feed card vanished with no feedback.
 *
 * This spec seeds a property, saves a Vrbo link and a custom-platform
 * link through the real UI, and asserts the cards persist (Connected
 * badge) instead of disappearing.
 *
 * Run with:  pnpm test:e2e calendar-link-save.spec.ts
 */

import { test, expect } from "@playwright/test";
import { E2E_BASE_URL } from "./fixtures/base-url";
import { createProperty, deleteProperty } from "./fixtures/property";

const RUN_TS = Date.now();
const PROP_PREFIX = `B7-${RUN_TS}-`;
// Dynamic fixture feed (relative dates) so the scoped sync after save
// succeeds quickly and the card flips to "Connected" without a feed error.
const FEED_URL = `${E2E_BASE_URL}/api/test/ical/airbnb-sample.ics`;

test.describe("Calendar link save — vrbo + custom platforms persist (B7)", () => {
  test("saving a Vrbo preset link persists the card (was 400 + silent)", async ({
    page,
  }) => {
    const prop = await createProperty(page, `${PROP_PREFIX}vrbo`);
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    try {
      await page.goto(`/dashboard?property=${prop.id}&view=sync`);
      await page.waitForLoadState("networkidle");

      const vrboCard = page.locator("div.rounded-lg").filter({
        has: page.getByPlaceholder("https://www.vrbo.com/icalendar/…"),
      });
      await expect(vrboCard).toBeVisible({ timeout: 15_000 });

      await vrboCard
        .getByPlaceholder("https://www.vrbo.com/icalendar/…")
        .fill(FEED_URL);
      await vrboCard.getByRole("button", { name: "Save" }).click();

      // The link persisted → the card flips to "Connected" (Edit/Remove).
      await expect(vrboCard.getByText("Connected")).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.locator("[data-nextjs-dialog]")).toBeHidden();
      expect(pageErrors).toEqual([]);
    } finally {
      await deleteProperty(page, prop.id).catch(() => {});
    }
  });

  test("saving a custom platform draft persists the card (was removed on failure)", async ({
    page,
  }) => {
    const prop = await createProperty(page, `${PROP_PREFIX}custom`);
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    try {
      await page.goto(`/dashboard?property=${prop.id}&view=sync`);
      await page.waitForLoadState("networkidle");

      await page.getByRole("button", { name: "Add another platform" }).click();

      const draftCard = page.locator("div.rounded-lg").filter({
        has: page.getByPlaceholder("Platform name"),
      });
      await expect(draftCard).toBeVisible({ timeout: 15_000 });

      await draftCard.getByPlaceholder("Platform name").fill("Hostaway");
      await draftCard.getByPlaceholder("https://…").fill(FEED_URL);
      await draftCard.getByRole("button", { name: "Save" }).click();

      // The draft is promoted to a saved custom card — it must NOT vanish.
      const savedCard = page.locator("div.rounded-lg").filter({
        has: page.getByRole("heading", { name: "Hostaway" }),
      });
      await expect(savedCard).toBeVisible({ timeout: 15_000 });
      await expect(savedCard.getByText("custom")).toBeVisible();
      await expect(savedCard.getByText("Connected")).toBeVisible();
      await expect(page.locator("[data-nextjs-dialog]")).toBeHidden();
      expect(pageErrors).toEqual([]);
    } finally {
      await deleteProperty(page, prop.id).catch(() => {});
    }
  });
});