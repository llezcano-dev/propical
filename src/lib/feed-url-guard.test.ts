import { describe, it, expect, vi, afterEach } from "vitest";
import {
  validateFeedUrl,
  fetchPublicFeedUrl,
  FEED_URL_ERROR,
  type Resolver,
  type FeedUrlGuardOptions,
  type UrlValidationReason,
} from "./feed-url-guard";

// Resolver stub factory — injects DNS results without touching the network.
function resolverFor(records: Record<string, { address: string; family: number }[]>) {
  const fn = vi.fn(async (hostname: string) => records[hostname] ?? []);
  return fn as unknown as Resolver;
}

/**
 * Assert that a URL is rejected and return the rejection reason.
 * Narrowing helper: `UrlValidation` is a discriminated union, so `.reason`
 * is only reachable after proving `ok === false`.
 */
async function rejectionReason(
  url: string,
  opts: FeedUrlGuardOptions,
): Promise<UrlValidationReason> {
  const r = await validateFeedUrl(url, opts);
  if (r.ok) throw new Error(`expected rejection for ${url}`);
  return r.reason;
}

const PROD = { allowDevTargets: false };
const DEV = { allowDevTargets: true };

const publicV4 = [{ address: "93.184.216.34", family: 4 }];
const privateV4 = [{ address: "10.0.0.5", family: 4 }];
const loopbackV4 = [{ address: "127.0.0.1", family: 4 }];
const metadataV4 = [{ address: "169.254.169.254", family: 4 }];
const ulaV6 = [{ address: "fd00::1", family: 6 }];

describe("validateFeedUrl — scheme + literal IPs", () => {
  it("accepts a public HTTPS URL", async () => {
    const r = await validateFeedUrl("https://example.com/feed.ics", {
      resolver: resolverFor({ "example.com": publicV4 }),
      ...PROD,
    });
    expect(r).toEqual({ ok: true, url: "https://example.com/feed.ics" });
  });

  it("accepts a literal public IP over HTTPS", async () => {
    const r = await validateFeedUrl("https://93.184.216.34/feed.ics", PROD);
    expect(r.ok).toBe(true);
  });

  it("rejects a non-parseable string", async () => {
    const r = await validateFeedUrl("not a url", PROD);
    expect(r).toEqual({ ok: false, reason: "invalid_url" });
  });

  it("rejects http:// in production", async () => {
    const r = await validateFeedUrl("http://example.com/feed.ics", {
      resolver: resolverFor({ "example.com": publicV4 }),
      ...PROD,
    });
    expect(r).toEqual({ ok: false, reason: "not_https" });
  });

  it("rejects other schemes (ftp:, file:, javascript:)", async () => {
    expect(await rejectionReason("ftp://example.com/x", PROD)).toBe("not_https");
    expect(await rejectionReason("file:///etc/passwd", PROD)).toBe("invalid_url");
    expect(await rejectionReason("javascript:alert(1)", PROD)).toBe("invalid_url");
  });

  it("rejects a literal private IP (10.x)", async () => {
    const r = await validateFeedUrl("https://10.0.0.5/feed.ics", PROD);
    expect(r).toEqual({ ok: false, reason: "unsafe_address" });
  });

  it("rejects loopback literal IP in production", async () => {
    const r = await validateFeedUrl("https://127.0.0.1/feed.ics", PROD);
    expect(r).toEqual({ ok: false, reason: "unsafe_address" });
  });

  it("rejects the cloud metadata IP literal", async () => {
    const r = await validateFeedUrl("https://169.254.169.254/latest/meta-data/", PROD);
    expect(r).toEqual({ ok: false, reason: "unsafe_address" });
  });

  it("rejects 192.168.x and 172.16-31.x literals", async () => {
    expect(await rejectionReason("https://192.168.1.1/", PROD)).toBe("unsafe_address");
    expect(await rejectionReason("https://172.16.0.1/", PROD)).toBe("unsafe_address");
    expect(await rejectionReason("https://172.31.255.255/", PROD)).toBe("unsafe_address");
  });

  it("rejects IPv6 loopback and unique-local literals", async () => {
    expect(await rejectionReason("https://[::1]/", PROD)).toBe("unsafe_address");
    expect(await rejectionReason("https://[fd00::1]/", PROD)).toBe("unsafe_address");
  });
});

