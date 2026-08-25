import { BlockList, isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";

/**
 * SSRF guard for server-side fetches of user-supplied URLs.
 *
 * The application fetches iCal feed URLs server-side (in
 * `/api/calendar/test` and in `calendar-sync.ts`'s `fetchICal`). Without a
 * guard, an authenticated user can point that fetch at internal targets the
 * server can reach but they cannot — loopback, the private network, or the
 * cloud metadata endpoint at 169.254.169.254 — and use the response (HTTP
 * status, or up to ~200 chars of the body echoed as a "preview") to probe
 * and exfiltrate. This guard ensures the server only fetches addresses that
 * the attacker's browser could also reach directly, which neutralises the
 * SSRF by construction.
 *
 * Rules enforced:
 *   - HTTPS-only (in production). `http://` is refused because it is the
 *     transport of nearly every internal service that lacks TLS.
 *   - After resolving the hostname, every resolved IP is checked against the
 *     non-public ranges below and refused if any match:
 *       IPv4: 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10 (CGNAT),
 *             169.254.0.0/16 (link-local incl. cloud metadata),
 *             172.16.0.0/12, 192.0.0.0/24, 192.168.0.0/16,
 *             198.18.0.0/15 (benchmark), 224.0.0.0/4 (multicast),
 *             240.0.0.0/4 (reserved), and loopback 127.0.0.0/8.
 *       IPv6: ::/128, ::1/128 (loopback), ::ffff:0:0/96 (IPv4-mapped),
 *             fc00::/7 (unique-local), fe80::/10 (link-local),
 *             ff00::/8 (multicast).
 *   - Literal IPs are checked directly; hostnames are resolved first.
 *
 * Development exception: when `allowDevTargets` is true (defaults to
 * `NODE_ENV !== "production"`), loopback targets AND the `http://` scheme
 * are allowed for loopback-only targets, so the dev/e2e mock feeds at
 * `http://localhost:3000/mock/*.ical` keep working.
 *
 * ── Known limitation: DNS rebinding ─────────────────────────────────────
 * This is the "simple" variant (Opción A). There is a TOCTOU race between
 * the moment we resolve + validate the IP and the moment `fetch` re-resolves
 * the hostname internally: a malicious DNS server under the attacker's
 * control can answer the public IP on the validation lookup and a private IP
 * (e.g. 127.0.0.1) on the fetch's own lookup, smuggling a private target
 * past the check. Closing that requires pinning the resolved IP for the
 * actual request (e.g. `https.request` with a `lookup` override against the
 * validated IP while preserving SNI/Host). Deferred deliberately — the
 * attacker must control a domain and win a tight timing window; revisit if
 * Propical ever becomes a high-value multi-tenant target (SSRF / DNS
 * rebinding annex of the security audit).
 */

type ResolvedAddress = { address: string; family: number };

/** Resolves a hostname to its addresses (injectable for tests). */
export type Resolver = (hostname: string) => Promise<ResolvedAddress[]>;

export type UrlValidationReason =
  | "invalid_url"
  | "not_https"
  | "unsafe_address"
  | "dns_failed";

export type UrlValidation =
  | { ok: true; url: string }
  | { ok: false; reason: UrlValidationReason };

export interface FeedUrlGuardOptions {
  /** Resolver override (defaults to `dns.promises.lookup`). */
  resolver?: Resolver;
  /** Allow loopback targets and `http://` (dev/e2e mocks). Defaults to `NODE_ENV !== "production"`. */
  allowDevTargets?: boolean;
}

const defaultResolver: Resolver = (hostname) =>
  dnsLookup(hostname, { all: true });

// ── Non-public IPv4 ranges (loopback handled separately) ────────────────
const BLOCKED_V4 = new BlockList();
BLOCKED_V4.addSubnet("0.0.0.0", 8, "ipv4");
BLOCKED_V4.addSubnet("10.0.0.0", 8, "ipv4");
BLOCKED_V4.addSubnet("100.64.0.0", 10, "ipv4");
BLOCKED_V4.addSubnet("169.254.0.0", 16, "ipv4");
BLOCKED_V4.addSubnet("172.16.0.0", 12, "ipv4");
BLOCKED_V4.addSubnet("192.0.0.0", 24, "ipv4");
BLOCKED_V4.addSubnet("192.168.0.0", 16, "ipv4");
BLOCKED_V4.addSubnet("198.18.0.0", 15, "ipv4");
BLOCKED_V4.addSubnet("224.0.0.0", 4, "ipv4");
BLOCKED_V4.addSubnet("240.0.0.0", 4, "ipv4");

// ── Non-public IPv6 ranges (loopback handled separately) ────────────────
const BLOCKED_V6 = new BlockList();
BLOCKED_V6.addSubnet("::", 128, "ipv6");
BLOCKED_V6.addSubnet("::ffff:0:0", 96, "ipv6");
BLOCKED_V6.addSubnet("fc00::", 7, "ipv6");
BLOCKED_V6.addSubnet("fe80::", 10, "ipv6");
BLOCKED_V6.addSubnet("ff00::", 8, "ipv6");

function isLoopback(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return ip.startsWith("127.");
  if (family === 6) return ip === "::1";
  return false;
}

function isBlockedIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return BLOCKED_V4.check(ip, "ipv4");
  if (family === 6) return BLOCKED_V6.check(ip, "ipv6");
  return false;
}

