// Localised data for the message-templates panel
// (`message-templates-panel.tsx`). A template's `language` is stored as
// a plain code (pt/es/en) and never renamed: native language names are
// identical in every app locale, so a single table drives the template
// badge mapping. The language is set from the host's app locale on
// create and preserved on edit — there is no language picker (the
// templates are DB content, not site i18n).
//
// The variable *tokens* (`{{guestName}}` …) are structural and stay
// identical across locales — only the tooltip description and the
// preview sample values change, so a pt host previewing a template sees
// "Maria Silva" and dd/mm/aaaa dates, not "John Smith".

import type { Locale } from "@/lib/i18n/translations";

export interface LanguageOption {
  value: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "pt", label: "Português" },
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

/** Map a stored template-language code to its native name. Unknown /
 *  legacy codes (e.g. the removed `ru`) fall through to the raw code. */
export const languageName = (code: string): string =>
  LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? code;

export interface VarHint {
  token: string;
  desc: string;
}

/** Token tooltips — the 5 supported tokens, per host locale. */
export const VAR_HINTS: Record<Locale, VarHint[]> = {
  en: [
    { token: "{{guestName}}", desc: "Guest name" },
    { token: "{{checkIn}}", desc: "Check-in date" },
    { token: "{{checkOut}}", desc: "Check-out date" },
    { token: "{{wifiPassword}}", desc: "Wi-Fi password" },
    { token: "{{propertyName}}", desc: "Property name" },
  ],
  pt: [
    { token: "{{guestName}}", desc: "Nome do hóspede" },
    { token: "{{checkIn}}", desc: "Data de entrada" },
    { token: "{{checkOut}}", desc: "Data de saída" },
    { token: "{{wifiPassword}}", desc: "Senha do Wi-Fi" },
    { token: "{{propertyName}}", desc: "Nome da propriedade" },
  ],
  es: [
    { token: "{{guestName}}", desc: "Nombre del huésped" },
    { token: "{{checkIn}}", desc: "Fecha de entrada" },
    { token: "{{checkOut}}", desc: "Fecha de salida" },
    { token: "{{wifiPassword}}", desc: "Contraseña del Wi-Fi" },
    { token: "{{propertyName}}", desc: "Nombre del alojamiento" },
  ],
};

/** Preview sample values for the rendered-template preview — same keys
 *  as VAR_HINTS tokens, per host locale. */
export const SAMPLE_VARS: Record<Locale, Record<string, string>> = {
  en: {
    guestName: "John Smith",
    checkIn: "2026-06-12",
    checkOut: "2026-06-19",
    wifiPassword: "propical-12345",
    propertyName: "Sample Property",
  },
  pt: {
    guestName: "Maria Silva",
    checkIn: "12/06/2026",
    checkOut: "19/06/2026",
    wifiPassword: "propical-12345",
    propertyName: "Propriedade de exemplo",
  },
  es: {
    guestName: "María García",
    checkIn: "12/06/2026",
    checkOut: "19/06/2026",
    wifiPassword: "propical-12345",
    propertyName: "Alojamiento de ejemplo",
  },
};
