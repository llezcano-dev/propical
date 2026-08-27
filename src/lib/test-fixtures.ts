/**
 * Deterministic iCal test fixtures served by `/api/test/ical/{platform}.ics`
 * (gated by `ENABLE_TEST_API` in production — see the route handler).
 *
 * Two families live here:
 *
 * 1. Realistic (airbnb, booking) — events on FIXED dates anchored to a
 *    constant epoch, with stable UIDs. Only the emitted window slides with
 *    "today", so new reservations appear as real time passes while old ones
 *    age out (calendar-sync.ts preserves past events in the DB — it only
 *    prunes upcoming events that vanish from the feed). Attach these in
 *    production to watch the sync/cron work organically.
 *
 * 2. Sample (airbnb-sample) — minimal, RELATIVE dates + stable `@e2e` UIDs,
 *    used by the e2e claim tests which assert exact `today+N` dates.
 *
 * No external deps, no storage — pure string/date math.
 */

type FixtureEvent = {
  uid: string;
  summary: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description?: string;
};

// Fixed anchor for realistic fixtures. Events sit on `EPOCH + i * SPACING`
// so their dates are stable across regenerations (only the window moves).
const EPOCH = "2026-01-01";
// One slot every 9 days leaves unbooked nights between reservations, so the
// feed reads as a normal host calendar rather than a wall of double-bookings.
const SPACING_DAYS = 9;
// Booking rides in the gap after each Airbnb slot (Airbnb ends at most +4).
const BOOKING_OFFSET_DAYS = 4;
// Deliberate conflict rate: every 20th booking slot (5%) overlaps the Airbnb
// event at the same index. Low so most reservations are clean, but conflict
// detection still gets occasional real cases. Remainder 3 means i%5===3, which
// is never an Airbnb block index, so conflicts are always reservation-on-reservation.
const CONFLICT_EVERY = 20;
const CONFLICT_AT = 3;

// ---------------------------------------------------------------------------
// Date helpers (calendar days, noon-UTC to dodge DST)
// ---------------------------------------------------------------------------

function toISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

function todayISO(): string {
  return toISODate(new Date());
}

function compactDate(iso: string): string {
  return iso.replace(/-/g, "");
}

// ---------------------------------------------------------------------------
// iCal rendering
// ---------------------------------------------------------------------------

/**
 * Fold a content line to the RFC 5545 max of 75 octets per physical line
 * (continuation lines are prefixed with a space). Needed for the long
 * DESCRIPTION values the realistic fixtures carry.
 */
function foldContentLine(line: string, maxBytes = 75): string[] {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let remaining = line;
  let first = true;

  while (remaining.length > 0) {
    const limit = first ? maxBytes : maxBytes - 1; // reserve 1 byte for the leading space
    let cut = remaining.length;
    while (cut > 0 && encoder.encode(remaining.slice(0, cut)).length > limit) {
      cut--;
    }
    if (cut <= 0) cut = 1;

    chunks.push(first ? remaining.slice(0, cut) : " " + remaining.slice(0, cut));
    remaining = remaining.slice(cut);
    first = false;
  }

  return chunks;
}

function formatDtStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

function renderICal(
  prodid: string,
  calName: string,
  events: FixtureEvent[],
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodid}`,
    `X-WR-CALNAME:${calName}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  const dtStamp = formatDtStamp(new Date());

  for (const ev of events) {
    const body: string[] = [
      "BEGIN:VEVENT",
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${compactDate(ev.startDate)}`,
      `DTEND;VALUE=DATE:${compactDate(ev.endDate)}`,
      `SUMMARY:${ev.summary}`,
      `UID:${ev.uid}`,
    ];
    if (ev.description) body.push(`DESCRIPTION:${ev.description}`);
    body.push("END:VEVENT");
    lines.push(...body.flatMap((line) => foldContentLine(line)));
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// Deterministic helpers for realistic metadata
// ---------------------------------------------------------------------------

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no 0/O/1/I

/** Stable 10-char reservation code (Airbnb-style URL segment). */
function reservationCode(i: number): string {
  let n = (i + 1) * 2654435761; // multiplicative spread
  let code = "";
  for (let k = 0; k < 10; k++) {
    code += CODE_ALPHABET[(n >>> 0) % CODE_ALPHABET.length];
    n = Math.imul(n, 1664525) + 1013904223;
  }
  return code;
}

/** Stable 4-digit phone tail for the DESCRIPTION payload. */
function phoneLast4(i: number): string {
  return String(1000 + ((i * 137) % 9000));
}

// ---------------------------------------------------------------------------
// Realistic builders
// ---------------------------------------------------------------------------

export function buildAirbnbIcal(fromISO: string, toISO: string): string {
  const events: FixtureEvent[] = [];
  for (let i = 0; ; i++) {
    const start = addDaysISO(EPOCH, i * SPACING_DAYS);
    if (start > toISO) break;

    if (i % 5 === 4) {
      // Multi-day "Not available" block (kept multi-day so the sync's
      // reflected-buffer filter doesn't drop it).
      const end = addDaysISO(start, 2);
      if (end < fromISO) continue;
      events.push({
        uid: `mock-airbnb-${i}@fixture`,
        summary: "Airbnb (Not available)",
        startDate: start,
        endDate: end,
      });
    } else {
      const end = addDaysISO(start, 2 + (i % 3)); // 2..4 nights
      if (end < fromISO) continue;
      events.push({
        uid: `mock-airbnb-${i}@fixture`,
        summary: "Reserved",
        startDate: start,
        endDate: end,
        description:
          `Reservation URL: https://www.airbnb.com/hosting/reservations/details/${reservationCode(i)}\\nPhone Number (Last 4 Digits): ${phoneLast4(i)}`,
      });
    }
  }
  return renderICal(
    "-//Airbnb Inc//Hosting Calendar 1.0//EN",
    "Airbnb Mock Calendar",
    events,
  );
}

