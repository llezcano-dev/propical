import { describe, it, expect } from "vitest";
import { buildCalendarExportText, type ExportInput } from "./calendar-export";
import type { Property, Reservation } from "@/lib/types";
import type { CalendarEvent, CalendarBar, ConflictInfo } from "./types";

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

function baseInput(overrides: Partial<ExportInput> = {}): ExportInput {
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
    today: new Date("2026-08-10T00:00:00"),
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

describe("buildCalendarExportText", () => {
  it("renders reservation dates as their UTC calendar dates", () => {
    const out = buildCalendarExportText(
      baseInput({ property: { ...baseInput().property, reservations: [reservation({})] } })
    );
    expect(out).toContain("[DIRECT] 2026-08-14 → 2026-08-16 | Guest | 0 guests");
  });

  it("sorts reservations by check-in", () => {
    const r2 = reservation({
      id: 2,
      name: "Zoe",
      checkIn: "2026-08-20T00:00:00.000Z",
      checkOut: "2026-08-22T00:00:00.000Z",
    });
    const r1 = reservation({ id: 1, name: "Ana", checkIn: "2026-08-05T00:00:00.000Z", checkOut: "2026-08-08T00:00:00.000Z" });
    const out = buildCalendarExportText(
      baseInput({ property: { ...baseInput().property, reservations: [r2, r1] } })
    );
    const aIdx = out.indexOf("[DIRECT] 2026-08-05");
    const bIdx = out.indexOf("[DIRECT] 2026-08-20");
    expect(aIdx).toBeGreaterThanOrEqual(0);
    expect(aIdx).toBeLessThan(bIdx);
  });

  it("includes guest counts when present", () => {
    const r = reservation({ _count: { guests: 3 } });
    const out = buildCalendarExportText(
      baseInput({ property: { ...baseInput().property, reservations: [r] } })
    );
    expect(out).toContain("| Guest | 3 guests");
  });

  it("lists future synced events using their raw date strings", () => {
    const ev: CalendarEvent = {
      id: 1,
      platform: "airbnb",
      uid: "evt-1",
      summary: "Iain",
      startDate: "2026-08-20",
      endDate: "2026-08-22",
    };
    const past: CalendarEvent = {
      ...ev,
      uid: "evt-past",
      summary: "Old",
      startDate: "2026-07-01",
      endDate: "2026-07-03",
    };
    const out = buildCalendarExportText(
      baseInput({ syncedEvents: [past, ev] })
    );
    expect(out).toContain("[AIRBNB] 2026-08-20 → 2026-08-22 | Iain | UID: evt-1");
    expect(out).not.toContain("evt-past");
  });

  it("emits reservation dates consistent with the iCal event section", () => {
    // The same stay represented as a claimed reservation (UTC instants)
    // and its twin iCal event (raw strings) must print the SAME dates —
    // that consistency is what the toUtcDateStr fix guarantees.
    const res = reservation({ checkIn: "2026-08-14T00:00:00.000Z", checkOut: "2026-08-16T00:00:00.000Z" });
    const ev: CalendarEvent = {
      id: 1,
      platform: "airbnb",
      uid: "evt-1",
      summary: "Reserved",
      startDate: "2026-08-14",
      endDate: "2026-08-16",
    };
    const out = buildCalendarExportText(
      baseInput({
        property: { ...baseInput().property, reservations: [res] },
        syncedEvents: [ev],
      })
    );
    expect(out).toContain("[DIRECT] 2026-08-14 → 2026-08-16 | Guest | 0 guests");
    expect(out).toContain("[AIRBNB] 2026-08-14 → 2026-08-16 | Reserved | UID: evt-1");
  });

  it("lists bars, cleaning days and conflicts", () => {
    const bar: CalendarBar = {
      startDate: "2026-08-14",
      endDate: "2026-08-16",
      name: "Guest",
      platform: "airbnb",
      reservationId: 1,
    };
    const conflict: ConflictInfo = {
      date: "2026-08-15",
      airbnbName: "Ana",
      bookingName: "Zoe",
    };
    const out = buildCalendarExportText(
      baseInput({
        property: { ...baseInput().property, reservations: [reservation({})] },
        bars: [bar],
        bufferDates: new Set(["2026-08-16"]),
        potentialDates: new Set(["2026-08-17"]),
        unbookableDates: new Set(["2026-08-18"]),
        conflicts: [conflict],
      })
    );
    expect(out).toContain('[AIRBNB] 2026-08-14 → 2026-08-16 | "Guest" | resId: 1');
    expect(out).toContain("2026-08-16");
    expect(out).toContain("2026-08-17");
    expect(out).toContain("2026-08-18");
    expect(out).toContain("⚠ 2026-08-15 | Airbnb: Ana | Booking: Zoe");
  });
});
