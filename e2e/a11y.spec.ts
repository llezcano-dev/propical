/**
 * a11y.spec.ts — Auditoría de accesibilidad.
 *
 * Axe AA sobre las páginas clave del sitio, light + dark:
 *   - `/` (home marketing, en contexto autenticado igual que el baseline)
 *   - `/login` (contexto fresco, sin auth — la versión real de la página)
 *   - `/dashboard?property=…&view=calendar|reports|cleaning`
 *
 * Objetivo: diff-0 de violaciones axe (serious/critical) en CI.
 */
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProperty, deleteProperty } from "./fixtures/property";

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

/** Pina el tema via addInitScript (mismo patrón que visual.spec.ts). */
function forceTheme(page: Page, theme: Theme) {
  return page.addInitScript((t: string) => {
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

async function analyze(page: Page) {
  const results = await new AxeBuilder({ page })
    // Reglas ruidosas fuera del objetivo de M6:
    //  - `region`: estructura de landmarks de páginas largas (dashboard),
    //    fuera del alcance de una verificación de contraste/tipografía.
    //  - `color-contrast` se audita por token en tokens.test.ts (unit, CI);
    //    acá se deja activo igual — si aparece, es un regresión real.
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(["region"])
    .analyze();
  return results;
}

test.describe("A11y — home (marketing)", () => {
  for (const theme of THEMES) {
    test(`${theme} — home`, async ({ page }) => {
      await forceTheme(page, theme);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const results = await analyze(page);
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("A11y — login (contexto fresco)", () => {
  for (const theme of THEMES) {
    test(`${theme} — login`, async ({ browser }) => {
      const context: BrowserContext = await browser.newContext();
      const page: Page = await context.newPage();
      await forceTheme(page, theme);
      try {
        await page.goto("/login");
        await page.waitForLoadState("networkidle");
        const results = await analyze(page);
        expect(results.violations).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }
});

test.describe("A11y — dashboard (authenticated)", () => {
  for (const theme of THEMES) {
    for (const view of ["calendar", "reports", "cleaning"] as const) {
      test(`${theme} — view=${view}`, async ({ page }) => {
        await forceTheme(page, theme);
        const prop = await createProperty(page, "A11y Baseline");
        try {
          await page.goto(`/dashboard?property=${prop.id}&view=${view}`);
          await page.waitForLoadState("networkidle");
          // El calendario monta de forma asíncrona tras el fetch.
          if (view === "calendar") {
            await expect(page.locator("[data-date]").first()).toBeVisible({
              timeout: 15_000,
            });
          }
          const results = await analyze(page);
          expect(results.violations).toEqual([]);
        } finally {
          await deleteProperty(page, prop.id).catch(() => {});
        }
      });
    }
  }
});
