/** Local-date YYYY-MM-DD formatter. Read paired with
 *  localMidnightFromDateStr: every Date it formats was constructed at
 *  LOCAL midnight, so getFullYear/getMonth/getDate round-trip the
 *  calendar date exactly in any timezone. Do NOT use it on raw UTC
 *  instants (new Date(r.checkIn) / toISOString()) — that shifts the
 *  day by ±1 in non-UTC timezones (B1 "claim +1 día" family). */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD of a Date read in UTC. Date-only ISO strings parse as UTC
 *  midnight (`new Date("2026-08-14")` → `2026-08-14T00:00:00Z`), and
 *  reservation timestamps come back from the DB as UTC instants
 *  (`2026-08-14T00:00:00.000Z`). Reading those with local getters
 *  (getFullYear / getDate) shifts the day by ±1 in non-UTC timezones —
 *  the B1 "claim +1 día" class of bugs. Reading UTC makes the round-trip
 *  date-string → Date → date-string lossless in every timezone. */
export function toUtcDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build a Date at LOCAL midnight from a YYYY-MM-DD string (or any
 *  string whose first 10 chars are YYYY-MM-DD, e.g. a full ISO instant).
 *  Pairs with local readers (toLocalDateStr / getFullYear / getDate): a
 *  local-midnight construction + local read round-trips the calendar
 *  date exactly, in any timezone. Use this where downstream code keeps
 *  Date objects for arithmetic (sorting, overlap) instead of comparing
 *  date strings directly. */
export function localMidnightFromDateStr(dateStr: string): Date {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00`);
}

/** Date-range dedup key for a Reservation against its iCal twin
 *  (ev.startDate|ev.endDate). Both are read with the LOCAL pairing
 *  (localMidnightFromDateStr → toLocalDateStr) so the key lands on the
 *  same calendar dates as the raw iCal event strings in ANY timezone —
 *  reading the UTC-instant checkIn/checkOut with local getters would
 *  drift the key one day in non-UTC timezones and the dashboard's
 *  silent-merge heuristic (and the claim dedup) would miss the match
 *  (B1 "claim +1 día" family). */
export function reservationDateKey(checkIn: string, checkOut: string): string {
  const start = toLocalDateStr(localMidnightFromDateStr(checkIn));
  const end = toLocalDateStr(localMidnightFromDateStr(checkOut));
  return `${start}|${end}`;
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().substring(0, 10);
}

export function timeToPercent(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return ((h * 60 + (m || 0)) / 1440) * 100;
}

/** Capitalize the first letter of a string ("august 2026" → "August
 *  2026"). toLocaleDateString month:"long" returns lowercase for some
 *  locales (en/pt/es) — headers should be capitalized. */
export function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
