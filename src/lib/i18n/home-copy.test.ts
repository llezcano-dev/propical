import { describe, it, expect } from "vitest";
import { HOME_META, homeCopy, getHomeCopy } from "./home-copy";
import type { HomeCopy } from "./home-copy";
import type { Locale } from "./translations";

const LOCALES: Locale[] = ["en", "pt", "es"];

/**
 * Collect every string-leaf path of a nested copy block (array items are
 * addressed by index) so locale blocks can be compared structurally:
 * two locales are "in parity" when they expose exactly the same leaves.
 */
function leafPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj === "string") return [prefix];
  if (Array.isArray(obj)) {
    return obj.flatMap((v, i) => leafPaths(v, `${prefix}[${i}]`));
  }
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      leafPaths(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

/** Resolve a leaf path like `hero.steps[0].title` against a copy block. */
function getAt(obj: unknown, path: string): string {
  // Normalize `a.b[0].c` → `a.b.0.c`; numeric string keys index arrays too.
  const segs = path.replace(/\[/g, ".").replace(/\]/g, "").split(".");
  let cur: unknown = obj;
  for (const seg of segs) {
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur as string;
}

describe("homeCopy — structural parity across locales", () => {
  const enPaths = leafPaths(homeCopy.en).sort();

  it("every locale exposes exactly the same string leaves as en", () => {
    for (const locale of ["pt", "es"] as Locale[]) {
      expect(leafPaths(homeCopy[locale]).sort()).toEqual(enPaths);
    }
  });

  it("no leaf is empty or whitespace-only in any locale", () => {
    for (const locale of LOCALES) {
      for (const path of enPaths) {
        const value = getAt(homeCopy[locale], path);
        expect(
          value.trim(),
          `${locale}:${path} is empty`,
        ).not.toBe("");
      }
    }
  });

  it("locale blocks are actual translations, not copies of en", () => {
    // Spot-check a stable, high-signal leaf per section: pt and es must
    // differ from en (catches a block accidentally duplicated verbatim).
    for (const path of [
      "hero.cta",
      "how.title",
      "features.titleA",
      "faq.items[0].q",
      "finalCta.body",
    ]) {
      const en = getAt(homeCopy.en, path);
      expect(getAt(homeCopy.pt, path)).not.toBe(en);
      expect(getAt(homeCopy.es, path)).not.toBe(en);
    }
  });
});

describe("homeCopy — content shape", () => {
  it.each(LOCALES)("%s: 3 how-steps, 5 features, 5 FAQs", (locale) => {
    const block = homeCopy[locale];
    expect(block.how.steps).toHaveLength(3);
    expect(block.features.items).toHaveLength(5);
    expect(block.faq.items).toHaveLength(5);
    for (const f of block.faq.items) {
      expect(f.q.trim()).not.toBe("");
      expect(f.a.length).toBeGreaterThan(f.q.length);
    }
  });

  it.each(LOCALES)(
    "%s: no stale removed-feature claims (passport OCR / Gemini)",
    (locale) => {
      // Regression guard for the 2026-08 Gemini/OCR removal: marketing
      // copy must never re-advertise the extracted-passport pipeline.
      const serialized = JSON.stringify(homeCopy[locale]).toLowerCase();
      expect(serialized).not.toMatch(/\bpassport\b/);
      expect(serialized).not.toMatch(/\bgemini\b/);
      expect(serialized).not.toMatch(/\bocr\b/);
      expect(serialized).not.toMatch(/\bvisa\b/);
      expect(serialized).not.toMatch(/\bvisado\b/);
    },
  );

  it.each(LOCALES)("%s: platform list matches across locales", (locale) => {
    // Brand names are not translated — every locale must enumerate the
    // same platforms so the hero reads consistently.
    expect(homeCopy[locale].hero.platforms).toBe(
      homeCopy.en.hero.platforms,
    );
  });
});

describe("getHomeCopy", () => {
  it("returns the exact block for each supported locale", () => {
    for (const locale of LOCALES) {
      expect(getHomeCopy(locale)).toBe(homeCopy[locale]);
    }
  });

  it("falls back to en for an unknown locale", () => {
    // `xx` is the ISO placeholder code — never a real locale.
    expect(getHomeCopy("xx" as Locale)).toBe(homeCopy.en);
  });
});

describe("HOME_META", () => {
  it("covers every supported locale with non-empty title + description", () => {
    for (const locale of LOCALES) {
      const meta = HOME_META[locale];
      expect(meta.title.trim()).not.toBe("");
      expect(meta.description.trim()).not.toBe("");
    }
  });

  it("titles are localized, not one shared English string", () => {
    const titles = LOCALES.map((l) => HOME_META[l].title);
    expect(new Set(titles).size).toBe(LOCALES.length);
  });
});

// Type-level smoke test: HomeCopy must stay assignable across locales so
// a missing section in one locale fails compilation, not production.
const _typeCheck: Record<Locale, HomeCopy> = homeCopy;
void _typeCheck;
