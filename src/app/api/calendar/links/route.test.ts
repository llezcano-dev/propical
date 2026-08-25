import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Module mocks ──────────────────────────────────────────────────────
// B7: POST /api/calendar/links rechazaba con 400 cualquier platform que no
// fuera "airbnb"/"booking" (allowlist hardcodeada), pero la UI de view=sync
// ofrece Vrbo como preset y plataformas custom (flujo "Add another
// platform"). El resto del pipeline (feed, sync, display) ya soporta
// vrbo/custom — solo el POST lo bloqueaba, y el cliente tragaba el error
// silenciosamente (la card del draft desaparecía sin feedback).
const { getSession, canManageProperty, logAudit, linkFindFirst, linkUpdate, linkCreate } =
  vi.hoisted(() => ({
    getSession: vi.fn(),
    canManageProperty: vi.fn(),
    logAudit: vi.fn(),
    linkFindFirst: vi.fn(),
    linkUpdate: vi.fn(),
    linkCreate: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({
  getSession,
}));

vi.mock("@/lib/ownership", () => ({
  canManageProperty,
}));

vi.mock("@/lib/audit", () => ({
  logAudit,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    calendarLink: {
      findFirst: linkFindFirst,
      update: linkUpdate,
      create: linkCreate,
    },
  },
}));

// Import AFTER the mocks are registered so the route pulls the mocked deps.
const { POST } = await import("./route");

function jsonRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest;
}

const SESSION = { userId: 1, username: "user@example.com", role: "user" as const };
const BASE = {
  propertyId: 7,
  icalExportUrl: "https://example.com/feed.ics",
  bufferBefore: 1,
  bufferAfter: 1,
};

describe("POST /api/calendar/links — platform allowlist (B7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue(SESSION);
    canManageProperty.mockResolvedValue(true);
    linkFindFirst.mockResolvedValue(null);
    linkCreate.mockResolvedValue({ id: 1, ...BASE, platform: "vrbo" });
  });

  it("returns 401 when unauthenticated", async () => {
    getSession.mockResolvedValue(null);

    const res = await POST(jsonRequest({ ...BASE, platform: "vrbo" }));

    expect(res.status).toBe(401);
    expect(linkCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(jsonRequest({ propertyId: 7 }));

    expect(res.status).toBe(400);
    expect(linkCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when the user cannot manage the property", async () => {
    canManageProperty.mockResolvedValue(false);

    const res = await POST(jsonRequest({ ...BASE, platform: "airbnb" }));

    expect(res.status).toBe(404);
    expect(linkCreate).not.toHaveBeenCalled();
  });

  it("creates a link for the airbnb preset", async () => {
    linkCreate.mockResolvedValue({ id: 1, ...BASE, platform: "airbnb" });

    const res = await POST(jsonRequest({ ...BASE, platform: "airbnb" }));

    expect(res.status).toBe(200);
    expect(linkCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ platform: "airbnb" }),
    });
  });

  it("creates a link for the vrbo preset (was rejected with 400)", async () => {
    const res = await POST(jsonRequest({ ...BASE, platform: "vrbo" }));

    expect(res.status).toBe(200);
    expect(linkCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ platform: "vrbo" }),
    });
  });

  it("creates a link for a custom platform slug (was rejected with 400)", async () => {
    linkCreate.mockResolvedValue({ id: 1, ...BASE, platform: "hostaway" });

    const res = await POST(jsonRequest({ ...BASE, platform: "hostaway" }));

    expect(res.status).toBe(200);
    expect(linkCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ platform: "hostaway" }),
    });
  });

  it("rejects an invalid platform slug with 400", async () => {
    const res = await POST(jsonRequest({ ...BASE, platform: "not a valid slug!" }));

    expect(res.status).toBe(400);
    expect(linkCreate).not.toHaveBeenCalled();
  });

  it("updates an existing link instead of creating a duplicate", async () => {
    const existing = { id: 9, ...BASE, platform: "vrbo" };
    linkFindFirst.mockResolvedValue(existing);
    linkUpdate.mockResolvedValue({ ...existing, icalExportUrl: "https://new.ics" });

    const res = await POST(jsonRequest({ ...BASE, platform: "vrbo" }));

    expect(res.status).toBe(200);
    expect(linkUpdate).toHaveBeenCalledWith({
      where: { id: 9 },
      data: expect.objectContaining({ icalExportUrl: "https://example.com/feed.ics" }),
    });
    expect(linkCreate).not.toHaveBeenCalled();
  });
});