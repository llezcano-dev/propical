/**
 * Reports — presets drive the axis range AND the CSV export (B6).
 *
 * The regression under test: a single [De, Até] range is the source of
 * truth for chart + table + KPIs + CSV (reports-panel.tsx). The presets
 * ("Predefinições") are shortcuts that move that range, so switching
 * 6M ↔ 12M must change the visible window — and the CSV export
 * (`/api/reservations/export?from&to`) must be CLIPPED to that same
 * range, not "everything".
 *
 * Setup: one property + two reservations in DIFFERENT months:
 *   - RECENT — 2 months back → inside the 6M window
 *   - OLD    — 8 months back → outside 6M, inside 12M
 *
 * Run with:  pnpm test:e2e reports.spec.ts
 */

import { test, expect, type Download } from "@playwright/test";
import { createProperty } from "./fixtures/property";
import { usePtLocale } from "./fixtures/locale";

const RUN_TS = Date.now();

const RECENT_NAME = `e2e-recent-${RUN_TS}`;
const OLD_NAME = `e2e-old-${RUN_TS}`;

/** A short stay (days 5–8) in the month that is `n` months before now. */
function stayInMonthAgo(n: number): { checkIn: string; checkOut: string } {
  const now = new Date();
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  return {
    checkIn: ymd(new Date(now.getFullYear(), now.getMonth() - n, 5)),
    checkOut: ymd(new Date(now.getFullYear(), now.getMonth() - n, 8)),
  };
}

/** First day of the month `n` months before now, as YYYY-MM-01. */
function monthStart(n: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * The exact "from – to" header the chart renders for a given preset
 * (mirrors reports-panel.tsx `rangeLabel`, pt locale — the e2e default).
 */
function rangeLabelText(presetMonths: number): string {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  });
  const now = new Date();
  const from = fmt.format(new Date(now.getFullYear(), now.getMonth() - presetMonths, 1));
  const to = fmt.format(new Date(now.getFullYear(), now.getMonth() + 6, 1));
  return `${from} – ${to}`;
}

async function readCsv(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += chunk.toString();
  return csv;
}

test.describe("Reports — presets + CSV correlation (B6)", () => {
  let propertyId: number;
  let recent: { checkIn: string; checkOut: string };
  let old: { checkIn: string; checkOut: string };

  test.beforeAll(async ({ request }) => {
    recent = stayInMonthAgo(2);
    old = stayInMonthAgo(8);

    const propRes = await request.post("/api/properties", {
      data: { name: `E3-Props-${RUN_TS}` },
    });
    expect(propRes.ok()).toBeTruthy();
    propertyId = (await propRes.json()).id;

    const r1 = await request.post("/api/reservations", {
      data: {
        name: RECENT_NAME,
        checkIn: recent.checkIn,
        checkOut: recent.checkOut,
        platform: "airbnb",
        propertyId,
      },
    });
    const r2 = await request.post("/api/reservations", {
      data: {
        name: OLD_NAME,
        checkIn: old.checkIn,
        checkOut: old.checkOut,
        platform: "booking",
        propertyId,
      },
    });
    expect(r1.ok()).toBeTruthy();
    expect(r2.ok()).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    await request.delete(`/api/properties/${propertyId}`);
  });

  test("6M vs 12M cambian el eje X y el CSV correlaciona con el rango activo", async ({
    page,
  }) => {
    await usePtLocale(page);
    await page.goto("/dashboard?view=reports");

    // Portfolio scope — the navbar dropdown shows the neutral entry.
    await expect(page.getByRole("button", { name: "Todas as propriedades" })).toBeVisible();

    // ── Default preset is 6M → the header shows the 6-month range ──
    await expect(page.getByText(rangeLabelText(6))).toBeVisible();

    // ── CSV bajo 6M: recorta lo que queda fuera (la reserva de 8 meses) ──
    const dl6Promise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar CSV" }).click();
    const dl6 = await dl6Promise;
    expect(dl6.url()).toContain(`from=${monthStart(6)}`);
    const csv6 = await readCsv(dl6);
    expect(csv6).toContain("propertyName,name,platform,checkIn,checkOut");
    expect(csv6).toContain(RECENT_NAME);
    expect(csv6).not.toContain(OLD_NAME);

    // ── Cambiar a 12M: el eje (header) se estira 12 meses atrás ──
    await page.getByRole("button", { name: "12M" }).click();
    await expect(page.getByText(rangeLabelText(12))).toBeVisible();
    await expect(page.getByText(rangeLabelText(6))).not.toBeVisible();

    // ── CSV bajo 12M: ahora sí incluye la reserva vieja ──
    const dl12Promise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar CSV" }).click();
    const dl12 = await dl12Promise;
    expect(dl12.url()).toContain(`from=${monthStart(12)}`);
    const csv12 = await readCsv(dl12);
    expect(csv12).toContain(RECENT_NAME);
    expect(csv12).toContain(OLD_NAME);

    // ── Volver a 6M: el CSV recorta de nuevo ──
    await page.getByRole("button", { name: "6M" }).click();
    await expect(page.getByText(rangeLabelText(6))).toBeVisible();
    const dl6bPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar CSV" }).click();
    const dl6b = await dl6bPromise;
    const csv6b = await readCsv(dl6b);
    expect(csv6b).toContain(RECENT_NAME);
    expect(csv6b).not.toContain(OLD_NAME);
  });
});
