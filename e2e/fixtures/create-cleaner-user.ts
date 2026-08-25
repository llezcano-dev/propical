/**
 * Standalone script: create a user with role "cleaner" in the test DB.
 *
 * Run via tsx (NOT imported by Playwright — the generated Prisma client
 * uses `import.meta`, which the Playwright loader can't process):
 *
 *   npx tsx e2e/fixtures/create-cleaner-user.ts <username> <password>
 *
 * Prints the created user as JSON on stdout:
 *   {"id": 1, "username": "e2e-cleaner-..."}
 *
 * SAFETY: INSERTs a new row only. It does NOT delete or recreate the DB,
 * so it is safe to run while the dev server is up.
 */
import "dotenv/config";

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/lib/auth";
import path from "node:path";

function resolveDbUrl(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl?.startsWith("file:")) {
    const rel = dbUrl.slice("file:".length);
    const abs = path.isAbsolute(rel) ? rel : path.resolve(process.cwd(), rel);
    return `file:${abs}`;
  }
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  throw new Error(
    "No database configured. Set DATABASE_URL=file:... or TURSO_DATABASE_URL.",
  );
}

async function main() {
  const [, , username, password] = process.argv;
  if (!username || !password) {
    console.error("Usage: npx tsx create-cleaner-user.ts <username> <password>");
    process.exit(1);
  }

  const url = resolveDbUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const adapter = new PrismaLibSql({ url, authToken });
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findFirst({
      where: { username },
      select: { id: true, username: true },
    });
    if (existing) {
      console.log(JSON.stringify(existing));
      return;
    }

    const user = await prisma.user.create({
      data: {
        username,
        email: `${username}@e2e-test.invalid`,
        password: await hashPassword(password),
        role: "cleaner",
      },
      select: { id: true, username: true },
    });

    console.log(JSON.stringify(user));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
