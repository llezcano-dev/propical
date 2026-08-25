import { describe, it, expect } from "vitest";
import { toUtcDateStr, toLocalDateStr, localMidnightFromDateStr, reservationDateKey } from "./utils";

describe("toUtcDateStr", () => {
  it("round-trips a date-only string parsed as UTC midnight", () => {
    expect(toUtcDateStr(new Date("2026-08-14"))).toBe("2026-08-14");
  });

  it("reads a UTC instant (DB serialization) as its calendar date", () => {
    expect(toUtcDateStr(new Date("2026-08-14T00:00:00.000Z"))).toBe("2026-08-14");
  });

  it("reads noon-UTC instants (test fixtures) without drift", () => {
    expect(toUtcDateStr(new Date("2026-08-14T12:00:00.000Z"))).toBe("2026-08-14");
  });

  it("pads month and day", () => {
    expect(toUtcDateStr(new Date("2026-01-05T00:00:00Z"))).toBe("2026-01-05");
    expect(toUtcDateStr(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12-31");
  });

  it("is timezone-independent: the UTC calendar date never shifts", () => {
    // Late-evening UTC instant → still Aug 14 in UTC (local UTC-3 would
    // already read Aug 13 with local getters — the B1 class bug).
    expect(toUtcDateStr(new Date("2026-08-14T23:30:00.000Z"))).toBe("2026-08-14");
    // 00:30 UTC of the 15th → still Aug 15 (local UTC-3 would read Aug 14).
    expect(toUtcDateStr(new Date("2026-08-15T00:30:00.000Z"))).toBe("2026-08-15");
  });

  it("handles the year/month boundary", () => {
    expect(toUtcDateStr(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
    expect(toUtcDateStr(new Date("2025-12-31T23:59:59Z"))).toBe("2025-12-31");
  });
});

describe("localMidnightFromDateStr", () => {
  it("builds a Date at local midnight from a date-only string", () => {
    const d = localMidnightFromDateStr("2026-08-14");
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(14);
  });

  it("takes the first 10 chars from a full ISO instant", () => {
    const d = localMidnightFromDateStr("2026-08-14T00:00:00.000Z");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(14);
  });

  it("round-trips with the local reader to the same calendar date", () => {
    expect(toLocalDateStr(localMidnightFromDateStr("2026-08-14"))).toBe("2026-08-14");
    expect(toLocalDateStr(localMidnightFromDateStr("2026-01-05T00:00:00.000Z"))).toBe("2026-01-05");
    expect(toLocalDateStr(localMidnightFromDateStr("2026-12-31"))).toBe("2026-12-31");
  });
});

describe("reservationDateKey", () => {
  it("builds a start|end key from UTC-instant checkIn/checkOut", () => {
    expect(reservationDateKey("2026-08-14T00:00:00.000Z", "2026-08-16T00:00:00.000Z")).toBe(
      "2026-08-14|2026-08-16"
    );
  });

  it("matches the raw iCal event key it dedups against", () => {
    // The dashboard's silent-merge heuristic compares this key against
    // ev.startDate|ev.endDate — they must be byte-identical.
    const key = reservationDateKey("2026-08-14T00:00:00.000Z", "2026-08-16T00:00:00.000Z");
    expect(key).toBe("2026-08-14|2026-08-16");
  });

  it("handles date-only strings and year boundaries", () => {
    expect(reservationDateKey("2025-12-31", "2026-01-02")).toBe("2025-12-31|2026-01-02");
  });
});
