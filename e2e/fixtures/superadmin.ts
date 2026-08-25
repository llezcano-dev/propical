/**
 * Superadmin helpers for e2e gate specs (E1 + E2).
 *
 * Two concerns, both rate-limit-safe:
 *
 * 1. User creation — there is no HTTP API that creates a "superadmin"
 *    (signup and POST /api/users hardcode role "user"), so the insert
 *    lives in the standalone script create-superadmin-user.ts and runs
 *    via tsx (same execSync pattern as cleaner.ts).
 *
 * 2. Session — instead of hitting /api/auth/login (the 5/60s bucket is
 *    already near its limit: global-setup + auth.spec use 4 of 5 slots),
 *    we MINT a session JWT with `jose` and drop it straight into the
 *    context cookie jar. The dev server runs with a fixed JWT_SECRET
 *    (run-e2e.sh), so the token verifies. This exercises the exact
 *    permission checks (getSession → role) without touching the login
 *    endpoint at all.
 */

import { execSync } from "child_process";
import path from "path";
import { SignJWT } from "jose";
import type { BrowserContext } from "@playwright/test";
import { E2E_BASE_URL } from "./base-url";

const ROOT = path.resolve(__dirname, "../..");
// Must match run-e2e.sh — the dev server signs/verifies sessions with it.
const SESSION_SECRET = "e2e-test-secret-do-not-use-in-production-32bytes";
const COOKIE_NAME = "propical-session";

interface CreatedUser {
  id: number;
  username: string;
}

function runCreateScript(username: string, password: string, role: string): CreatedUser {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: "file:./data/test.db",
    NODE_ENV: "development",
    JWT_SECRET: SESSION_SECRET,
  };
  const stdout = execSync(
    `npx tsx e2e/fixtures/create-superadmin-user.ts ${username} ${password} ${role}`,
    { cwd: ROOT, env, stdio: "pipe", encoding: "utf-8" },
  );
  return JSON.parse(stdout.trim()) as CreatedUser;
}

/** Create a superadmin row directly in the test DB. */
export function createSuperadminUser(
  username: string,
  password: string,
): CreatedUser {
  const user = runCreateScript(username, password, "superadmin");
  console.log(`Superadmin user ready: ${user.username} (id=${user.id})`);
  return user;
}

/** Create a throwaway non-superadmin row (e.g. a suspend-gate target). */
export function createUserWithRole(
  username: string,
  password: string,
  role: string,
): CreatedUser {
  return runCreateScript(username, password, role);
}

/**
 * Drop a session cookie for `user` (with the given role) into `context`.
 * Call before navigating / issuing page.request calls so the session is
 * picked up. Avoids the login rate-limit bucket entirely.
 */
export async function setSession(
  context: BrowserContext,
  user: CreatedUser,
  role: string,
): Promise<void> {
  const token = await new SignJWT({ userId: user.id, username: user.username, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(SESSION_SECRET));

  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      url: E2E_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
      // No explicit `path`: with `url` present Playwright derives the
      // domain and defaults the path to "/" — passing both is rejected.
    },
  ]);
}
