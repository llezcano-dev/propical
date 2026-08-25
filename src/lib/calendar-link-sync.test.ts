import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { saveCalendarLinkAndSync } from "./calendar-link-sync";

const MOCK_FETCH = vi.fn<typeof fetch>();

/**
 * Helper to read the JSON body that our mock received on a fetch call.
 */
function parseBody(callIndex: number): Record<string, unknown> {
  const init = MOCK_FETCH.mock.calls[callIndex]?.[1] as
    | RequestInit
    | undefined;
  return JSON.parse((init?.body as string) ?? "{}");
}

beforeEach(() => {
  vi.stubGlobal("fetch", MOCK_FETCH);
  MOCK_FETCH.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saveCalendarLinkAndSync", () => {
  const defaultInput = {
    propertyId: 1,
    platform: "airbnb" as const,
    icalExportUrl: "http://localhost:3000/mock/airbnb.ical",
  };

  it("POSTs to /api/calendar/links with the correct body", async () => {
    MOCK_FETCH.mockResolvedValueOnce(okJson({ id: 42 }));
    MOCK_FETCH.mockResolvedValueOnce(okJson({ propertiesSynced: 1 }));

    const result = await saveCalendarLinkAndSync(defaultInput);

    expect(MOCK_FETCH).toHaveBeenCalledTimes(2);
    expect(MOCK_FETCH.mock.calls[0][0]).toBe("/api/calendar/links");
    expect(parseBody(0)).toMatchObject({
      propertyId: 1,
      platform: "airbnb",
      icalExportUrl: "http://localhost:3000/mock/airbnb.ical",
    });
    expect(result.ok).toBe(true);
  });

  it("sends a vrbo preset platform slug (B7 regression)", async () => {
    MOCK_FETCH.mockResolvedValueOnce(okJson({ id: 43 }));
    MOCK_FETCH.mockResolvedValueOnce(okJson({}));

    const result = await saveCalendarLinkAndSync({
      propertyId: 1,
      platform: "vrbo",
      icalExportUrl: "http://localhost:3000/mock/vrbo.ical",
    });

    expect(parseBody(0).platform).toBe("vrbo");
    expect(result.ok).toBe(true);
  });

  it("sends a custom platform slug (B7 regression)", async () => {
    MOCK_FETCH.mockResolvedValueOnce(okJson({ id: 44 }));
    MOCK_FETCH.mockResolvedValueOnce(okJson({}));

    const result = await saveCalendarLinkAndSync({
      propertyId: 1,
      platform: "hostaway",
      icalExportUrl: "http://localhost:3000/mock/hostaway.ical",
    });

    expect(parseBody(0).platform).toBe("hostaway");
    expect(result.ok).toBe(true);
  });

  it("triggers a scoped sync after a successful link save", async () => {
    MOCK_FETCH.mockResolvedValueOnce(okJson({ id: 42 }));
    MOCK_FETCH.mockResolvedValueOnce(okJson({}));

    await saveCalendarLinkAndSync(defaultInput);

    expect(MOCK_FETCH.mock.calls[1][0]).toBe("/api/calendar/sync");
    expect(parseBody(1)).toEqual({ propertyId: 1 });
  });

  it("returns ok:true when the link saves even if the sync fails", async () => {
    MOCK_FETCH.mockResolvedValueOnce(okJson({ id: 42 }));
    MOCK_FETCH.mockRejectedValueOnce(new Error("Network error"));

    const result = await saveCalendarLinkAndSync(defaultInput);

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.link).toBeDefined();
  });

  it("returns ok:false and does NOT sync when the link save fails", async () => {
    MOCK_FETCH.mockResolvedValueOnce(
      errorResponse(400, "Invalid platform"),
    );

    const result = await saveCalendarLinkAndSync(defaultInput);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Invalid platform");
    expect(MOCK_FETCH).toHaveBeenCalledTimes(1);
  });

  it("passes bufferBefore and bufferAfter when provided", async () => {
    MOCK_FETCH.mockResolvedValueOnce(okJson({ id: 42 }));
    MOCK_FETCH.mockResolvedValueOnce(okJson({}));

    await saveCalendarLinkAndSync({
      ...defaultInput,
      bufferBefore: 2,
      bufferAfter: 3,
    });

    const body = parseBody(0);
    expect(body.bufferBefore).toBe(2);
    expect(body.bufferAfter).toBe(3);
  });

  it("omits buffer fields from the body when not provided", async () => {
    MOCK_FETCH.mockResolvedValueOnce(okJson({ id: 42 }));
    MOCK_FETCH.mockResolvedValueOnce(okJson({}));

    await saveCalendarLinkAndSync(defaultInput);

    const body = parseBody(0);
    expect(body).toHaveProperty("propertyId");
    expect(body).not.toHaveProperty("bufferBefore");
    expect(body).not.toHaveProperty("bufferAfter");
  });
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function okJson(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

function errorResponse(status: number, error: string): Response {
  return {
    ok: false,
    status,
    json: async () => ({ error }),
  } as unknown as Response;
}
