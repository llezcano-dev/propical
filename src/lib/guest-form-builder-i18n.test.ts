import { describe, expect, it } from "vitest";
import {
  FIELD_TYPES,
  GUEST_FORM_BUILDER_COPY,
  SUGGESTED,
  TYPE_LABELS,
  WITH_OPTIONS,
} from "./guest-form-builder-i18n";
import { GUEST_UI_COPY } from "./guest-form-i18n";

const LOCALES = ["en", "pt", "es"] as const;

// Placeholder / translation-editor strings that must be gone after the
// pt-only strip. If any of these shows up in a COPY value, the strip
// missed a key.
const FORBIDDEN = [
  "English",
  "Translate the form into",
  "Build the form in English",
  "(base)",
  "Language",
  "Translated form title",
  "Translated question label",
  "English help text",
];

/** Asserts a copy value renders to a non-empty string: strings pass
 *  through, functions are called with a sample argument. */
function expectNonEmpty(v: unknown, label: string) {
  if (typeof v === "function") {
    const out = (v as (arg: string) => string)("Propriedade Teste");
    expect(typeof out, label).toBe("string");
    expect(out.trim().length, label).toBeGreaterThan(0);
  } else {
    expect(typeof v, label).toBe("string");
    expect((v as string).trim().length, label).toBeGreaterThan(0);
  }
}

describe("FIELD_TYPES", () => {
  it("exposes the same 10 field types in every locale", () => {
    for (const locale of LOCALES) {
      expect(FIELD_TYPES[locale].length, locale).toBe(10);
    }
  });

  it("keeps the same type keys across locales (sorted)", () => {
    const keys = (l: (typeof LOCALES)[number]) =>
      FIELD_TYPES[l].map((t) => t.type).sort();
    expect(keys("pt")).toEqual(keys("en"));
    expect(keys("es")).toEqual(keys("en"));
  });

  it("has non-empty labels and hints in every locale", () => {
    for (const locale of LOCALES) {
      for (const t of FIELD_TYPES[locale]) {
        expect(t.label.trim().length, `${locale} ${t.type} label`).toBeGreaterThan(0);
        expect(t.hint.trim().length, `${locale} ${t.type} hint`).toBeGreaterThan(0);
      }
    }
  });

  it("TYPE_LABELS mirrors FIELD_TYPES labels", () => {
    for (const locale of LOCALES) {
      for (const t of FIELD_TYPES[locale]) {
        expect(TYPE_LABELS[locale][t.type]).toBe(t.label);
      }
    }
  });

  it("WITH_OPTIONS covers exactly the option-carrying types", () => {
    expect([...WITH_OPTIONS].sort()).toEqual(["multi-select", "select"]);
  });
});

describe("SUGGESTED", () => {
  it("is a single non-empty pt array", () => {
    expect(SUGGESTED.length).toBeGreaterThan(0);
  });

  it("has a non-empty label for every suggestion", () => {
    for (const s of SUGGESTED) {
      expect(s.label.trim().length, s.label).toBeGreaterThan(0);
    }
  });

  it("uses only known field types", () => {
    const known = new Set(FIELD_TYPES.pt.map((t) => t.type));
    for (const s of SUGGESTED) {
      expect(known.has(s.type), s.label).toBe(true);
    }
  });
});

describe("GUEST_FORM_BUILDER_COPY", () => {
  it("renders every key to a non-empty string in every locale", () => {
    for (const locale of LOCALES) {
      const copy = GUEST_FORM_BUILDER_COPY[locale];
      for (const [key, value] of Object.entries(copy)) {
        expectNonEmpty(value, `${locale}.${key}`);
      }
    }
  });

  it("has no leftover translation-editor placeholder text", () => {
    for (const locale of LOCALES) {
      const copy = GUEST_FORM_BUILDER_COPY[locale];
      for (const [key, value] of Object.entries(copy)) {
        const text =
          typeof value === "function" ? (value as (a: string) => string)("X") : value;
        for (const bad of FORBIDDEN) {
          expect(text.includes(bad), `${locale}.${key} contains ${bad!}`).toBe(false);
        }
      }
    }
  });
});

describe("GUEST_UI_COPY", () => {
  it("renders every top-level key to a non-empty string", () => {
    for (const [key, value] of Object.entries(GUEST_UI_COPY)) {
      if (key === "privacy") continue;
      expectNonEmpty(value, `GUEST_UI_COPY.${key}`);
    }
  });

  it("has a fully populated privacy panel", () => {
    const p = GUEST_UI_COPY.privacy;
    expect(p.title.trim().length).toBeGreaterThan(0);
    expect(p.summary.trim().length).toBeGreaterThan(0);
    expect(p.showDetails.trim().length).toBeGreaterThan(0);
    expect(p.hideDetails.trim().length).toBeGreaterThan(0);
    expect(p.fullPolicyLabel.trim().length).toBeGreaterThan(0);
    expect(p.sourceLinkLabel.trim().length).toBeGreaterThan(0);
    expect(p.bullets.length).toBeGreaterThan(0);
    for (const b of p.bullets) {
      expect(b.title.trim().length).toBeGreaterThan(0);
      expect(b.body.trim().length).toBeGreaterThan(0);
    }
  });
});