function bookingEventAt(i: number) {
  const baseDay = i * SPACING_DAYS;

  // Deliberate low-probability conflict (5%): a booking reservation on the
  // same day as the Airbnb event at this index. Checked first so it overrides
  // the block pattern.
  if (i % CONFLICT_EVERY === CONFLICT_AT) {
    const start = addDaysISO(EPOCH, baseDay);
    return {
      start,
      duration: 3,
      summary: "Reserved",
      uid: `mock-booking-${i}@fixture`,
    };
  }

  const m = i % 5;
  if (m === 4) {
    // Manual 1-day block, isolated (next booking is 5+ days away) so the
    // reflected-buffer filter keeps it.
    const start = addDaysISO(EPOCH, baseDay + BOOKING_OFFSET_DAYS);
    return {
      start,
      duration: 1,
      summary: "Not available",
      uid: `blocked_${compactDate(start)}@booking.com`,
    };
  }
  if (m === 3) {
    const start = addDaysISO(EPOCH, baseDay + BOOKING_OFFSET_DAYS);
    return {
      start,
      duration: 2,
      summary: "CLOSED - Not available",
      uid: `mock-booking-${i}@fixture`,
    };
  }

  // Reserved in the gap after the Airbnb slot at this index.
  const start = addDaysISO(EPOCH, baseDay + BOOKING_OFFSET_DAYS);
  return {
    start,
    duration: 2 + (i % 3), // 2..4 nights
    summary: "Reserved",
    uid: `mock-booking-${i}@fixture`,
  };
}

export function buildBookingIcal(fromISO: string, toISO: string): string {
  const events: FixtureEvent[] = [];
  for (let i = 0; ; i++) {
    const ev = bookingEventAt(i);
    if (ev.start > toISO) break;
    const end = addDaysISO(ev.start, ev.duration);
    if (end < fromISO) continue;
    events.push({
      uid: ev.uid,
      summary: ev.summary,
      startDate: ev.start,
      endDate: end,
    });
  }
  return renderICal(
    "-//admin.booking.com\\, b.v.//NONSGML v1.0//EN",
    "Booking.com Mock Calendar",
    events,
  );
}

// ---------------------------------------------------------------------------
// e2e sample (relative dates, stable @e2e UIDs)
// ---------------------------------------------------------------------------

function e2eDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function buildE2EAirbnbSample(): string {
  const events = [
    { uid: "airbnb-res-001@e2e", summary: "Reserved", start: 2, end: 7 },
    { uid: "airbnb-res-002@e2e", summary: "Reserved", start: 10, end: 14 },
    { uid: "airbnb-block-001@e2e", summary: "Not available", start: 20, end: 22 },
    { uid: "airbnb-res-003@e2e", summary: "Reserved", start: 30, end: 36 },
  ];

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Propical E2E//Airbnb Sample//EN",
    "X-WR-CALNAME:Airbnb Sample (E2E)",
  ];

  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `SUMMARY:${ev.summary}`,
      `DTSTART;VALUE=DATE:${e2eDate(ev.start)}`,
      `DTEND;VALUE=DATE:${e2eDate(ev.end)}`,
      `DTSTAMP:${e2eDate(-15)}T000000Z`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Dispatcher used by the route handler
// ---------------------------------------------------------------------------

/**
 * Build the iCal for a raw platform segment (with or without `.ics`/`.ical`
 * suffix). Returns `null` for unknown platforms so the route can 404.
 */
export function buildFixtureIcal(rawPlatform: string): string | null {
  const platform = rawPlatform.replace(/\.(ics|ical)$/i, "");

  const today = todayISO();
  const fromISO = addDaysISO(today, -30);
  const toISO = addDaysISO(today, 150);

  switch (platform) {
    case "airbnb":
      return buildAirbnbIcal(fromISO, toISO);
    case "booking":
      return buildBookingIcal(fromISO, toISO);
    case "airbnb-sample":
      return buildE2EAirbnbSample();
    default:
      return null;
  }
}
