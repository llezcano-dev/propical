import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Module mocks ──────────────────────────────────────────────────────
// The security contract under test is (1) auth and (2) that an
// SSRF-rejected URL returns a generic 400 error that never reveals *why*.
// We mock the guard + parser so the test exercises the handler's branching
// only, not real network/DNS.
const { getSession, fetchPublicFeedUrl, parseICal } = vi.hoisted(() => ({
  getSession: vi.fn(),
  fetchPublicFeedUrl: vi.fn(),
  parseICal: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSession,
}));

vi.mock("@/lib/feed-url-guard", () => ({
  fetchPublicFeedUrl,
  FEED_URL_ERROR: "Invalid calendar feed URL",
}));

vi.mock("@/lib/ical", () => ({
  parseICal,
}));

// Import AFTER the mocks are registered so the route pulls the mocked deps.
const { POST } = await import("./route");

function noRequest() {
  return undefined as unknown as NextRequest;
}

function jsonRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest;
}

const SESSION = { userId: 1, username: "user@example.com", role: "user" as const };

describe("POST /api/calendar/test — SSRF guard integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue(SESSION);
  });

  it("returns 401 when unauthenticated", async () => {
    getSession.mockResolvedValue(null);

    const res = await POST(jsonRequest({ url: "https://example.com/feed.ics" }));

    expect(res.status).toBe(401);
    expect(fetchPublicFeedUrl).not.toHaveBeenCalled();
  });

  it("returns 400 when url is missing", async () => {
    const res = await POST(jsonRequest({}));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "URL is required" });
    expect(fetchPublicFeedUrl).not.toHaveBeenCalled();
  });

  it("returns a generic 400 for an SSRF-rejected URL (no reason leak)", async () => {
    fetchPublicFeedUrl.mockResolvedValue({ ok: false, reason: "unsafe_address" });

    const res = await POST(jsonRequest({ url: "https://169.254.169.254/" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      success: false,
      error: "Invalid calendar feed URL",
    });
    // The generic message must not reveal the concrete reason.
    expect(parseICal).not.toHaveBeenCalled();
  });

  it("returns the concrete fetch error when the guard passed but the fetch failed", async () => {
    fetchPublicFeedUrl.mockResolvedValue({
      ok: false,
      reason: "http_error",
      detail: "HTTP 404: Not Found",
    });

    const res = await POST(jsonRequest({ url: "https://example.com/feed.ics" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: false, error: "HTTP 404: Not Found" });
  });

  it("reports a non-iCal response with a preview", async () => {
    fetchPublicFeedUrl.mockResolvedValue({ ok: true, text: "<html>not a feed</html>" });

    const res = await POST(jsonRequest({ url: "https://example.com/feed.ics" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Response is not a valid iCal feed");
    expect(body.preview).toBe("<html>not a feed</html>");
  });

  it("parses a valid feed and returns event counts", async () => {
    fetchPublicFeedUrl.mockResolvedValue({ ok: true, text: "BEGIN:VCALENDAR\n..." });
    parseICal.mockReturnValue([
      { summary: "Future", startDate: "2099-01-01", endDate: "2099-01-03" },
      { summary: "Past", startDate: "2020-01-01", endDate: "2020-01-02" },
    ]);

    const res = await POST(jsonRequest({ url: "https://example.com/feed.ics" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.totalEvents).toBe(2);
    expect(body.futureEvents).toBe(1);
    expect(body.pastEvents).toBe(1);
    expect(body.events).toEqual([
      { summary: "Future", startDate: "2099-01-01", endDate: "2099-01-03" },
    ]);
  });
});
