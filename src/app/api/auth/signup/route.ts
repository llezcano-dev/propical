import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { checkRateLimit, clientIp, rateLimitError } from "@/lib/rate-limit";
import { getSetting } from "@/lib/site-settings";
import { checkPasswordStrength } from "@/lib/security/password-strength";
import { createEmailCode, normalizeEmail } from "@/lib/email-code";
import { sendVerificationCodeEmail } from "@/lib/email";
import { claimOnboardingDraft } from "@/lib/onboarding";

// POST /api/auth/signup — step 1 of email-verified registration.
//
// This no longer creates the account. It validates the email +
// password, stashes the hashed password in a short-lived EmailCode
// row, and emails a 6-digit code. The account is created only once
// the code is confirmed at /api/auth/verify-email — so an unverified
// (or typo'd) address never leaves a half-built User behind.
//
// DEV BYPASS: In non-production environments without a configured
// email provider (RESEND_API_KEY), the account is created immediately
// and logged in. This keeps local development and e2e tests flowing
// without needing a real mailbox or API key.
export async function POST(request: NextRequest) {
  try {
    const signupEnabled = await getSetting("signup_enabled", "true");
    if (signupEnabled !== "true") {
      return NextResponse.json(
        { error: "Signups are temporarily disabled" },
        { status: 403 }
      );
    }

    const ip = clientIp(request);
    const rl = checkRateLimit(`signup:${ip}`, 5, 60);
    if (!rl.ok) {
      return rateLimitError(rl.resetSeconds);
    }

    const body = await request.json();
    const email = normalizeEmail(body?.email);
    const password = body?.password;

    if (!email) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 }
      );
    }
    if (typeof password !== "string") {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }
    const strength = checkPasswordStrength(password, email);
    if (!strength.ok) {
      return NextResponse.json({ error: strength.reason }, { status: 400 });
    }

    // The email is the account identity — it lands in both `username`
    // (the login lookup key) and `email`. Reject if either already
    // points at an account.
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: email }, { email }] },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try signing in." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Dev/test bypass: no email provider configured and not in production.
    const skipEmailVerification =
      process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY;

    if (skipEmailVerification) {
      const user = await prisma.user.create({
        data: {
          username: email,
          email,
          password: passwordHash,
          role: "user",
        },
        select: { id: true, username: true, role: true },
      });
      await createSession(user.id, user.username, user.role);
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      await claimOnboardingDraft(user.id);
      return NextResponse.json({ user });
    }

    const code = await createEmailCode({ purpose: "signup", email, passwordHash });

    const sent = await sendVerificationCodeEmail(email, code);
    if (!sent.ok) {
      return NextResponse.json(
        { error: "We couldn't send the verification email. Please try again shortly." },
        { status: 502 }
      );
    }

    return NextResponse.json({ pending: true, email });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
