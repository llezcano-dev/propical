/**
 * Synchronous platform metadata helpers — safe for Client Components.
 * No DB imports, no async code. The DB-backed cache lives in platforms.ts.
 */

export interface PlatformPreset {
  slug: string;
  displayName: string;
  color: string;
  iconUrl: string | null;
  defaultBufferBefore: number;
  defaultBufferAfter: number;
  importInstructionsKey: string | null;
  exportInstructionsKey: string | null;
  isCustom: boolean;
  enabled: boolean;
  sortOrder: number;
}

export const FALLBACK_PLATFORM_COLOR = "#6B7280";

function preset(
  slug: string,
  displayName: string,
  color: string,
  sortOrder: number,
  overrides?: Partial<PlatformPreset>,
): PlatformPreset {
  return {
    slug,
    displayName,
    color,
    iconUrl: null,
    defaultBufferBefore: 1,
    defaultBufferAfter: 1,
    importInstructionsKey: `platform.${slug}.import`,
    exportInstructionsKey: `platform.${slug}.export`,
    isCustom: false,
    enabled: true,
    sortOrder,
    ...overrides,
  };
}

export const PLATFORM_PRESETS: ReadonlyArray<PlatformPreset> = [
  preset("airbnb", "Airbnb", "#FF385C", 10),
  preset("booking", "Booking.com", "#003580", 20),
  preset("vrbo", "Vrbo", "#245ABC", 30),
  preset("expedia", "Expedia", "#FFC72C", 40),
  preset("hostaway", "Hostaway", "#2E5BFF", 50),
  preset("lodgify", "Lodgify", "#00B5AD", 60),
  preset("hospitable", "Hospitable", "#1B5E20", 70),
  preset("smoobu", "Smoobu", "#4A148C", 80),
  preset("houfy", "Houfy", "#D84315", 90),
  preset("plumguide", "Plum Guide", "#2E1065", 100),
  preset("whimstay", "Whimstay", "#FF7043", 110),
  preset("direct", "Direct", FALLBACK_PLATFORM_COLOR, 200, {
    defaultBufferBefore: 0,
    defaultBufferAfter: 0,
  }),
];

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizePlatformSlug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function isValidPlatformSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function resolvePlatformColor(color: string | null | undefined): string {
  if (!color) return FALLBACK_PLATFORM_COLOR;
  return HEX_COLOR_RE.test(color) ? color : FALLBACK_PLATFORM_COLOR;
}

export function resolvePlatformMeta(slug: string): {
  slug: string;
  displayName: string;
  shortLabel: string;
  color: string;
} {
  const preset = PLATFORM_PRESETS.find((p) => p.slug === slug);
  if (preset) {
    const shortLabel =
      preset.displayName === "Booking.com" ? "Booking" : preset.displayName;
    return {
      slug: preset.slug,
      displayName: preset.displayName,
      shortLabel,
      color: preset.color,
    };
  }
  const cap = slug.charAt(0).toUpperCase() + slug.slice(1);
  return { slug, displayName: cap, shortLabel: cap, color: FALLBACK_PLATFORM_COLOR };
}
