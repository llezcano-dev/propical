/**
 * DB helper to create cleaner-role users for cross-tenant leak tests.
 *
 * The signup API and POST /api/users hardcode role: "user", so there is
 * no way to create a cleaner via the HTTP API. The actual insert lives in
 * the standalone script e2e/fixtures/create-cleaner-user.ts, which must
 * run via tsx (the generated Prisma client uses `import.meta`, which the
 * Playwright loader can't process). This helper shells out to it — same
 * env pattern as e2e/fixtures/db.ts.
 *
 * SAFETY: The script only INSERTs a new row. It does NOT delete or
 * recreate the DB, so it is safe to call while the dev server is running.
 */

import { execSync } from "child_process";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");

/**
 * Create a user with role "cleaner" in the test database.
 * Returns the created user (id, username).
 */
export function createCleanerUser(
  username: string,
  password: string,
): { id: number; username: string } {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: "file:./data/test.db",
    NODE_ENV: "development",
    JWT_SECRET: "e2e-test-secret-do-not-use-in-production-32bytes",
  };

  const stdout = execSync(
    `npx tsx e2e/fixtures/create-cleaner-user.ts ${username} ${password}`,
    { cwd: ROOT, env, stdio: "pipe", encoding: "utf-8" },
  );

  const user = JSON.parse(stdout.trim()) as { id: number; username: string };
  console.log(`Cleaner user ready: ${user.username} (id=${user.id})`);
  return user;
}
