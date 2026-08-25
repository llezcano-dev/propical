import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Module mocks ──────────────────────────────────────────────────────
// The security contract under test is the gating of
// /api/users to superadmins. We mock auth + prisma + audit so the test
// only exercises the handler's permission logic, never the DB.
const { requireSuperadmin, hashPassword, logAudit, userFindMany } = vi.hoisted(
  () => ({
    requireSuperadmin: vi.fn(),
    hashPassword: vi.fn(),
    logAudit: vi.fn(),
    userFindMany: vi.fn(),
  }),
);

vi.mock("@/lib/auth", () => ({
  hashPassword,
  requireSuperadmin,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: userFindMany } },
}));

vi.mock("@/lib/audit", () => ({
  logAudit,
}));

// Import AFTER the mocks are registered so the route pulls the mocked
// dependencies.
const { GET, POST } = await import("./route");

function authResponse(status: number, error: string) {
  return { session: null, response: NextResponse.json({ error }, { status }) };
}

function noRequest() {
  return undefined as unknown as NextRequest;
}

const SESSION = { userId: 1, username: "admin", role: "superadmin" as const };

describe("GET /api/users — superadmin gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(401, "Unauthorized"));

    const res = await GET(noRequest());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    // No DB hit for the enumeration on an auth failure.
    expect(userFindMany).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-superadmin (email enumeration closed)", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(403, "Forbidden"));

    const res = await GET(noRequest());

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(userFindMany).not.toHaveBeenCalled();
  });

  it("returns the full user list for a superadmin", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    userFindMany.mockResolvedValue([
      {
        id: 1,
        username: "admin",
        role: "superadmin",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        id: 2,
        username: "someone@example.com",
        role: "user",
        createdAt: new Date("2026-01-02T00:00:00Z"),
      },
    ]);

    const res = await GET(noRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      { id: 1, username: "admin", role: "superadmin", createdAt: expect.any(String) },
      { id: 2, username: "someone@example.com", role: "user", createdAt: expect.any(String) },
    ]);
    // The legacy `?role=cleaner` filter must be gone — the query is the
    // full unscoped enumeration, which only a superadmin may run.
    expect(userFindMany).toHaveBeenCalledWith({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  });
});

describe("POST /api/users — superadmin gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(401, "Unauthorized"));

    const res = await POST(noRequest());

    expect(res.status).toBe(401);
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-superadmin", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(403, "Forbidden"));

    const res = await POST(noRequest());

    expect(res.status).toBe(403);
    expect(logAudit).not.toHaveBeenCalled();
  });
});
