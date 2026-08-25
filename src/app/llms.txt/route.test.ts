import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// route.ts reads SITE_URL from process.env at module load. vitest caches
// imported modules, so a later vi.stubEnv wouldn't affect the
// already-loaded module — reset the registry before each import to let
// every test re-evaluate the env at load time.
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function fetchLlmsTxt() {
  const { GET } = await import("./route");
  return GET();
}

describe("llms.txt", () => {
  it("serves a text/plain response with a short cache TTL", async () => {
    const res = await fetchLlmsTxt();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(res.headers.get("cache-control")).toContain("max-age=600");
  });

  it("introduces the product and lists the core public entry points", async () => {
    const res = await fetchLlmsTxt();
    const body = await res.text();

    expect(body).toContain("# Propical");
    expect(body).toMatch(/## Core docs/);
    expect(body).toMatch(/\[Sign up\]\([^)]*\/signup\)/);
    expect(body).toMatch(/\[Privacy policy\]\([^)]*\/privacy\)/);
    expect(body).toMatch(/\[Terms\]\([^)]*\/terms\)/);
    expect(body).toMatch(/\[Sitemap\]\([^)]*\/sitemap\.xml\)/);
  });

  it("points links at the configured SITE_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
    const res = await fetchLlmsTxt();
    const body = await res.text();

    expect(body).toContain("[Home](https://example.test/)");
    expect(body).toContain("[Sign up](https://example.test/signup)");
    expect(body).toContain("[Sitemap](https://example.test/sitemap.xml)");
  });

  it("falls back to the default site URL when no env is set", async () => {
    const res = await fetchLlmsTxt();
    const body = await res.text();

    expect(body).toContain("[Home](https://propical.com.br/)");
  });
});
