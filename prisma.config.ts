import "dotenv/config";
import { defineConfig } from "prisma/config";

// Resolve the database URL the same way src/lib/prisma.ts does:
// local SQLite via DATABASE_URL=file:..., or Turso via TURSO_DATABASE_URL.
function resolveUrl(): string | undefined {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl?.startsWith("file:")) return dbUrl;
  return process.env.TURSO_DATABASE_URL;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolveUrl(),
  },
});
