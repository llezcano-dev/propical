import { defineConfig } from "@playwright/test";
import path from "path";
import { E2E_BASE_URL } from "./e2e/fixtures/base-url";

const ROOT = path.resolve(__dirname);

export default defineConfig({
  globalSetup: path.join(ROOT, "e2e", "global-setup.ts"),
  testDir: path.join(ROOT, "e2e"),
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1, // SQLite no soporta escritura concurrente
  use: {
    baseURL: E2E_BASE_URL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: "/usr/bin/chromium",
    },
  },
  // Two projects split by auth requirement so login tests don't share
  // cookies with already-authenticated specs — and authenticated specs
  // never hit /api/auth/login, staying under the 5/60s rate limit.
  projects: [
    {
      name: "auth",
      testMatch: ["auth.spec.ts", "admin-gate.spec.ts", "superadmin-gates.spec.ts"],
      // No storageState → each test handles its own login/logout flow
    },
    {
      name: "authenticated",
      testMatch: ["calendar.spec.ts", "dashboard-onboarding.spec.ts", "cleaner-leak.spec.ts", "reports.spec.ts", "navbar.spec.ts", "visual.spec.ts", "visual-mobile.spec.ts", "a11y.spec.ts", "dashboard-reservations.spec.ts", "calendar-link-save.spec.ts"],
      use: {
        storageState: path.join(ROOT, "e2e", ".auth", "test-user.json"),
      },
    },
  ],
  // No webServer — start the dev server manually (e2e runs on :3001):
  //   DATABASE_URL=file:./data/test.db pnpm dev -- -p 3001
});
