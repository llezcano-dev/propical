/**
 * Guard para `prisma/seed.ts` (hardening de superadmin).
 *
 * El seed crea o *resetea* el superadmin: si el usuario ya existe, le
 * sobreescribe la password y — cuando la password se genera al azar —
 * la imprime en stdout. Correr el seed en producción con el username
 * por defecto (`"admin"`) crea una cuenta con nombre predecible, y si
 * `admin` ya existe lo deja sin sesión y tira la password nueva a los
 * logs.
 *
 * Este guard es una función pura (el caller inyecta el env y el username
 * ya resuelto con trim) para poder unit-testearla sin tocar process.env.
 */
export interface SeedGuardInput {
  /** `process.env.NODE_ENV` — solo "production" activa el guard. */
  nodeEnv?: string;
  /** Username del superadmin ya resuelto (post-trim). */
  username: string;
}

export function assertSeedAllowsSuperadmin({
  nodeEnv = process.env.NODE_ENV,
  username,
}: SeedGuardInput): void {
  // Comparación case-insensitive: "Admin"/"ADMIN" son tan predecibles
  // como "admin" y hoy en día el default de SEED_ADMIN_USERNAME es
  // exactamente "admin".
  if (nodeEnv === "production" && username.trim().toLowerCase() === "admin") {
    throw new Error(
      'Refusing to seed a superadmin named "admin" in production. ' +
        "Set SEED_ADMIN_USERNAME to a non-default value (and SEED_ADMIN_PASSWORD " +
        "to a strong password) before running the seed."
    );
  }
}
