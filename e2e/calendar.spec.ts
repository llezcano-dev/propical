import { test, expect } from "@playwright/test";
import {
  createProperty,
  deleteProperty,
  addCalendarLink,
  triggerSync,
} from "./fixtures/property";
// No login() needed — the "authenticated" Playwright project injects
// the stored session cookie from global-setup.ts into every browser
// context, so page.request + page.goto already carry a valid session.

/**
 * Returns an ISO date string (YYYY-MM-DD) for today + N days.
 * The calendar renders months from today−6 to today+12, so
 * any offset between 1 and ~350 is within the visible window.
 */
function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

test.describe("Calendar — reservations", () => {
  test("2.1 — creates a manual reservation from a selected day", async ({
    page,
  }) => {
    const prop = await createProperty(page, `E2E Calendar ${Date.now()}`);

    await page.goto(`/dashboard?property=${prop.id}&view=calendar`);
    await page.waitForLoadState("networkidle");

    // Select a free day well inside the future window
    const targetDate = isoDate(45);
    const cell = page.locator(`[data-date="${targetDate}"]`);
    await expect(cell).toBeVisible({ timeout: 15_000 });
    await cell.click();

    // Side panel opens — click the "Create reservation" action
    await expect(page.getByText("Create reservation").first()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByText("Create reservation").first().click();

    // Fill the reservation form
    await page.getByTestId("res-guest-name").fill("E2E Guest");
    await page.getByTestId("res-save").click();

    // Let the POST + calendar refetch settle before verifying via the
    // API — mirrors 2.2's pattern and avoids a transient ECONNRESET on
    // the dev server (the GET raced the in-flight reservation write).
    await page.waitForLoadState("networkidle");

    // Verify via API — reservation should now exist. The dev server can
    // transiently ECONNRESET the verification GET under suite load, so
    // retry the whole check (idempotent read).
    await expect(async () => {
      const res = await page.request.get(
        `/api/reservations?propertyId=${prop.id}`,
      );
      expect(res.ok()).toBe(true);
      const reservations = await res.json();
      const created = reservations.find((r: any) => r.name === "E2E Guest");
      expect(created).toBeTruthy();
      expect(created.checkIn.startsWith(targetDate)).toBe(true);
      // WS2 default: new reservations use "direct" instead of "airbnb"
      expect(created.platform).toBe("direct");
    }).toPass({ timeout: 15_000 });

    await deleteProperty(page, prop.id);
  });

  test("2.2 — claims a synced iCal booking from the calendar bar", async ({
    page,
    baseURL,
  }) => {
    const prop = await createProperty(page, `E2E Claim ${Date.now()}`);

    // Attach the e2e ICS fixture and sync
    await addCalendarLink(
      page,
      prop.id,
      "airbnb",
      `${baseURL}/api/test-fixtures/airbnb-sample`,
    );
    await triggerSync(page, prop.id);

    await page.goto(`/dashboard?property=${prop.id}&view=calendar`);
    await page.waitForLoadState("networkidle");

    // The synced event airbnb-res-001@e2e (10–15 Aug 2026) paints a bar
    // El evento puede cruzar un límite de semana (domingo) y renderizarse
    // como 2 segmentos con el mismo data-uid; cualquiera abre el mismo
    // claim popover, así que tomamos el primero.
    const bar = page.locator('[data-uid="airbnb-res-001@e2e"]').first();
    await expect(bar).toBeVisible({ timeout: 15_000 });
    await bar.click();

    // Claim popover opens
    await expect(page.getByText("Name this booking")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByTestId("claim-guest-name").fill("E2E Claimed Guest");
    await page.getByTestId("claim-save").click();

    // Wait for the popover to close AND the URL to update with reservation=
    // Fix 1b: the claim now routes through onAddReservation, which on
    // success calls onSelectReservation → the page navigates to the
    // reservation's guest view.
    await expect(page).toHaveURL(/reservation=\d+/, { timeout: 15_000 });
    // Let the server finish processing the claim before hammering the API
    await page.waitForLoadState("networkidle");

    // Verify via API — reservation linked to the iCal event exists
    const res = await page.request.get(
      `/api/reservations?propertyId=${prop.id}`,
    );
    expect(res.ok()).toBe(true);
    const reservations = await res.json();
    const claimed = reservations.find(
      (r: any) => r.linkedEventUid === "airbnb-res-001@e2e",
    );
    expect(claimed).toBeTruthy();
    expect(claimed.name).toBe("E2E Claimed Guest");

    // B1 regression: claimed check-in must equal the iCal DTSTART exactly (no +1 day).
    // Fixture dinámico: airbnb-res-001@e2e = hoy+2 → hoy+7.
    expect(claimed.checkIn.substring(0, 10)).toBe(isoDate(2));
    expect(claimed.checkOut.substring(0, 10)).toBe(isoDate(7));

    await deleteProperty(page, prop.id);
  });

  // ---- claim de reserva externa → refresco + abre vista completa (B1) ----
  test("claim opens reservation view after save", async ({ page, baseURL }) => {
    const prop = await createProperty(page, `E2E Claim View ${Date.now()}`);

    await addCalendarLink(
      page,
      prop.id,
      "airbnb",
      `${baseURL}/api/test-fixtures/airbnb-sample`,
    );
    await triggerSync(page, prop.id);

    await page.goto(`/dashboard?property=${prop.id}&view=calendar`);
    await page.waitForLoadState("networkidle");

    // Click the synced bar
    // El evento puede cruzar un límite de semana (domingo) y renderizarse
    // como 2 segmentos con el mismo data-uid; cualquiera abre el mismo
    // claim popover, así que tomamos el primero.
    const bar = page.locator('[data-uid="airbnb-res-001@e2e"]').first();
    await expect(bar).toBeVisible({ timeout: 15_000 });
    await bar.click();

    // Claim
    await expect(page.getByText("Name this booking")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByTestId("claim-guest-name").fill("E2E Claimed Guest");
    await page.getByTestId("claim-save").click();

    // Fix 1b: URL must contain reservation= (navigate to guest view)
    await expect(page).toHaveURL(/reservation=\d+/, { timeout: 15_000 });

    // The reservation view should show the claimed name
    await expect(page.getByText("E2E Claimed Guest").first()).toBeVisible({
      timeout: 10_000,
    });

    // API assert: reservation exists with linkedEventUid + name + platform
    const apiRes = await page.request.get(
      `/api/reservations?propertyId=${prop.id}`,
    );
    expect(apiRes.ok()).toBe(true);
    const list = await apiRes.json();
    const claimed = list.find(
      (r: any) => r.linkedEventUid === "airbnb-res-001@e2e",
    );
    expect(claimed).toBeTruthy();
    expect(claimed.name).toBe("E2E Claimed Guest");
    expect(claimed.platform).toBe("airbnb");

    await deleteProperty(page, prop.id);
  });

  // ---- reserva manual aparece como "Direct", no Airbnb (B2) ----
  test("manual reservation defaults to Direct platform", async ({
    page,
  }) => {
    const prop = await createProperty(page, `E2E Direct Platform ${Date.now()}`);

    await page.goto(`/dashboard?property=${prop.id}&view=calendar`);
    await page.waitForLoadState("networkidle");

    // Select a free day
    const targetDate = isoDate(60);
    const cell = page.locator(`[data-date="${targetDate}"]`);
    await expect(cell).toBeVisible({ timeout: 15_000 });
    await cell.click();

    // Create reservation
    await expect(page.getByText("Create reservation").first()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByText("Create reservation").first().click();
    await page.getByTestId("res-guest-name").fill("Direct Booking E2E");
    await page.getByTestId("res-save").click();

    // API: platform must be "direct" (not "airbnb")
    const apiRes = await page.request.get(
      `/api/reservations?propertyId=${prop.id}`,
    );
    expect(apiRes.ok()).toBe(true);
    const list = await apiRes.json();
    const created = list.find((r: any) => r.name === "Direct Booking E2E");
    expect(created).toBeTruthy();
    expect(created.platform).toBe("direct");

    // Navigate to the reservation view and assert badge shows "Direct"
    await page.goto(
      `/dashboard?property=${prop.id}&reservation=${created.id}&view=guests`,
    );
    await page.waitForLoadState("networkidle");

    const badge = page.locator('[data-testid="res-platform-badge"]');
    await expect(badge).toBeVisible({ timeout: 10_000 });
    await expect(badge).toContainText("Direct");

    await deleteProperty(page, prop.id);
  });
});
