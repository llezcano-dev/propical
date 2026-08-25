import "dotenv/config";

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth";
import path from "node:path";

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test@propical.com.br";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "Test123456!";

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
  throw new Error("No database configured. Set DATABASE_URL=file:... or TURSO_DATABASE_URL.");
}

async function main() {
  const url = resolveDbUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const adapter = new PrismaLibSql({ url, authToken });
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: TEST_USER_EMAIL }, { email: TEST_USER_EMAIL }] },
      select: { id: true },
    });

    if (existing) {
      console.log(`Test user already exists: ${TEST_USER_EMAIL}`);
      return;
    }

    await prisma.user.create({
      data: {
        username: TEST_USER_EMAIL,
        email: TEST_USER_EMAIL,
        password: await hashPassword(TEST_USER_PASSWORD),
        role: "user",
      },
    });

    console.log(`Created test user: ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
