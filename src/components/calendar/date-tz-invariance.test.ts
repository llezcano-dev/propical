import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { toUtcDateStr, toLocalDateStr, localMidnightFromDateStr, reservationDateKey } from "./utils";
import { getExtendableBookings } from "./extendable-bookings";
import { buildCalendarExportText, type ExportInput } from "./calendar-export";
import type { CalendarEvent } from "./types";
import type { Property, Reservation } from "@/lib/types";

/**
 * Timezone-invariance matrix (B1 family).
 *
 * The whole B1 bug class is: reading a UTC instant (reservation
 * checkIn/checkOut, `2026-08-14T00:00:00.000Z`) with LOCAL getters
 * shifts the calendar day by ±1 in non-UTC timezones. These tests run
 * the date helpers and the two newly-fixed call sites under several
 * real timezones and assert the OUTPUT is byte-identical in all of
 * them — the property the fix is supposed to guarantee.
 *
 * Vitest runs each test file in its own worker, so mutating
 * process.env.TZ here never leaks into other test files. Node reads
 * TZ dynamically (Linux), so switching mid-file works.
 */

const TEST_TZS = [
  "America/Argentina/Buenos_Aires", // UTC-3 (negative offset — the original repro)
  "Asia/Tokyo", // UTC+9 (positive offset)
  "UTC", // reference frame
  "Europe/Madrid", // UTC+1/+2 (positive, host-side typical)
] as const;

function reservation(overrides: Partial<Reservation>): Reservation {
  return {
    id: 1,
    name: "Guest",
    checkIn: "2026-08-14T00:00:00.000Z",
    checkOut: "2026-08-16T00:00:00.000Z",
    platform: "direct",
    propertyId: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 1,
    platform: "airbnb",
    uid: "evt-1",
    summary: "Iain",
    startDate: "2026-08-14",
    endDate: "2026-08-16",
    ...overrides,
  };
}

function exportInput(overrides: Partial<ExportInput> = {}): ExportInput {
  const property: Property = {
    id: 1,
    userId: 1,
    name: "Casa Ubatuba",
    minNights: 3,
    checkInTime: "15:00",
    checkOutTime: "12:00",
    bookingWindow: 365,
    cleaningEnabled: true,
    feedToken: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    reservations: [],
  };
  return {
    property,
    monthLabel: "August 2026",
    today: localMidnightFromDateStr("2026-08-10"),
    syncedEvents: [],
    links: [],
    bars: [],
    bufferDates: new Set(),
    potentialDates: new Set(),
    unbookableDates: new Set(),
    conflicts: [],
    ...overrides,
  };
}

// Save/restore the ambient TZ around every test so a failure can't leak.
let originalTz: string | undefined;
beforeEach(() => {
  originalTz = process.env.TZ;
});
afterEach(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe.each(TEST_TZS)("B1 timezone invariance under %s", (tz) => {
  beforeEach(() => {
    process.env.TZ = tz;
  });

  it("setup sanity: the local reader really shifts the day in negative-offset zones", () => {
    // Demonstrates the BUG the fix targets: the raw UTC instant reads as
    // Aug 13 in Buenos Aires with local getters, Aug 14 elsewhere.
    const localDay = new Date("2026-08-14T00:00:00.000Z").getDate();
    if (tz === "America/Argentina/Buenos_Aires") {
      expect(localDay).toBe(13);
    } else {
      expect(localDay).toBe(14);
    }
  });

  it("toUtcDateStr reads a UTC-instant reservation as its true calendar date", () => {
    expect(toUtcDateStr(new Date("2026-08-14T00:00:00.000Z"))).toBe("2026-08-14");
    expect(toUtcDateStr(new Date("2026-08-16T00:00:00.000Z"))).toBe("2026-08-16");
    // Late-evening UTC instant must not bleed into the next day.
    expect(toUtcDateStr(new Date("2026-08-14T23:59:59.999Z"))).toBe("2026-08-14");
  });

  it("localMidnightFromDateStr + toLocalDateStr round-trip the calendar date", () => {
    expect(toLocalDateStr(localMidnightFromDateStr("2026-08-14"))).toBe("2026-08-14");
    expect(toLocalDateStr(localMidnightFromDateStr("2026-08-14T00:00:00.000Z"))).toBe("2026-08-14");
    // Year boundary survives the local-midnight construction in any zone.
    expect(toLocalDateStr(localMidnightFromDateStr("2026-01-01"))).toBe("2026-01-01");
  });

  it("reservationDateKey lands on the same dates as the raw iCal twin", () => {
    // This is THE dedup contract: the reservation key must byte-match
    // ev.startDate|ev.endDate ("2026-08-14|2026-08-16") or the dashboard
    // silent-merge misses the twin and the claim shows twice.
    const key = reservationDateKey("2026-08-14T00:00:00.000Z", "2026-08-16T00:00:00.000Z");
    expect(key).toBe("2026-08-14|2026-08-16");
  });

  it("getExtendableBookings offers the before-extension for a UTC-instant reservation", () => {
    // Clicking Aug 13 must offer "extend before" on the Aug 14 reservation
    // in EVERY timezone — the exact failure the host hit when extending.
    const result = getExtendableBookings("2026-08-13", "2026-08-13", [], [reservation({})]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      reservationId: 1,
      side: "before",
      bookingStart: "2026-08-14",
      bookingEnd: "2026-08-16",
    });
  });

  it("getExtendableBookings after-rule matches checkOut + 1 in every timezone", () => {
    const result = getExtendableBookings("2026-08-17", "2026-08-17", [], [reservation({})]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ reservationId: 1, side: "after" });
  });

  it("calendar export shows the reservation on the same day as its iCal twin", () => {
    const out = buildCalendarExportText(
      exportInput({
        property: {
          ...exportInput().property,
          reservations: [reservation({ name: "Guest" })],
        },
        syncedEvents: [event({ uid: "evt-1", summary: "Reserved" })],
      })
    );
    expect(out).toContain("[DIRECT] 2026-08-14 → 2026-08-16 | Guest | 0 guests");
    expect(out).toContain("[AIRBNB] 2026-08-14 → 2026-08-16 | Reserved | UID: evt-1");
  });

  it("calendar export future-events filter uses the local-today cutoff", () => {
    const past = event({ uid: "evt-past", startDate: "2026-07-01", endDate: "2026-07-03" });
    const upcoming = event({ uid: "evt-up", startDate: "2026-08-20", endDate: "2026-08-22" });
    const out = buildCalendarExportText(
      exportInput({
        today: localMidnightFromDateStr("2026-08-10"),
        syncedEvents: [past, upcoming],
      })
    );
    expect(out).not.toContain("evt-past");
    expect(out).toContain("evt-up");
  });
});
