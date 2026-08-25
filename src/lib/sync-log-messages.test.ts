import { describe, it, expect } from "vitest";
import {
  syncLogMessage,
  parseSyncLogMessage,
  renderSyncLogMessage,
} from "./sync-log-messages";

describe("syncLogMessage (writer)", () => {
  it("serializes key + params as a stable JSON string", () => {
    expect(syncLogMessage("sync.log.started", { properties: 2, feeds: 3 })).toBe(
      '{"key":"sync.log.started","params":{"properties":2,"feeds":3}}',
    );
  });

  it("omits params when not provided", () => {
    expect(syncLogMessage("sync.log.cronSkippedDisabled")).toBe(
      '{"key":"sync.log.cronSkippedDisabled"}',
    );
  });
});

describe("parseSyncLogMessage (reader)", () => {
  it("parses a structured payload into key + params", () => {
    const parsed = parseSyncLogMessage(
      '{"key":"sync.log.fetchFailed","params":{"property":"Casa","platform":"airbnb","error":"boom"}}',
    );
    expect(parsed).toEqual({
      key: "sync.log.fetchFailed",
      params: { property: "Casa", platform: "airbnb", error: "boom" },
      raw: '{"key":"sync.log.fetchFailed","params":{"property":"Casa","platform":"airbnb","error":"boom"}}',
    });
  });

  it("keeps numeric params numeric", () => {
    const parsed = parseSyncLogMessage(
      '{"key":"sync.log.complete","params":{"properties":1,"new":2,"removed":0,"errors":0}}',
    );
    expect(parsed.params).toEqual({ properties: 1, new: 2, removed: 0, errors: 0 });
    expect(parsed.key).toBe("sync.log.complete");
  });

  it("parses a payload with no params", () => {
    const parsed = parseSyncLogMessage('{"key":"sync.log.cronSkippedDisabled"}');
    expect(parsed.key).toBe("sync.log.cronSkippedDisabled");
    expect(parsed.params).toBeNull();
  });

  it("strips a legacy [ALERT] prefix before parsing", () => {
    const raw = '[ALERT]{"key":"sync.log.consecutiveFailures","params":{"property":"Casa","platform":"airbnb","error":"boom"}}';
    const parsed = parseSyncLogMessage(raw);
    expect(parsed.key).toBe("sync.log.consecutiveFailures");
    expect(parsed.params?.error).toBe("boom");
  });

  it("falls back to legacy raw for an old-style message", () => {
    const raw = "Sync started: 2 properties, 3 feeds";
    const parsed = parseSyncLogMessage(raw);
    expect(parsed).toEqual({ key: null, params: null, raw });
  });

  it("falls back to legacy raw for malformed JSON", () => {
    const raw = '{"key":"sync.log.started"';
    const parsed = parseSyncLogMessage(raw);
    expect(parsed).toEqual({ key: null, params: null, raw });
  });

  it("falls back to legacy raw for JSON without a string key", () => {
    const parsed = parseSyncLogMessage('{"params":{"a":1}}');
    expect(parsed.key).toBeNull();
  });

  it("falls back to legacy raw for non-object JSON", () => {
    expect(parseSyncLogMessage('"just a string"').key).toBeNull();
    expect(parseSyncLogMessage("42").key).toBeNull();
    expect(parseSyncLogMessage("").key).toBeNull();
  });
});

describe("renderSyncLogMessage (UI helper)", () => {
  const translate = (key: string, params?: Record<string, string | number>) =>
    `${key}:${params ? JSON.stringify(params) : ""}`;

  it("translates structured messages", () => {
    const out = renderSyncLogMessage(
      syncLogMessage("sync.log.started", { properties: 2, feeds: 3 }),
      translate,
    );
    expect(out).toBe('sync.log.started:{"properties":2,"feeds":3}');
  });

  it("returns the raw string for legacy / unparseable messages", () => {
    const raw = "Sync complete: 1 properties, 0 new, 0 removed, 0 errors";
    expect(renderSyncLogMessage(raw, translate)).toBe(raw);
  });

  it("translates [ALERT] payloads (no marker shown)", () => {
    const out = renderSyncLogMessage(
      '[ALERT]{"key":"sync.log.consecutiveFailures","params":{"property":"Casa","platform":"airbnb","error":"boom"}}',
      translate,
    );
    expect(out).toContain("sync.log.consecutiveFailures");
  });
});
