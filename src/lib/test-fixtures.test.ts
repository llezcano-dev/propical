import { describe, it, expect } from "vitest";
import { parseICal } from "./ical";
import {
  buildAirbnbIcal,
  buildBookingIcal,
  buildE2EAirbnbSample,
  buildFixtureIcal,
} from "./test-fixtures";

const WINDOW = { from: "2026-09-01", to: "2026-12-01" };

describe("test-fixtures", () => {
  it("airbnb fixture has stable, unique UIDs for a fixed window", () => {
    const a = parseICal(buildAirbnbIcal(WINDOW.from, WINDOW.to));
    const b = parseICal(buildAirbnbIcal(WINDOW.from, WINDOW.to));

    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b); // deterministic (parseICal drops DTSTAMP)
    expect(new Set(a.map((e) => e.uid)).size).toBe(a.length);
  });

  it("booking fixture is deterministic and includes block + CLOSED variants", () => {
    const events = parseICal(buildBookingIcal(WINDOW.from, WINDOW.to));

    expect(events.length).toBeGreaterThan(0);
    expect(new Set(events.map((e) => e.uid)).size).toBe(events.length);

    const summaries = events.map((e) => e.summary);
    expect(summaries).toContain("Reserved");
    expect(summaries).toContain("Not available");
    expect(summaries).toContain("CLOSED - Not available");
  });

  it("buildFixtureIcal strips the .ics suffix and dispatches", () => {
    expect(buildFixtureIcal("airbnb.ics")).toContain("VCALENDAR");
    expect(buildFixtureIcal("booking.ics")).toContain("VCALENDAR");
    expect(buildFixtureIcal("airbnb-sample.ics")).toContain(
      "airbnb-res-001@e2e",
    );
    expect(buildFixtureIcal("nope.ics")).toBeNull();
  });

  it("airbnb-sample keeps the relative-date e2e UIDs the claim tests rely on", () => {
    const ical = buildE2EAirbnbSample();
    expect(ical).toContain("airbnb-res-001@e2e");
    expect(ical).toContain("airbnb-res-002@e2e");
    expect(ical).toContain("airbnb-block-001@e2e");
    expect(ical).toContain("airbnb-res-003@e2e");
  });
});
