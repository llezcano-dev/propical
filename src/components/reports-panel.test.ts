import { describe, it, expect } from "vitest";
import { presetRange, buildMonthRange } from "./reports-panel";

// Fixed reference date so the preset math is deterministic in tests.
// (buildMonthRange's isPast/isCurrent flags use the real clock — the
// relevant test below computes expectations relative to "now".)
const TODAY = new Date(2026, 7, 14); // Aug 14 2026

describe("presetRange (period presets → exact window)", () => {
  it("3M: from = 3 months back, to = end of the 6th future month", () => {
    const r = presetRange(3, [], TODAY);
    expect(r.from).toBe("2026-05-01");
    expect(r.to).toBe("2027-02-28"); // end of Feb 2027
  });

  it("6M: from = 6 months back", () => {
    const r = presetRange(6, [], TODAY);
    expect(r.from).toBe("2026-02-01");
  });

  it("12M: past edge is EXACT even with no stays older than 6 months", () => {
    // The regression: 6/12/24 used to collapse onto the earliest stay.
    const r = presetRange(12, [], TODAY);
    expect(r.from).toBe("2025-08-01");
  });

  it("24M: past edge reaches 24 months back", () => {
    const r = presetRange(24, [], TODAY);
    expect(r.from).toBe("2024-08-01");
  });

  it("all: from = earliest stay's month, regardless of age", () => {
    const stays = [
      { start: "2024-03-10", end: "2024-03-14", platform: "direct", propertyId: 1 },
      { start: "2026-07-01", end: "2026-07-05", platform: "airbnb", propertyId: 1 },
    ];
    const r = presetRange("all", stays, TODAY);
    expect(r.from).toBe("2024-03-01");
    expect(r.to).toBe("2027-02-28");
  });

  it("all with no stays: from = current month", () => {
    const r = presetRange("all", [], TODAY);
    expect(r.from).toBe("2026-08-01");
  });

  it("future edge is always exactly today+6 (never stretched by a far-future booking)", () => {
    const stays = [
      { start: "2027-10-01", end: "2027-10-10", platform: "booking", propertyId: 1 },
    ];
    const r = presetRange(6, stays, TODAY);
    expect(r.to).toBe("2027-02-28");
  });
});

describe("buildMonthRange (explicit [from, to] window)", () => {
  it("renders every month in the range — empty months included", () => {
    const buckets = buildMonthRange("2025-08-01", "2027-02-28");
    expect(buckets).toHaveLength(19); // Aug 2025 → Feb 2027
    expect(buckets[0].key).toBe("2025-08");
    expect(buckets[buckets.length - 1].key).toBe("2027-02");
  });

  it("3M and 12M windows produce different lengths even with sparse data", () => {
    const three = presetRange(3, [], TODAY);
    const twelve = presetRange(12, [], TODAY);
    expect(buildMonthRange(three.from, three.to)).toHaveLength(10); // May 2026 → Feb 2027
    expect(buildMonthRange(twelve.from, twelve.to)).toHaveLength(19); // Aug 2025 → Feb 2027
  });

  it("marks past and current months relative to the real clock", () => {
    const now = new Date();
    const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const toDate = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const lastDay = new Date(toDate.getFullYear(), toDate.getMonth() + 1, 0).getDate();
    const buckets = buildMonthRange(
      `${ym(fromDate)}-01`,
      `${ym(toDate)}-${String(lastDay).padStart(2, "0")}`,
    );
    expect(buckets[0].isPast).toBe(true);
    expect(buckets.find((b) => b.key === ym(now))?.isCurrent).toBe(true);
    expect(buckets[buckets.length - 1].isPast).toBe(false);
  });

  it("an inverted range yields no buckets (custom De/Até guard)", () => {
    expect(buildMonthRange("2027-01-01", "2026-01-01")).toHaveLength(0);
  });
});
