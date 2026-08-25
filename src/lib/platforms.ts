/**
 * Calendar platform preset registry — async / DB-backed half.
 *
 * Synchronous helpers (normalizePlatformSlug, resolvePlatformMeta, etc.)
 * live in platform-meta.ts so Client Components can import them without
 * pulling prisma into the browser bundle.
 */

export {
  FALLBACK_PLATFORM_COLOR,
  PLATFORM_PRESETS,
  normalizePlatformSlug,
  isValidPlatformSlug,
  resolvePlatformColor,
  resolvePlatformMeta,
} from "./platform-meta";

import { PLATFORM_PRESETS, resolvePlatformColor, type PlatformPreset } from "./platform-meta";

const CACHE_TTL_MS = 60_000;

interface CacheState {
  expiresAt: number;
  bySlug: Map<string, PlatformPreset>;
  ordered: PlatformPreset[];
}

let cache: CacheState | null = null;

async function loadCache(): Promise<CacheState> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache;

  let rows: PlatformPreset[];
  try {
    const { prisma } = await import("@/lib/prisma");
    const dbRows = await prisma.calendarPlatform.findMany({
      orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
    });
    rows = dbRows.map((r) => ({
      slug: r.slug,
      displayName: r.displayName,
      color: resolvePlatformColor(r.color),
      iconUrl: r.iconUrl,
      defaultBufferBefore: r.defaultBufferBefore,
      defaultBufferAfter: r.defaultBufferAfter,
      importInstructionsKey: r.importInstructionsKey,
      exportInstructionsKey: r.exportInstructionsKey,
      isCustom: r.isCustom,
      enabled: r.enabled,
      sortOrder: r.sortOrder,
    }));
  } catch {
    rows = PLATFORM_PRESETS.map((p) => ({ ...p }));
  }

  if (rows.length === 0) {
    rows = PLATFORM_PRESETS.map((p) => ({ ...p }));
  }

  const bySlug = new Map(rows.map((p) => [p.slug, p]));
  cache = { expiresAt: now + CACHE_TTL_MS, bySlug, ordered: rows };
  return cache;
}

export function invalidatePlatformCache(): void {
  cache = null;
}
