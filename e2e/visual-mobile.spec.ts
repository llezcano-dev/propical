import { test, expect, type Page } from "@playwright/test";

/**
 * Visual baseline mobile — `toHaveScreenshot` con viewport de teléfono
 * (390×844, iPhone 12/13/14) light+dark.
 *
 * Cubre las páginas de marketing donde el layout mobile importa: la home
 * (hero + secciones que colapsan a una columna) y el login (mark grande +
 * formulario). El dashboard es desktop-first y ya está cubierto por
 * visual.spec.ts en desktop.
 *
 * Mismo contrato que visual.spec.ts: PNGs efímeros por branch, fecha fija
 * con page.clock, tema forzado con addInitScript.
 */

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function gotoPage(page: Page, path: string) {
  await page.clock.setFixedTime(new Date("2026-03-15T12:00:00"));
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    document.querySelectorAll("svg").forEach((svg) => {
      (svg as SVGSVGElement).pauseAnimations?.();
    });
  });
}

async function forceTheme(page: Page, theme: Theme) {
  await page.addInitScript((t: string) => {
    try {
      localStorage.setItem("rt-theme", t);
    } catch {
      /* localStorage puede no estar disponible tras redirects */
    }
    const d = document.documentElement;
    d.classList.toggle("dark", t === "dark");
    d.style.colorScheme = t;
  }, theme);
}

test.describe("Visual baseline mobile — marketing", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  for (const theme of THEMES) {
    test(`${theme} — home (mobile)`, async ({ page }) => {
      await forceTheme(page, theme);
      await gotoPage(page, "/");
      await expect(page.locator("body")).toBeVisible();
      await expect(page).toHaveScreenshot(`mobile-home-${theme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test(`${theme} — login (mobile)`, async ({ page }) => {
      await forceTheme(page, theme);
      await gotoPage(page, "/login");
      await expect(page.locator("body")).toBeVisible();
      await expect(page).toHaveScreenshot(`mobile-login-${theme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});