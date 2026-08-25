import { test, expect, type Page } from "@playwright/test";
import { createProperty, deleteProperty, deleteAllProperties } from "./fixtures/property";

/**
 * Visual baseline — `toHaveScreenshot` light+dark.
 *
 * El baseline se genera ANTES de cualquier cambio visual; este spec es el que
 * fija esa línea base. Los PNGs son EFÍMEROS por rama (no se commitean — ver
 * .gitignore):
 *   1. Desde la base limpia, generar el baseline:
 *        ./scripts/run-e2e.sh visual.spec.ts --update-snapshots
 *   2. Aplicar los cambios → correr el spec de nuevo:
 *        ./scripts/run-e2e.sh visual.spec.ts
 *      Sin cambios visuales: PASS. Con cambios: FAIL — revisar los -diff.png.
 *   3. Al mergear, cleanup.sh borra los PNGs (efímeros); el baseline de la
 *      próxima tanda se regenera desde el nuevo main.
 *
 * Estabilidad:
 *  - Fecha fija con `page.clock` (el calendario renderiza de hoy−6 a hoy+12;
 *    sin clock congelado cada corrida tendría un mes distinto y el baseline
 *    fallaría por el calendario, no por un cambio real).
 *  - Datos determinísticos: se crea UNA propiedad vía API con un nombre fijo
 *    (no Date.now) para que el dashboard renderice el calendario real. Sin
 *    reservas → calendario vacío (estable) + reports/cleaning en su estado
 *    "sin datos" (determinístico). El baseline mide tokens/superficies, no
 *    contenido de negocios.
 *  - Home en DOS estados: "no properties" (borra todas las propiedades del
 *    usuario e2e → wizard de onboarding) y "with properties" (crea una →
 *    portfolio/resumen del dashboard, que es lo que `/dashboard` muestra sin
 *    `?property`). Así el baseline no depende del estado residual de la DB.
 *  - El usuario e2e (e2e@propical.com.br) es DEDICADO: distinto del usuario
 *    de dev (test@propical.com.br) que crea `pnpm db:seed-test-user` por
 *    defecto, para que el testeo manual no contamine los datos de e2e.
 *  - Dark: `addInitScript` fija `rt-theme=dark` en localStorage ANTES del boot
 *    script de layout.tsx, que entonces añade la clase `.dark` a <html>.
 */

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

/** Fecha fija: domingo 2026-03-15 (mes estable para el calendario). */
const FIXED_DATE = "2026-03-15T12:00:00";

async function gotoPage(page: Page, path: string) {
  // Fecha fija para el calendario, SIN instalar fake timers (install()
  // reemplaza setTimeout y pausa el fetching del dashboard). setFixedTime
  // solo congela Date.now/new Date — los timers siguen corriendo.
  await page.clock.setFixedTime(new Date(FIXED_DATE));
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  // Deja que hero-in / underline-draw y el fetching del dashboard terminen.
  await page.waitForTimeout(600);
  // Pausa el humo animado del logo (SMIL <animate> con repeatCount="indefinite"):
  // sin pausarlo cada corrida captura un frame aleatorio y el baseline falla
  // por la animación, no por un cambio real.
  await page.evaluate(() => {
    document.querySelectorAll("svg").forEach((svg) => {
      (svg as SVGSVGElement).pauseAnimations?.();
    });
  });
}

async function forceTheme(
  page: Page,
  theme: Theme,
) {
  await page.addInitScript((t: string) => {
    try {
      localStorage.setItem("rt-theme", t);
    } catch {
      /* localStorage puede no estar disponible en /login tras redirects */
    }
    const d = document.documentElement;
    d.classList.toggle("dark", t === "dark");
    d.style.colorScheme = t;
  }, theme);
}

test.describe("Visual baseline — marketing + auth", () => {
  for (const theme of THEMES) {
    test(`${theme} — home (no properties)`, async ({ page }) => {
      await forceTheme(page, theme);
      // Garantiza el estado "onboarding wizard" (cero propiedades) aunque
      // una corrida anterior haya dejado datos: el usuario e2e es dedicado
      // (e2e@propical.com.br), pero un test fallido a mitad de camino puede
      // dejar una propiedad sin limpiar.
      await deleteAllProperties(page);
      await gotoPage(page, "/");
      await expect(page.locator("body")).toBeVisible();
      await expect(page).toHaveScreenshot(`home-empty-${theme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test(`${theme} — home (with properties)`, async ({ page }) => {
      await forceTheme(page, theme);
      const prop = await createProperty(page, "Visual Baseline");
      try {
        await gotoPage(page, "/");
        await expect(page.locator("body")).toBeVisible();
        // El portfolio (dashboard sin ?property) renderiza las property cards
        // y el strip "Needs attention" tras el fetch de properties; esperar a
        // que aparezca el nombre de la propiedad creada antes de fotografiar.
        // (El calendario con [data-date] solo existe con ?property&view=calendar.)
        await expect(page.getByText("Visual Baseline", { exact: true }).first()).toBeVisible({
          timeout: 15_000,
        });
        // El strip "Needs attention" (propiedad sin calendarios conectados)
        // carga asíncrono tras el fetch de properties. Esperarlo fija el
        // estado del screenshot: sin esto el timing varía entre corridas y
        // el baseline es flaky (a veces el banner aparece, a veces no).
        await expect(page.getByText("Needs attention", { exact: true }).first()).toBeVisible({
          timeout: 15_000,
        });
        await expect(page).toHaveScreenshot(`home-props-${theme}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        });
      } finally {
        await deleteProperty(page, prop.id).catch(() => {});
      }
    });

    test(`${theme} — login`, async ({ page }) => {
      await forceTheme(page, theme);
      await gotoPage(page, "/login");
      await expect(page.locator("body")).toBeVisible();
      await expect(page).toHaveScreenshot(`login-${theme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe("Visual baseline — dashboard (authenticated)", () => {
  for (const theme of THEMES) {
    for (const view of ["calendar", "reports", "cleaning"] as const) {
      test(`${theme} — dashboard view=${view}`, async ({ page }) => {
        await forceTheme(page, theme);
        const prop = await createProperty(page, "Visual Baseline");
        try {
          await gotoPage(page, `/dashboard?property=${prop.id}&view=${view}`);
          await expect(page.locator("body")).toBeVisible();
          // El calendario monta de forma asíncrona tras el fetch; esperar a que
          // aparezca el grid de días antes de fotografiar.
          if (view === "calendar") {
            await expect(page.locator("[data-date]").first()).toBeVisible({
              timeout: 15_000,
            });
          }
          await expect(page).toHaveScreenshot(`dashboard-${view}-${theme}.png`, {
            fullPage: true,
            maxDiffPixelRatio: 0.01,
          });
        } finally {
          await deleteProperty(page, prop.id).catch(() => {});
        }
      });
    }
  }
});
