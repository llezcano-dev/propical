import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SITE_URL } from "@/lib/i18n/alternates";

// sitemap.ts reads process.env at module load (STATIC_LASTMOD IIFE).
// vitest caches imported modules, so a later vi.stubEnv wouldn't affect
// the already-loaded module — reset the registry before each import to
// let every test re-evaluate the env at load time.
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function loadSitemap() {
  const { default: sitemap } = await import("./sitemap");
  return sitemap();
}

describe("sitemap", () => {
  it("emits every public static surface, one entry per path", async () => {
    const entries = await loadSitemap();

    const paths = entries.map((e) => e.url.replace(`${SITE_URL}`, ""));
    expect(paths.sort()).toEqual(
      ["/", "/onboard", "/signup", "/login", "/terms", "/privacy"].sort(),
    );
  });

  it("sorts priorities as landing > onboarding > auth > legal", async () => {
    const entries = await loadSitemap();
    const byPath = new Map(entries.map((e) => [e.url.replace(`${SITE_URL}`, ""), e]));

    // Marketing surfaces rank above transactional/legal ones.
    expect(byPath.get("/")!.priority).toBe(1.0);
    expect(byPath.get("/onboard")!.priority).toBe(0.9);
    expect(byPath.get("/signup")!.priority).toBe(0.8);
    expect(byPath.get("/login")!.priority).toBe(0.6);
    expect(byPath.get("/terms")!.priority).toBe(0.3);
    expect(byPath.get("/privacy")!.priority).toBe(0.3);
  });

  it("marks legal pages as yearly and the rest as monthly/weekly", async () => {
    const entries = await loadSitemap();
    const byPath = new Map(entries.map((e) => [e.url.replace(`${SITE_URL}`, ""), e]));

    expect(byPath.get("/terms")!.changeFrequency).toBe("yearly");
    expect(byPath.get("/privacy")!.changeFrequency).toBe("yearly");
    expect(byPath.get("/")!.changeFrequency).toBe("weekly");
    expect(byPath.get("/onboard")!.changeFrequency).toBe("monthly");
    expect(byPath.get("/login")!.changeFrequency).toBe("monthly");
  });

  it("points every entry at the canonical bare URL with x-default alternate", async () => {
    const entries = await loadSitemap();
    for (const entry of entries) {
      expect(entry.url).toBe(`${SITE_URL}${entry.url.replace(`${SITE_URL}`, "")}`);
      expect(entry.alternates?.languages?.["x-default"]).toBe(entry.url);
    }
  });

  it("stays pinned to the deploy lastmod when env provides one", async () => {
    vi.stubEnv("SOURCE_DATE_EPOCH", "1700000000");
    const entries = await loadSitemap();
    const expected = new Date(1700000000 * 1000);
    for (const entry of entries) {
      expect(entry.lastModified).toBeInstanceOf(Date);
      expect((entry.lastModified as Date).getTime()).toBe(expected.getTime());
    }
  });
});