describe("validateFeedUrl — DNS resolution", () => {
  it("rejects a hostname that resolves to a private IP", async () => {
    const r = await validateFeedUrl("https://internal.example/feed.ics", {
      resolver: resolverFor({ "internal.example": privateV4 }),
      ...PROD,
    });
    expect(r).toEqual({ ok: false, reason: "unsafe_address" });
  });

  it("rejects a hostname that resolves to loopback (DNS rebind to 127.0.0.1)", async () => {
    const r = await validateFeedUrl("https://evil.example/feed.ics", {
      resolver: resolverFor({ "evil.example": loopbackV4 }),
      ...PROD,
    });
    expect(r).toEqual({ ok: false, reason: "unsafe_address" });
  });

  it("rejects a hostname that resolves to the metadata IP", async () => {
    const r = await validateFeedUrl("https://meta.example/", {
      resolver: resolverFor({ "meta.example": metadataV4 }),
      ...PROD,
    });
    expect(r).toEqual({ ok: false, reason: "unsafe_address" });
  });

  it("rejects a hostname resolving to a ULA IPv6 address", async () => {
    const r = await validateFeedUrl("https://v6.example/", {
      resolver: resolverFor({ "v6.example": ulaV6 }),
      ...PROD,
    });
    expect(r).toEqual({ ok: false, reason: "unsafe_address" });
  });

  it("rejects when ANY resolved address is private (mixed A records)", async () => {
    const r = await validateFeedUrl("https://mixed.example/", {
      resolver: resolverFor({
        "mixed.example": [
          { address: "93.184.216.34", family: 4 },
          { address: "10.0.0.9", family: 4 },
        ],
      }),
      ...PROD,
    });
    expect(r).toEqual({ ok: false, reason: "unsafe_address" });
  });

  it("returns dns_failed when resolution throws (nonexistent host)", async () => {
    const throwingResolver = vi.fn(async () => {
      throw new Error("ENOTFOUND");
    }) as unknown as Resolver;
    const r = await validateFeedUrl("https://nope.example/", {
      resolver: throwingResolver,
      ...PROD,
    });
    expect(r).toEqual({ ok: false, reason: "dns_failed" });
  });

  it("returns dns_failed when resolution yields no addresses", async () => {
    const emptyResolver = vi.fn(async () => []) as unknown as Resolver;
    const r = await validateFeedUrl("https://empty.example/", {
      resolver: emptyResolver,
      ...PROD,
    });
    expect(r).toEqual({ ok: false, reason: "dns_failed" });
  });
});

describe("validateFeedUrl — dev exception", () => {
  it("allows loopback + http:// in dev (test feeds)", async () => {
    const r = await validateFeedUrl("http://localhost:3001/api/test/ical/airbnb-sample.ics", {
      resolver: resolverFor({ localhost: loopbackV4 }),
      ...DEV,
    });
    expect(r).toEqual({ ok: true, url: "http://localhost:3001/api/test/ical/airbnb-sample.ics" });
  });

  it("still blocks non-loopback http:// in dev", async () => {
    const r = await validateFeedUrl("http://example.com/feed.ics", {
      resolver: resolverFor({ "example.com": publicV4 }),
      ...DEV,
    });
    expect(r).toEqual({ ok: false, reason: "not_https" });
  });

  it("still blocks private IPs in dev", async () => {
    // http:// + non-loopback → rejected at the scheme gate (not_https)
    // before the IP check even runs. Either way: still blocked.
    const r = await validateFeedUrl("http://10.0.0.5/", DEV);
    expect(r.ok).toBe(false);
  });

  it("still blocks a private IP literal over HTTPS in dev", async () => {
    const r = await validateFeedUrl("https://10.0.0.5/", DEV);
    expect(r).toEqual({ ok: false, reason: "unsafe_address" });
  });
});

describe("fetchPublicFeedUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns a generic error for an invalid URL (never leaks the reason)", async () => {
    // 127.0.0.1 over http in prod → rejected (scheme gate). The detail
    // must stay generic regardless of the specific reason.
    const r = await fetchPublicFeedUrl("http://127.0.0.1/", PROD);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toBe(FEED_URL_ERROR);
  });

  it("fetches and returns the body for a valid public HTTPS URL", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("BEGIN:VCALENDAR\n...\nEND:VCALENDAR", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const r = await fetchPublicFeedUrl("https://example.com/feed.ics", {
      resolver: resolverFor({ "example.com": publicV4 }),
      ...PROD,
    });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toContain("VCALENDAR");
  });

  it("returns http_error detail when the target responds with a bad status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404, statusText: "Not Found" })),
    );

    const r = await fetchPublicFeedUrl("https://example.com/feed.ics", {
      resolver: resolverFor({ "example.com": publicV4 }),
      ...PROD,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toBe("HTTP 404: Not Found");
  });

  it("returns fetch_failed when the fetch itself rejects (network error)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }));

    const r = await fetchPublicFeedUrl("https://example.com/feed.ics", {
      resolver: resolverFor({ "example.com": publicV4 }),
      ...PROD,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toBe("ECONNREFUSED");
  });

  it("reports a timeout message when the fetch aborts", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("The operation was aborted");
    }));

    const r = await fetchPublicFeedUrl("https://example.com/feed.ics", {
      resolver: resolverFor({ "example.com": publicV4 }),
      ...PROD,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toBe("Connection timed out (15s)");
  });
});
