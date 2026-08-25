import { describe, expect, it } from "vitest";
import {
  LANGUAGE_OPTIONS,
  SAMPLE_VARS,
  VAR_HINTS,
  languageName,
} from "./message-template-i18n";

const LOCALES = ["en", "pt", "es"] as const;
const TOKENS = ["{{guestName}}", "{{checkIn}}", "{{checkOut}}", "{{wifiPassword}}", "{{propertyName}}"];
const SAMPLE_KEYS = ["guestName", "checkIn", "checkOut", "wifiPassword", "propertyName"];

describe("languageName", () => {
  it("maps known codes to native names", () => {
    expect(languageName("pt")).toBe("Português");
    expect(languageName("es")).toBe("Español");
    expect(languageName("en")).toBe("English");
  });

  it("falls back to the raw code for legacy / unknown values", () => {
    expect(languageName("ru")).toBe("ru");
    expect(languageName("")).toBe("");
    expect(languageName("xyz")).toBe("xyz");
  });

  it("LANGUAGE_OPTIONS covers every stored template language", () => {
    const values = LANGUAGE_OPTIONS.map((o) => o.value);
    expect(values).toEqual(["pt", "es", "en"]);
    LANGUAGE_OPTIONS.forEach((o) => expect(o.label).toBeTruthy());
  });
});

describe("VAR_HINTS", () => {
  it("exposes the same 5 tokens for every locale", () => {
    for (const locale of LOCALES) {
      const tokens = VAR_HINTS[locale].map((v) => v.token);
      expect(tokens).toEqual(TOKENS);
    }
  });

  it("has a non-empty description for every token in every locale", () => {
    for (const locale of LOCALES) {
      for (const v of VAR_HINTS[locale]) {
        expect(v.desc.trim().length, `${locale} ${v.token}`).toBeGreaterThan(0);
      }
    }
  });

  it("tokens stay structural (identical) across locales", () => {
    expect(VAR_HINTS.pt.map((v) => v.token)).toEqual(VAR_HINTS.en.map((v) => v.token));
    expect(VAR_HINTS.es.map((v) => v.token)).toEqual(VAR_HINTS.en.map((v) => v.token));
  });

  it("desc is actually localised (differs from English at least once)", () => {
    expect(VAR_HINTS.pt[0].desc).not.toBe(VAR_HINTS.en[0].desc);
    expect(VAR_HINTS.es[0].desc).not.toBe(VAR_HINTS.en[0].desc);
  });
});

describe("SAMPLE_VARS", () => {
  it("covers the same 5 keys as the tokens for every locale", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(SAMPLE_VARS[locale]).sort()).toEqual([...SAMPLE_KEYS].sort());
    }
  });

  it("has non-empty sample values in every locale", () => {
    for (const locale of LOCALES) {
      for (const k of SAMPLE_KEYS) {
        expect(SAMPLE_VARS[locale][k].trim().length, `${locale} ${k}`).toBeGreaterThan(0);
      }
    }
  });

  it("localises guest names and dates (dd/mm/yyyy for pt/es)", () => {
    expect(SAMPLE_VARS.pt.guestName).not.toBe(SAMPLE_VARS.en.guestName);
    expect(SAMPLE_VARS.es.guestName).not.toBe(SAMPLE_VARS.en.guestName);
    expect(SAMPLE_VARS.pt.checkIn).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(SAMPLE_VARS.es.checkOut).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});