/** Blocked unless loopback is explicitly allowed (dev mocks). */
function isUnsafeAddress(ip: string, allowLoopback: boolean): boolean {
  if (isLoopback(ip)) return !allowLoopback;
  return isBlockedIp(ip);
}

/**
 * Validate a user-supplied feed URL for server-side fetching.
 *
 * Returns `{ ok: true, url }` (the original URL) when it is safe to fetch,
 * or `{ ok: false, reason }` otherwise. Never throws.
 */
export async function validateFeedUrl(
  rawUrl: string,
  opts: FeedUrlGuardOptions = {},
): Promise<UrlValidation> {
  const resolver = opts.resolver ?? defaultResolver;
  const allowDevTargets =
    opts.allowDevTargets ?? process.env.NODE_ENV !== "production";

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  // WHATWG URL.hostname keeps the brackets around IPv6 literals ("[::1]").
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (!hostname) return { ok: false, reason: "invalid_url" };

  // Reject non-HTTP(S) schemes before touching DNS (deterministic + no
  // pointless resolution for ftp:, file:, etc.).
  const protocol = parsed.protocol;
  const isHttp = protocol === "http:";
  if (!isHttp && protocol !== "https:") {
    return { ok: false, reason: "not_https" };
  }

  // Resolve to the concrete address(es) to check. A literal IP skips DNS.
  let addresses: string[];
  const literal = isIP(hostname);
  if (literal) {
    addresses = [hostname];
  } else {
    try {
      const resolved = await resolver(hostname);
      addresses = resolved.map((r) => r.address);
    } catch {
      return { ok: false, reason: "dns_failed" };
    }
  }
  if (addresses.length === 0) return { ok: false, reason: "dns_failed" };

  // HTTPS always passes the scheme check; HTTP is only tolerated for
  // loopback targets in dev (mock feeds).
  if (isHttp) {
    const onlyLoopback = addresses.every((a) => isLoopback(a));
    if (!allowDevTargets || !onlyLoopback) {
      return { ok: false, reason: "not_https" };
    }
  }

  for (const addr of addresses) {
    if (isUnsafeAddress(addr, allowDevTargets)) {
      return { ok: false, reason: "unsafe_address" };
    }
  }

  return { ok: true, url: rawUrl };
}

/** Generic, attacker-safe message: never reveals *why* a URL was refused. */
export const FEED_URL_ERROR = "Invalid calendar feed URL";

type FeedFetchReason = UrlValidationReason | "http_error" | "fetch_failed";

export type FeedFetchResult =
  | { ok: true; text: string }
  | { ok: false; reason: FeedFetchReason; detail?: string };

const FEED_USER_AGENT = "RentTool-CalendarSync/1.0";
const FEED_TIMEOUT_MS = 15_000;

/**
 * Validate a feed URL and, if safe, fetch its body server-side.
 *
 * Reusable entry point for every "user enters a URL and the server fetches
 * it" scenario (`/api/calendar/test`, `calendar-sync.ts` `fetchICal`, and any
 * future URL input). Validation failures return a generic detail message so
 * the caller can surface a friendly error without leaking the reason.
 */
export async function fetchPublicFeedUrl(
  rawUrl: string,
  opts: FeedUrlGuardOptions = {},
): Promise<FeedFetchResult> {
  const validation = await validateFeedUrl(rawUrl, opts);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason, detail: FEED_URL_ERROR };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(validation.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": FEED_USER_AGENT,
        Accept: "text/calendar, text/plain, */*",
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        reason: "http_error",
        detail: `HTTP ${res.status}: ${res.statusText}`,
      };
    }
    const text = await res.text();
    return { ok: true, text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      reason: "fetch_failed",
      detail: msg.includes("abort") ? "Connection timed out (15s)" : msg,
    };
  } finally {
    clearTimeout(timeout);
  }
}
