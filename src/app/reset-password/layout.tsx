import type { Metadata } from "next";
import { applySeoOverrides } from "@/lib/seo";
import { getLocale } from "@/lib/i18n/server";
import { localizedAlternates } from "@/lib/i18n/alternates";
import { toOgLocale } from "@/lib/i18n/locale-tags";
import type { Locale } from "@/lib/i18n/translations";

// See login/layout.tsx — title template appends "· Propical" automatically.
const RESET_COPY: Record<Locale, { title: string; description: string }> = {
  en: {
    title: "Reset password",
    description: "Reset your Propical account password with a code sent to your email.",
  },
  pt: {
    title: "Redefinir senha",
    description: "Redefina a senha da sua conta Propical com um código enviado ao seu e-mail.",
  },
  es: {
    title: "Restablecer contraseña",
    description: "Restablezca la contraseña de su cuenta Propical con un código enviado a su correo.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = RESET_COPY[locale];
  const alts = localizedAlternates("/reset-password", locale);
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
  return applySeoOverrides(base, "/reset-password", locale);
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
