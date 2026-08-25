import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Module mocks ──────────────────────────────────────────────────────
// The security contract under test is (1) superadmin gating and (2)
// the guard that refuses to suspend yourself (a superadmin must not be
// able to lock themselves out). We mock auth + prisma + audit so the test
// only exercises the handler's permission logic, never the DB.
const { requireSuperadmin, logAudit, userFindUnique, userUpdate } = vi.hoisted(
  () => ({
    requireSuperadmin: vi.fn(),
    logAudit: vi.fn(),
    userFindUnique: vi.fn(),
    userUpdate: vi.fn(),
  }),
);

vi.mock("@/lib/auth", () => ({
  requireSuperadmin,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique, update: userUpdate },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAudit,
}));

// Import AFTER the mocks are registered so the route pulls the mocked deps.
const { POST, DELETE } = await import("./route");

function authResponse(status: number, error: string) {
  return { session: null, response: NextResponse.json({ error }, { status }) };
}

function noRequest() {
  return undefined as unknown as NextRequest;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const SESSION = { userId: 1, username: "admin", role: "superadmin" as const };

describe("POST /api/admin/users/[id]/suspend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(401, "Unauthorized"));

    const res = await POST(noRequest(), params("2"));

    expect(res.status).toBe(401);
    expect(logAudit).not.toHaveBeenCalled();
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-superadmin", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(403, "Forbidden"));

    const res = await POST(noRequest(), params("2"));

    expect(res.status).toBe(403);
    expect(logAudit).not.toHaveBeenCalled();
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed id", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });

    const res = await POST(noRequest(), params("not-a-number"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid ID" });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("refuses to suspend your own account (superadmin can't lock themselves out)", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });

    const res = await POST(noRequest(), params(String(SESSION.userId)));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Cannot suspend your own account" });
    // The guard fires BEFORE any DB lookup — no target fetch, no update.
    expect(userFindUnique).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("returns 404 for a non-existent target", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    userFindUnique.mockResolvedValue(null);

    const res = await POST(noRequest(), params("99"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "User not found" });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("refuses to suspend another superadmin (no lateral lock-out)", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    userFindUnique.mockResolvedValue({ id: 2, role: "superadmin" });

    const res = await POST(noRequest(), params("2"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Cannot suspend a superadmin" });
    expect(userUpdate).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("suspends a regular user and records the audit trail", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    userFindUnique.mockResolvedValue({ id: 2, role: "user" });
    userUpdate.mockResolvedValue({});

    const res = await POST(noRequest(), params("2"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { suspendedAt: expect.any(Date) },
    });
    expect(logAudit).toHaveBeenCalledWith(
      SESSION.userId,
      "update",
      "user",
      2,
      { suspended: true },
    );
  });

  it("returns 500 when the DB lookup throws", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    userFindUnique.mockRejectedValue(new Error("db down"));

    const res = await POST(noRequest(), params("2"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});

describe("DELETE /api/admin/users/[id]/suspend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(401, "Unauthorized"));

    const res = await DELETE(noRequest(), params("2"));

    expect(res.status).toBe(401);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-superadmin", async () => {
    requireSuperadmin.mockResolvedValue(authResponse(403, "Forbidden"));

    const res = await DELETE(noRequest(), params("2"));

    expect(res.status).toBe(403);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed id", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });

    const res = await DELETE(noRequest(), params("abc"));

    expect(res.status).toBe(400);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("unsuspends a user and records the audit trail", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    userUpdate.mockResolvedValue({});

    const res = await DELETE(noRequest(), params("2"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { suspendedAt: null },
    });
    expect(logAudit).toHaveBeenCalledWith(
      SESSION.userId,
      "update",
      "user",
      2,
      { suspended: false },
    );
  });

  it("returns 500 when the DB update throws", async () => {
    requireSuperadmin.mockResolvedValue({ session: SESSION, response: null });
    userUpdate.mockRejectedValue(new Error("db down"));

    const res = await DELETE(noRequest(), params("2"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
