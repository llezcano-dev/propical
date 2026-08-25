import { describe, it, expect } from "vitest";
import { translations, type Locale } from "./translations";

const LOCALES: Locale[] = ["en", "pt", "es"];

describe("translations — locale completeness", () => {
  const keys = Object.keys(translations) as (keyof typeof translations)[];

  it("has entries", () => {
    expect(keys.length).toBeGreaterThan(0);
  });

  it.each(LOCALES)(
    "every key defines a non-empty %s string",
    (locale) => {
      for (const key of keys) {
        const entry = translations[key];
        const value = entry[locale];
        expect(value, `${key} is missing ${locale}`).toBeDefined();
        expect(
          value.trim(),
          `${key} has an empty ${locale} string`,
        ).not.toBe("");
      }
    },
  );

  it("interpolates only known params — no dangling braces", () => {
    // Templates use {param} placeholders (e.g. signup.checkEmailSubtitle).
    // A lone "{" or "}" usually means a broken template.
    for (const key of keys) {
      for (const locale of LOCALES) {
        const value = translations[key][locale];
        const opens = (value.match(/\{/g) ?? []).length;
        const closes = (value.match(/\}/g) ?? []).length;
        expect(opens, `${key}[${locale}] has unbalanced braces`).toBe(closes);
      }
    }
  });
});
