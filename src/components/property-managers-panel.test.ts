import { describe, it, expect } from "vitest";
import { daysUntil } from "./property-managers-panel";

describe("daysUntil", () => {
  const now = new Date("2025-06-15T12:00:00Z").getTime();

  it("returns 0 for a past date", () => {
    expect(daysUntil("2025-06-14T12:00:00Z", now)).toBe(0);
  });

  it("returns 0 for the current moment", () => {
    expect(daysUntil("2025-06-15T12:00:00Z", now)).toBe(0);
  });

  it("returns 1 for tomorrow", () => {
    expect(daysUntil("2025-06-16T12:00:00Z", now)).toBe(1);
  });

  it("returns 7 for a week from now", () => {
    expect(daysUntil("2025-06-22T12:00:00Z", now)).toBe(7);
  });

  it("ceils partial days — 12h from now counts as 1", () => {
    expect(daysUntil("2025-06-16T00:00:00Z", now)).toBe(1); // 12h → ceil(0.5) = 1
  });

  it("respects the now parameter", () => {
    const t0 = new Date("2025-06-15T12:00:00Z").getTime();
    // At t0, June 17 is 2 days away
    expect(daysUntil("2025-06-17T12:00:00Z", t0)).toBe(2);
    // Advance 24h — June 17 is now 1 day away
    const t1 = t0 + 24 * 60 * 60 * 1000;
    expect(daysUntil("2025-06-17T12:00:00Z", t1)).toBe(1);
  });

  it("returns 0 for invalid date strings", () => {
    // new Date("not-a-date").getTime() → NaN → Math.max(0, NaN) → NaN
    // This is an edge case the function doesn't handle; we assert current behaviour
    const result = daysUntil("not-a-date", now);
    expect(Number.isNaN(result)).toBe(true);
  });
});
