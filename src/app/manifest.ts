import type { MetadataRoute } from "next";
import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/translations";

/**
 * PWA manifest. Per-locale because the `name` / `description` /
 * `lang` fields surface in the OS install dialog and the eventual
 * home-screen label. A visitor installing the app sees a description
 * in their locale, and the OS tags the installed app with its `lang`
 * (which influences IME selection + screen-reader voice on some
 * platforms).
 *
 * Brand casing convention: `name` uses the proper-noun form "Propical";
 * `short_name` is the fixed lowercase wordmark "propical" — it never
 * translates.
 *
 * Adding a new language: extend the LOCALIZED block below. The
 * fallback path is English. `getLocale()` already resolves the URL
 * prefix → cookie → default chain, so this manifest reflects whatever
 * locale the install was initiated under.
 */

const LOCALIZED: Record<Locale, { name: string; description: string; lang: string }> = {
  en: {
    name: "Propical",
    description:
      "Free, open-source property manager for short-term rental hosts. Sync Airbnb + Booking.com, automate cleaning.",
    lang: "en",
  },
  pt: {
    name: "Propical",
    description:
      "Gestor gratuito e open-source para anfitriões de aluguel de temporada. Sincronize Airbnb e Booking.com, automatize limpezas.",
    lang: "pt",
  },
  es: {
    name: "Propical",
    description:
      "Gestor de código abierto y gratuito para anfitriones de alquiler vacacional. Sincronice Airbnb y Booking.com y automatice las limpiezas.",
    lang: "es",
  },
};

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocale();
  const copy = LOCALIZED[locale];
  return {
    name: copy.name,
    // Fixed lowercase wordmark — the home-screen label is brand, not prose.
    short_name: "propical",
    description: copy.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#5B21B6", // --acai
    background_color: "#FAF5EC", // --areia
    lang: copy.lang,
    icons: [
      // SVG goes first so any browser that can rasterise it gets the
      // sharpest possible icon at any zoom level. PNG fallbacks for
      // stricter installers (Lighthouse audits PWA icon as PNG).
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
