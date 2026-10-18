/** Capitalize the first letter of a string ("august 2026" → "August
 *  2026"). toLocaleDateString month:"long" returns lowercase for some
 *  locales (en/pt/es) — headers should be capitalized. */
export function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
