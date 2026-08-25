import { describe, it, expect } from "vitest";
import { isValidSeoLocale, mergeSeo, normalizeSeoPath, type SeoData } from "./seo";

describe("normalizeSeoPath", () => {
  it("returns root for empty / whitespace / non-string input", () => {
    expect(normalizeSeoPath("")).toBe("/");
    expect(normalizeSeoPath("   ")).toBe("/");
    // @ts-expect-error — runtime guard for non-string callers
    expect(normalizeSeoPath(undefined)).toBe("/");
    // @ts-expect-error — runtime guard for non-string callers
    expect(normalizeSeoPath(null)).toBe("/");
  });

  it("prepends a leading slash when missing", () => {
    expect(normalizeSeoPath("about")).toBe("/about");
    expect(normalizeSeoPath("onboard/step")).toBe("/onboard/step");
  });

  it("strips querystring + fragment", () => {
    expect(normalizeSeoPath("/about?utm=x#hash")).toBe("/about");
    expect(normalizeSeoPath("/privacy#section")).toBe("/privacy");
  });

  it("drops trailing slash but preserves root", () => {
    expect(normalizeSeoPath("/about/")).toBe("/about");
    expect(normalizeSeoPath("/dashboard/settings/")).toBe("/dashboard/settings");
    expect(normalizeSeoPath("/")).toBe("/");
  });

  it("collapses repeated slashes", () => {
    expect(normalizeSeoPath("//about")).toBe("/about");
    expect(normalizeSeoPath("/dashboard//settings")).toBe("/dashboard/settings");
  });

  it("caps length at 256 chars", () => {
    const long = "/" + "a".repeat(300);
    expect(normalizeSeoPath(long).length).toBe(256);
  });
});

describe("isValidSeoLocale", () => {
  it("accepts every supported locale", () => {
    expect(isValidSeoLocale("en")).toBe(true);
    expect(isValidSeoLocale("es")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isValidSeoLocale("EN")).toBe(false);
    // `xx` is the ISO standard test-reserved locale code — never a real
    // locale, safe as a negative case across any locale set extension.
    expect(isValidSeoLocale("xx")).toBe(false);
    expect(isValidSeoLocale("")).toBe(false);
    expect(isValidSeoLocale("en-US")).toBe(false);
  });
});

describe("mergeSeo", () => {
  const defaults: SeoData = {
    title: "Default title",
    description: "Default description",
    ogImage: "https://example.com/og.png",
    canonical: null,
  };

  it("returns defaults verbatim when no override", () => {
    expect(mergeSeo(defaults, undefined)).toEqual(defaults);
  });

  it("override fields win when present", () => {
    const override: SeoData = {
      title: "Custom title",
      description: null,
      ogImage: null,
      canonical: "https://propical.com.br/about",
    };
    expect(mergeSeo(defaults, override)).toEqual({
      title: "Custom title",
      description: "Default description",
      ogImage: "https://example.com/og.png",
      canonical: "https://propical.com.br/about",
    });
  });

  it("override of null leaves defaults intact (not erased)", () => {
    const override: SeoData = {
      title: null,
      description: null,
      ogImage: null,
      canonical: null,
    };
    expect(mergeSeo(defaults, override)).toEqual(defaults);
  });

  it("works with all-null defaults (fresh install)", () => {
    const blankDefaults: SeoData = {
      title: null,
      description: null,
      ogImage: null,
      canonical: null,
    };
    const override: SeoData = {
      title: "Custom",
      description: "Custom desc",
      ogImage: null,
      canonical: null,
    };
    expect(mergeSeo(blankDefaults, override)).toEqual({
      title: "Custom",
      description: "Custom desc",
      ogImage: null,
      canonical: null,
    });
  });
});
