/**
 * Base URL del server e2e.
 *
 * Default: http://localhost:3001 — el dev server del usuario vive en :3000,
 * así el e2e no choca con él. Se puede overridear con E2E_BASE_URL (o
 * E2E_PORT en run-e2e.sh, que exporta E2E_BASE_URL).
 */
export const E2E_BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3001";