/**
 * Simple in-memory rate limiter.
 *
 * Limitation: state is per-process and resets on restart. Fine for
 * single-instance deployments; on serverless (Vercel) each lambda has
 * fresh memory so limits don't persist across invocations. If we ever
 * need cross-instance rate limiting, swap for a Redis-backed bucket
 * (e.g. Upstash).
 */

import { NextResponse } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup to prevent unbounded growth
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * Check if a request is within the rate limit.
 *
 * @param key Unique identifier (e.g. IP address, user ID, IP+route)
 * @param limit Max requests allowed in the window
 * @param windowSeconds Window size in seconds
 */
export function checkRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  cleanup();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetSeconds: windowSeconds };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { ok: true, remaining: limit - bucket.count, resetSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
}

/**
 * Extract client IP from a NextRequest (best-effort).
 */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Uniform 429 response for a rate-limit breach. Carries a stable
 * `code` + `params` so the client can translate the message per locale
 * (see src/lib/api-errors.ts) instead of showing the raw English string.
 */
export function rateLimitError(resetSeconds: number): NextResponse {
  return NextResponse.json(
    {
      error: `Too many attempts. Try again in ${resetSeconds}s.`,
      code: "too_many_attempts",
      params: { seconds: resetSeconds },
    },
    {
      status: 429,
      headers: { "Retry-After": String(resetSeconds) },
    },
  );
}
