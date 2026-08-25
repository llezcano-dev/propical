import type { Metadata } from "next";
import { applySeoOverrides } from "@/lib/seo";
import { getLocale } from "@/lib/i18n/server";
import { localizedAlternates } from "@/lib/i18n/alternates";
import { toOgLocale } from "@/lib/i18n/locale-tags";
import type { Locale } from "@/lib/i18n/translations";

// See signup/layout.tsx — title template appends "· Propical" automatically.
const LOGIN_COPY: Record<Locale, { title: string; description: string }> = {
  en: {
    title: "Sign in",
    description:
      "Sign in to Propical to manage your short-term rental calendars, cleaning schedules, and guest data.",
  },
  pt: {
    title: "Entrar",
    description:
      "Entre no Propical para gerenciar seus calendários de aluguel de temporada, cronogramas de limpeza e dados de hóspedes.",
  },
  es: {
    title: "Iniciar sesión",
    description:
      "Inicie sesión en Propical para gestionar los calendarios de su alquiler vacacional, los planes de limpieza y los datos de los huéspedes.",
  },
};

// /login needs its own canonical — see signup/layout.tsx for the
// "inherited canonical = deindex" rationale.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = LOGIN_COPY[locale];
  const alts = localizedAlternates("/login", locale);
  const base: Metadata = {
    title: copy.title,
    description: copy.description,
    alternates: alts,
    openGraph: {
      type: "website",
      title: copy.title,
      description: copy.description,
      url: alts.canonical,
      siteName: "Propical",
      locale: toOgLocale(locale),
    },
    twitter: { card: "summary_large_image", title: copy.title, description: copy.description },
  };
  return applySeoOverrides(base, "/login", locale);
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
