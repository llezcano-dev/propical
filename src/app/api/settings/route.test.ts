import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Module mocks ──────────────────────────────────────────────────────
// /api/settings GET must not expose operator/global
// keys (sync_*) to non-superadmins — especially `sync_last_result`, which
// carries cross-user counts/errors from the global cron. We mock auth +
// prisma so the test only exercises the allowlist logic.
const { getSession, appSettingsFindMany, appSettingsUpsert } = vi.hoisted(
  () => ({
    getSession: vi.fn(),
    appSettingsFindMany: vi.fn(),
    appSettingsUpsert: vi.fn(),
  }),
);

vi.mock("@/lib/auth", () => ({
  getSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appSettings: { findMany: appSettingsFindMany, upsert: appSettingsUpsert },
  },
}));

// Import AFTER the mocks are registered so the route pulls the mocked deps.
const { GET, PUT } = await import("./route");

function noRequest() {
  return undefined as unknown as NextRequest;
}

function jsonRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest;
}

const SUPERADMIN = { userId: 1, username: "admin", role: "superadmin" as const };
const USER = { userId: 2, username: "user@example.com", role: "user" as const };

const ALL_KEYS = [
  // Unknown/legacy row: proves non-allowlisted keys are dropped, not leaked.
  { key: "legacy_unknown_key", value: "stale" },
  { key: "sync_auto_enabled", value: "true" },
  { key: "sync_frequency_minutes", value: "15" },
  { key: "sync_last_run", value: "2026-08-13T12:00:00Z" },
  { key: "sync_last_result", value: '{"propertiesSynced":42,"errors":1}' },
];

describe("GET /api/settings — per-key allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appSettingsFindMany.mockResolvedValue(ALL_KEYS);
  });

  it("returns 401 when unauthenticated", async () => {
    getSession.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(appSettingsFindMany).not.toHaveBeenCalled();
  });

  it("returns every key unmasked for a superadmin", async () => {
    getSession.mockResolvedValue(SUPERADMIN);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      legacy_unknown_key: "stale",
      sync_auto_enabled: "true",
      sync_frequency_minutes: "15",
      sync_last_run: "2026-08-13T12:00:00Z",
      sync_last_result: '{"propertiesSynced":42,"errors":1}',
    });
  });

  it("returns NO keys for a non-superadmin (allowlist is empty)", async () => {
    getSession.mockResolvedValue(USER);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    // The allowlist is currently empty: every AppSettings key is
    // operator/global state and must be absent for non-superadmins —
    // including cross-user sync_last_result and unknown/legacy rows.
    expect(body).toEqual({});
  });

  it("returns 500 when the DB lookup throws", async () => {
    getSession.mockResolvedValue(SUPERADMIN);
    appSettingsFindMany.mockRejectedValue(new Error("db down"));

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});

describe("PUT /api/settings — superadmin-only write", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for a non-superadmin", async () => {
    getSession.mockResolvedValue(USER);

    const res = await PUT(jsonRequest({ key: "sync_auto_enabled", value: "x" }));

    expect(res.status).toBe(403);
    expect(appSettingsUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 when key is missing", async () => {
    getSession.mockResolvedValue(SUPERADMIN);

    const res = await PUT(jsonRequest({ value: "x" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Key required" });
  });

  it("writes the setting for a superadmin", async () => {
    getSession.mockResolvedValue(SUPERADMIN);
    appSettingsUpsert.mockResolvedValue({});

    const res = await PUT(
      jsonRequest({ key: "sync_frequency_minutes", value: "30" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(appSettingsUpsert).toHaveBeenCalledWith({
      where: { key: "sync_frequency_minutes" },
      update: { value: "30" },
      create: { key: "sync_frequency_minutes", value: "30" },
    });
  });

  it("returns 500 when the DB write throws", async () => {
    getSession.mockResolvedValue(SUPERADMIN);
    appSettingsUpsert.mockRejectedValue(new Error("db down"));

    const res = await PUT(jsonRequest({ key: "sync_auto_enabled", value: "x" }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
