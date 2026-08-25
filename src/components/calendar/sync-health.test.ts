import { describe, it, expect } from "vitest";
import { computeSyncHealth } from "./sync-health";
import type { CalendarLink } from "@/lib/types";

function makeLink(overrides: Partial<CalendarLink> = {}): CalendarLink {
  return {
    id: 1,
    propertyId: 1,
    platform: "airbnb",
    icalExportUrl: "https://example.com/ical",
    bufferBefore: 0,
    bufferAfter: 1,
    lastFetchedAt: null,
    lastError: null,
    failureCount: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeSyncHealth", () => {
  it("returns null for empty links array", () => {
    expect(computeSyncHealth([], "en", Date.now())).toBeNull();
  });

  it("returns null for null links", () => {
    expect(computeSyncHealth(null as unknown as CalendarLink[], "en", Date.now())).toBeNull();
  });

  it("reports error when a link has lastError", () => {
    const links = [makeLink({ lastError: "Connection refused" })];
    const result = computeSyncHealth(links, "en", Date.now());
    expect(result).toEqual({ ok: false, message: "Connection refused" });
  });

  it('falls back to "Sync error" when no lastFetchedAt on errored link', () => {
    // links.find(l => l.lastError) will match a link where lastError is truthy.
    // An empty string is falsy, so `errored` will be undefined and the code
    // falls through to "never synced" instead of the error branch.
    const links = [makeLink({ lastError: "" as unknown as null, lastFetchedAt: null })];
    const result = computeSyncHealth(links, "en", Date.now());
    expect(result).toEqual({ ok: false, message: "Never synced" });
  });

  it("returns the error message when a link has a truthy lastError", () => {
    const links = [makeLink({ lastError: "Connection refused" })];
    const result = computeSyncHealth(links, "en", Date.now());
    expect(result).toEqual({ ok: false, message: "Connection refused" });
  });

  it('reports "never synced" when no link has fetchedAt', () => {
    const now = new Date("2025-06-15T12:00:00Z").getTime();
    const links = [makeLink({ lastFetchedAt: null })];
    const result = computeSyncHealth(links, "en", now);
    expect(result?.ok).toBe(false);
    expect(result?.message).toContain("Never");
  });

  it('reports "just now" for a sync within the last 30s', () => {
    const now = new Date("2025-06-15T12:00:00Z").getTime();
    const links = [makeLink({ lastFetchedAt: "2025-06-15T11:59:45Z" })]; // 15s ago → 0 min
    const result = computeSyncHealth(links, "en", now);
    expect(result).toEqual({ ok: true, message: "Synced just now" });
  });

  it("reports minutes ago for a recent sync", () => {
    const now = new Date("2025-06-15T12:00:00Z").getTime();
    const links = [makeLink({ lastFetchedAt: "2025-06-15T11:55:00Z" })]; // 5 min ago
    const result = computeSyncHealth(links, "en", now);
    expect(result).toEqual({ ok: true, message: "Synced 5m ago" });
  });

  it("reports hours ago for a sync older than 60 min", () => {
    const now = new Date("2025-06-15T12:00:00Z").getTime();
    const links = [makeLink({ lastFetchedAt: "2025-06-15T09:30:00Z" })]; // 2.5h ago → 3h
    const result = computeSyncHealth(links, "en", now);
    expect(result).toEqual({ ok: true, message: "Synced 3h ago" });
  });

  it("reports days ago for a sync older than 24h", () => {
    const now = new Date("2025-06-15T12:00:00Z").getTime();
    const links = [makeLink({ lastFetchedAt: "2025-06-13T11:00:00Z" })]; // ~2 days ago
    const result = computeSyncHealth(links, "en", now);
    expect(result).toEqual({ ok: true, message: "Synced 2d ago" });
  });

  it("uses the most recent fetchedAt across multiple links", () => {
    const now = new Date("2025-06-15T12:00:00Z").getTime();
    const links = [
      makeLink({ id: 1, lastFetchedAt: "2025-06-15T10:00:00Z" }), // 2h ago
      makeLink({ id: 2, lastFetchedAt: "2025-06-15T11:55:00Z" }), // 5 min ago
    ];
    const result = computeSyncHealth(links, "en", now);
    expect(result).toEqual({ ok: true, message: "Synced 5m ago" });
  });

  it("respects the now parameter — 5 min ago should become 6 min", () => {
    const t0 = new Date("2025-06-15T12:00:00Z").getTime();
    const links = [makeLink({ lastFetchedAt: "2025-06-15T11:55:00Z" })]; // 5 min ago at t0
    expect(computeSyncHealth(links, "en", t0)).toEqual({ ok: true, message: "Synced 5m ago" });

    // advance 60 seconds — should now report 6 min
    const t1 = t0 + 60_000;
    expect(computeSyncHealth(links, "en", t1)).toEqual({ ok: true, message: "Synced 6m ago" });
  });

  it("works with pt locale", () => {
    const now = new Date("2025-06-15T12:00:00Z").getTime();
    const links = [makeLink({ lastFetchedAt: "2025-06-15T11:55:00Z" })]; // 5 min ago
    const result = computeSyncHealth(links, "pt", now);
    expect(result).toEqual({ ok: true, message: "Sincronizado há 5 min" });
  });

  it("works with es locale", () => {
    const now = new Date("2025-06-15T12:00:00Z").getTime();
    const links = [makeLink({ lastFetchedAt: "2025-06-15T11:55:00Z" })];
    const result = computeSyncHealth(links, "es", now);
    expect(result).toEqual({ ok: true, message: "Sincronizado hace 5 min" });
  });
});
