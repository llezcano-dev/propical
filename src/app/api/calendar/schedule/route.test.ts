import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Module mocks ──────────────────────────────────────────────────────
// /api/calendar/schedule surfaces GLOBAL sync settings (auto_enabled,
// frequency, and the unscoped cron result). Both GET and PUT must be
// superadmin-only. We mock auth + prisma so the test only exercises the
// handler's permission logic, never the DB.
const { requireSuperadmin, appSettingsFindMany, appSettingsUpsert } = vi.hoisted(
  () => ({
    requireSuperadmin: vi.fn(),
    appSettingsFindMany: vi.fn(),
    appSettingsUpsert: vi.fn(),
  }),
);

vi.mock("@/lib/auth", () => ({
  requireSuperadmin,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appSettings: { findMany: appSettingsFindMany, upsert: appSettingsUpsert },
  },
}));

// Import AFTER the mocks are registered so the route pulls the mocked deps.
const { GET, PUT } = await import("./route");

function authResponse(status: number, error: string) {
  return { session: null, response: NextResponse.json({ error }, { status }) };
}

function noRequest() {
  return undefined as unknown as NextRequest;
}

function jsonRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest;
}

const SESSION = { userId: 1, username: "admin", role: "superadmin" as const };

describe("GET /api/calendar/schedule — superadmin gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(401, "Unauthorized"));

    const res = await GET();

    expect(res.status).toBe(401);
    expect(appSettingsFindMany).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-superadmin (global sync state not exposed)", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(403, "Forbidden"));

    const res = await GET();

    expect(res.status).toBe(403);
    expect(appSettingsFindMany).not.toHaveBeenCalled();
  });

  it("returns the schedule settings for a superadmin", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    appSettingsFindMany.mockResolvedValue([
      { key: "sync_auto_enabled", value: "true" },
      { key: "sync_frequency_minutes", value: "15" },
      { key: "sync_last_run", value: "2026-08-13T12:00:00Z" },
      { key: "sync_last_result", value: '{"propertiesSynced":3}' },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      autoEnabled: true,
      frequencyMinutes: 15,
      lastRun: "2026-08-13T12:00:00Z",
      lastResult: '{"propertiesSynced":3}',
    });
  });

  it("defaults frequency to 10 when unset", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    appSettingsFindMany.mockResolvedValue([]);

    const res = await GET();

    const body = await res.json();
    expect(body.frequencyMinutes).toBe(10);
    expect(body.autoEnabled).toBe(false);
    expect(body.lastRun).toBeNull();
    expect(body.lastResult).toBeNull();
  });

  it("returns 500 when the DB lookup throws", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    appSettingsFindMany.mockRejectedValue(new Error("db down"));

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});

describe("PUT /api/calendar/schedule — superadmin gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(401, "Unauthorized"));

    const res = await PUT(jsonRequest({ autoEnabled: false }));

    expect(res.status).toBe(401);
    expect(appSettingsUpsert).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-superadmin (can't change global sync)", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(403, "Forbidden"));

    const res = await PUT(jsonRequest({ autoEnabled: false }));

    expect(res.status).toBe(403);
    expect(appSettingsUpsert).not.toHaveBeenCalled();
  });

  it("updates autoEnabled for a superadmin", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    appSettingsUpsert.mockResolvedValue({});

    const res = await PUT(jsonRequest({ autoEnabled: false }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(appSettingsUpsert).toHaveBeenCalledWith({
      where: { key: "sync_auto_enabled" },
      update: { value: "false" },
      create: { key: "sync_auto_enabled", value: "false" },
    });
  });

  it("updates frequencyMinutes for a superadmin", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    appSettingsUpsert.mockResolvedValue({});

    const res = await PUT(jsonRequest({ frequencyMinutes: 30 }));

    expect(res.status).toBe(200);
    expect(appSettingsUpsert).toHaveBeenCalledWith({
      where: { key: "sync_frequency_minutes" },
      update: { value: "30" },
      create: { key: "sync_frequency_minutes", value: "30" },
    });
  });

  it("updates both keys when both are present", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    appSettingsUpsert.mockResolvedValue({});

    const res = await PUT(jsonRequest({ autoEnabled: true, frequencyMinutes: 60 }));

    expect(res.status).toBe(200);
    expect(appSettingsUpsert).toHaveBeenCalledTimes(2);
  });

  it("returns 500 when the DB upsert throws", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    appSettingsUpsert.mockRejectedValue(new Error("db down"));

    const res = await PUT(jsonRequest({ autoEnabled: true }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
