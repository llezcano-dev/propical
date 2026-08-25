import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Module mocks ──────────────────────────────────────────────────────
// D3: the security contract under test is the DEV BYPASS gate in the
// signup route (`route.ts:84-85`):
//
//     skipEmailVerification = NODE_ENV !== "production" && !RESEND_API_KEY
//
// In non-production without an email provider the account is created
// immediately and logged in (keeps dev + e2e flowing). Everywhere else
// (production, or any env with RESEND_API_KEY) the account is only
// created after a 6-digit code is confirmed — and if sending that email
// fails the route must fail closed (502), never leaving a half-built
// account behind.
//
// We mock auth/prisma/email/etc. so the test only exercises the gate
// decision, never the DB or a real mailbox.
const {
  createSession,
  hashPassword,
  getSetting,
  checkRateLimit,
  clientIp,
  checkPasswordStrength,
  createEmailCode,
  sendVerificationCodeEmail,
  claimOnboardingDraft,
  userFindFirst,
  userCreate,
  userUpdate,
} = vi.hoisted(() => ({
  createSession: vi.fn(),
  hashPassword: vi.fn(),
  getSetting: vi.fn(),
  checkRateLimit: vi.fn(),
  clientIp: vi.fn(),
  checkPasswordStrength: vi.fn(),
  createEmailCode: vi.fn(),
  sendVerificationCodeEmail: vi.fn(),
  claimOnboardingDraft: vi.fn(),
  userFindFirst: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  createSession,
  hashPassword,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: userFindFirst,
      create: userCreate,
      update: userUpdate,
    },
  },
}));

vi.mock("@/lib/site-settings", () => ({
  getSetting,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit,
  clientIp,
  rateLimitError: vi.fn(() => NextResponse.json({ error: "rate limited" }, { status: 429 })),
}));

vi.mock("@/lib/security/password-strength", () => ({
  checkPasswordStrength,
}));

// Keep the real normalizeEmail (pure) but stub createEmailCode so no
// code row is written.
vi.mock("@/lib/email-code", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@/lib/email-code");
  return { ...actual, createEmailCode };
});

vi.mock("@/lib/email", () => ({
  sendVerificationCodeEmail,
}));

vi.mock("@/lib/onboarding", () => ({
  claimOnboardingDraft,
}));

// Import AFTER the mocks are registered so the route pulls the mocked
// dependencies.
const { POST } = await import("./route");

function jsonRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest;
}

const VALID_BODY = { email: "New@Example.com", password: "StrongPass123!" };

/** Happy-path mocks: signup enabled, no rate limit, no duplicate, strong password. */
function setupHappyPath() {
  getSetting.mockResolvedValue("true");
  checkRateLimit.mockReturnValue({ ok: true });
  clientIp.mockReturnValue("127.0.0.1");
  checkPasswordStrength.mockReturnValue({ ok: true, reason: "" });
  hashPassword.mockResolvedValue("hashed-password");
  userFindFirst.mockResolvedValue(null);
  userCreate.mockResolvedValue({ id: 7, username: "new@example.com", role: "user" });
  userUpdate.mockResolvedValue({});
  claimOnboardingDraft.mockResolvedValue(undefined);
  createSession.mockResolvedValue("session-token");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/signup — DEV BYPASS gate (D3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPath();
  });

  it("bypasses email verification in dev without RESEND_API_KEY → account created + session", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");

    const res = await POST(jsonRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      user: { id: 7, username: "new@example.com", role: "user" },
    });
    // The account is created immediately with role "user" (signup never
    // self-promotes to superadmin).
    expect(userCreate).toHaveBeenCalledWith({
      data: {
        username: "new@example.com",
        email: "new@example.com",
        password: "hashed-password",
        role: "user",
      },
      select: { id: true, username: true, role: true },
    });
    expect(createSession).toHaveBeenCalledWith(7, "new@example.com", "user");
    expect(claimOnboardingDraft).toHaveBeenCalledWith(7);
    // No code row, no email — the whole verification path is skipped.
    expect(createEmailCode).not.toHaveBeenCalled();
    expect(sendVerificationCodeEmail).not.toHaveBeenCalled();
  });

  it("bypasses in dev even when NODE_ENV is unset (treats it as non-production)", async () => {
    // Vitest default NODE_ENV="test" → gate active; explicit for clarity.
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("RESEND_API_KEY", "");

    const res = await POST(jsonRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(userCreate).toHaveBeenCalledTimes(1);
    expect(createEmailCode).not.toHaveBeenCalled();
  });

  it("does NOT bypass in production without RESEND_API_KEY → verification flow", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    createEmailCode.mockResolvedValue("123456");
    sendVerificationCodeEmail.mockResolvedValue({ ok: true });

    const res = await POST(jsonRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pending: true, email: "new@example.com" });
    // No account, no session — creation waits for the code to be confirmed.
    expect(userCreate).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
    expect(createEmailCode).toHaveBeenCalledWith({
      purpose: "signup",
      email: "new@example.com",
      passwordHash: "hashed-password",
    });
    expect(sendVerificationCodeEmail).toHaveBeenCalledWith("new@example.com", "123456");
  });

  it("does NOT bypass in dev when RESEND_API_KEY is configured → verification flow", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "re_abc123");
    createEmailCode.mockResolvedValue("654321");
    sendVerificationCodeEmail.mockResolvedValue({ ok: true });

    const res = await POST(jsonRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pending: true, email: "new@example.com" });
    expect(userCreate).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("fails closed with 502 when the email cannot be sent — never leaves an unverified account", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    createEmailCode.mockResolvedValue("123456");
    sendVerificationCodeEmail.mockResolvedValue({ ok: false });

    const res = await POST(jsonRequest(VALID_BODY));

    expect(res.status).toBe(502);
    // No account, no session: a failed email must not silently create an
    // unverified user.
    expect(userCreate).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/signup — request validation (pre-gate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPath();
  });

  it("returns 403 when signups are disabled", async () => {
    getSetting.mockResolvedValue("false");

    const res = await POST(jsonRequest(VALID_BODY));

    expect(res.status).toBe(403);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("returns 429 when rate-limited", async () => {
    checkRateLimit.mockReturnValue({ ok: false, resetSeconds: 42 });

    const res = await POST(jsonRequest(VALID_BODY));

    expect(res.status).toBe(429);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("returns 400 for a missing/invalid email", async () => {
    const res = await POST(jsonRequest({ password: "StrongPass123!" }));

    expect(res.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("returns 409 when the account already exists", async () => {
    userFindFirst.mockResolvedValue({ id: 99 });

    const res = await POST(jsonRequest(VALID_BODY));

    expect(res.status).toBe(409);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("returns 500 when the DB throws", async () => {
    userFindFirst.mockRejectedValue(new Error("db down"));

    const res = await POST(jsonRequest(VALID_BODY));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
