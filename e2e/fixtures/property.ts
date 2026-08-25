import type { Page } from "@playwright/test";

/**
 * Property and calendar helpers for e2e tests.
 *
 * These use the REST API directly (page.request) for speed and reliability.
 * POST/PATCH/DELETE endpoints require a valid session cookie.
 */

export interface CreatedProperty {
  id: number;
  name: string;
  feedSlug?: string;
}

/**
 * Create a property via the REST API.
 */
export async function createProperty(
  page: Page,
  name: string,
): Promise<CreatedProperty> {
  const res = await page.request.post("/api/properties", {
    data: { name },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create property: ${res.status()} ${body}`);
  }
  return res.json();
}

/**
 * Delete a property via the REST API.
 */
export async function deleteProperty(
  page: Page,
  id: number,
): Promise<void> {
  await page.request.delete(`/api/properties/${id}`);
}

/**
 * Delete ALL properties of the current user via the REST API.
 *
 * Used by the visual baseline's "no properties" home test to guarantee
 * the onboarding wizard state regardless of leftovers from previous
 * runs (a leftover property would flip the dashboard to the calendar
 * and break the baseline).
 */
export async function deleteAllProperties(page: Page): Promise<void> {
  const res = await page.request.get("/api/properties");
  if (!res.ok) return;
  const props = (await res.json()) as Array<{ id: number }>;
  for (const p of props) {
    await page.request.delete(`/api/properties/${p.id}`);
  }
}

/**
 * Add a CalendarLink (platform iCal URL) to a property.
 */
export async function addCalendarLink(
  page: Page,
  propertyId: number,
  platform: string,
  icalExportUrl: string,
): Promise<unknown> {
  const res = await page.request.post("/api/calendar/links", {
    data: { propertyId, platform, icalExportUrl },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to add calendar link: ${res.status()} ${body}`);
  }
  return res.json();
}

/**
 * Trigger a manual sync for one property via the REST API.
 */
export async function triggerSync(
  page: Page,
  propertyId: number,
): Promise<unknown> {
  const res = await page.request.post("/api/calendar/sync", {
    data: { propertyId },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to trigger sync: ${res.status()} ${body}`);
  }
  return res.json();
}

/**
 * Test an iCal URL via the REST API (same as the wizard's "test" button).
 */
export async function testICalUrl(
  page: Page,
  url: string,
): Promise<unknown> {
  const res = await page.request.post("/api/calendar/test", {
    data: { url },
  });
  return res.json();
}

/**
 * Create a reservation via the REST API (same endpoint the manual
 * "Create reservation" flow uses). Dates are YYYY-MM-DD strings;
 * the API rejects overlapping reservations on the same property.
 */
export async function createReservation(
  page: Page,
  data: {
    propertyId: number;
    name: string;
    checkIn: string;
    checkOut: string;
    platform?: string;
  },
): Promise<unknown> {
  const res = await page.request.post("/api/reservations", { data });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create reservation: ${res.status()} ${body}`);
  }
  return res.json();
}

/**
 * Navigate to a property's calendar view.
 * Example: navigateToPropertyView(page, 1, "calendar")
 */
export async function navigateToPropertyView(
  page: Page,
  propertyId: number,
  view: string,
): Promise<void> {
  await page.goto(`/dashboard?property=${propertyId}&view=${view}`);
  await page.waitForLoadState("networkidle");
}
