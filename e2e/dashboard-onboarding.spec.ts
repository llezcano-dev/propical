import { test, expect } from "@playwright/test";
import { signup } from "./fixtures/auth";

test.describe("Dashboard onboarding", () => {
  test("3.1 — sample property escape exits the wizard without a full page reload", async ({
    page,
  }) => {
    const email = `e2e-onboard-${Date.now()}@propical.com.br`;
    await signup(page, email, "StrongPass123!");

    // Wait for the onboarding wizard to appear
    await expect(page.getByTestId("onboarding-name")).toBeVisible({
      timeout: 15_000,
    });

    // Set a flag that survives only if there is no full-page reload.
    // The critical fix being validated: onComplete must re-fetch
    // properties and re-render the dashboard without
    // window.location.reload().
    await page.evaluate(() => {
      (window as any).__noFullReload = true;
    });

    // Escape via the sample property
    await page.getByTestId("onboarding-sample").click();

    // After onComplete → properties re-fetched → "Sample Apartment"
    // card appears in the dashboard
    await expect(page.getByText("Sample Apartment").first()).toBeVisible({
      timeout: 15_000,
    });

    // The wizard must be gone
    await expect(page.getByTestId("onboarding-name")).toHaveCount(0);

    // The flag must still be set — a full reload would have wiped it
    const survived = await page.evaluate(
      () => (window as any).__noFullReload === true,
    );
    expect(survived).toBe(true);
  });

  test("3.2 — naming a property advances to connect-calendar step; manual escape exits", async ({
    page,
  }) => {
    const email = `e2e-onboard-${Date.now()}@propical.com.br`;
    await signup(page, email, "StrongPass123!");

    // Step 1: name the property
    await expect(page.getByTestId("onboarding-name")).toBeVisible({
      timeout: 15_000,
    });
    await page.getByTestId("onboarding-name").fill("E2E Property");
    await page.getByTestId("onboarding-continue").click();

    // Step 2: connect a calendar
    await expect(page.getByText(/Connect a calendar to/)).toBeVisible({
      timeout: 10_000,
    });

    // Soft escape — "Add a manual reservation instead"
    await page.getByTestId("onboarding-manual").click();

    // The Link navigates to the property's calendar view while
    // calling onComplete() to exit the wizard
    await page.waitForURL(/\/dashboard\?property=\d+&view=calendar/, {
      timeout: 10_000,
    });

    // Wizard is gone — the calendar grid renders (cells have data-date)
    await expect(page.getByTestId("onboarding-name")).toHaveCount(0);
    await expect(page.locator("[data-date]").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
