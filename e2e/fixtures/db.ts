import { execSync } from "child_process";
import path from "path";
import { unlinkSync, existsSync } from "fs";

const ROOT = path.resolve(__dirname, "../..");

/**
 * Remove the test database so the next seed starts clean.
 */
export function resetTestDb(): void {
  const dbPath = path.join(ROOT, "data", "test.db");
  const journalPath = `${dbPath}-journal`;

  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
  if (existsSync(journalPath)) {
    unlinkSync(journalPath);
  }
}

/**
 * Push the Prisma schema and seed a test user into the test database.
 *
 * Uses the same env vars that `playwright.config.ts` passes to the
 * webServer: DATABASE_URL, NODE_ENV, JWT_SECRET.
 */
export function seedTestDb(): void {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: "file:./data/test.db",
    NODE_ENV: "development",
    JWT_SECRET: "e2e-test-secret-do-not-use-in-production-32bytes",
    TEST_USER_EMAIL: "e2e@propical.com.br",
    TEST_USER_PASSWORD: "E2eTest123456!",
  };

  execSync("pnpm db:push", { cwd: ROOT, env, stdio: "pipe" });
  execSync("pnpm db:seed-test-user", { cwd: ROOT, env, stdio: "pipe" });
}
