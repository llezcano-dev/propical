import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";

// ── Module mocks ──────────────────────────────────────────────────────
// The cron URL embeds the cron secret, so the endpoint must be
// superadmin-only. We mock auth + next/headers so the test only exercises
// the handler's permission logic, never the real request context.
const { requireSuperadmin, headersGet, headersImpl } = vi.hoisted(() => ({
  requireSuperadmin: vi.fn(),
  headersGet: vi.fn(),
  headersImpl: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireSuperadmin,
}));

vi.mock("next/headers", () => ({
  headers: headersImpl,
}));

// Import AFTER the mocks are registered so the route pulls the mocked deps.
const { GET } = await import("./route");

function authResponse(status: number, error: string) {
  return { session: null, response: NextResponse.json({ error }, { status }) };
}

const SESSION = { userId: 1, username: "admin", role: "superadmin" as const };

const ORIGINAL_ENV = { ...process.env };

describe("GET /api/calendar/cron-url — superadmin gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    delete process.env.JWT_SECRET;
    headersGet.mockReturnValue(null);
    // Default: headers() returns a get-able object.
    headersImpl.mockResolvedValue({ get: headersGet });
  });

  afterEach(() => {
    // Restore env so the CRON_SECRET set here doesn't leak into other tests.
    for (const k of Object.keys(process.env)) {
      if (!(k in ORIGINAL_ENV)) delete process.env[k];
    }
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("returns 401 when unauthenticated", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(401, "Unauthorized"));

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(headersGet).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-superadmin (cron secret not exposed)", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(403, "Forbidden"));

    const res = await GET();

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(headersGet).not.toHaveBeenCalled();
  });

  it("returns the cron URL with the secret for a superadmin", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    headersGet.mockImplementation((name: string) =>
      name === "host" ? "propical.com.br" : null,
    );

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      url: "https://propical.com.br/api/calendar/cron?secret=test-cron-secret",
      configured: true,
    });
  });

  it("returns configured:false when no secret is set", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    delete process.env.CRON_SECRET;

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.configured).toBe(false);
    expect(body.url).toBeNull();
    expect(headersGet).not.toHaveBeenCalled();
  });

  it("returns configured:false when the fallback secret is used", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    process.env.CRON_SECRET = "fallback-secret-change-me";

    const res = await GET();

    const body = await res.json();
    expect(body.configured).toBe(false);
    expect(body.url).toBeNull();
  });

  it("returns hint when no host header is present", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    headersGet.mockReturnValue(null); // no host, no x-forwarded-host

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      url: null,
      configured: true,
      hint: "No host header",
    });
  });

  it("returns 500 when headers() throws", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    headersImpl.mockRejectedValue(new Error("no request context"));

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
