"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

// Language & theme sub-route. Wraps the existing
// ThemeToggle + LocaleSwitcher components in a labelled card layout
// instead of duplicating their logic.

interface CopyShape {
  title: string;
  subtitle: string;
  theme: string;
  themeHint: string;
  language: string;
  languageHint: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    title: "Language & theme",
    subtitle: "Saved per-browser — pick again on other devices.",
    theme: "Theme",
    themeHint: "Light or dark.",
    language: "Interface language",
    languageHint: "English or Russian.",
  },
  pt: {
    title: "Idioma e tema",
    subtitle: "Estas preferências são salvas por navegador: escolha-as novamente em seus outros dispositivos.",
    theme: "Tema",
    themeHint: "Claro ou escuro.",
    language: "Idioma da interface",
    languageHint: "Inglês, português ou espanhol.",
  },
  es: {
    title: "Idioma y tema",
    subtitle: "Estas preferencias se guardan por navegador: vuelva a elegirlas en sus otros dispositivos.",
    theme: "Tema",
    themeHint: "Claro u oscuro.",
    language: "Idioma de la interfaz",
    languageHint: "Inglés, ruso, alemán, francés o español.",
  },
};

export default function AdminPreferencesPage() {
  const { locale } = useI18n();
  const t = COPY[locale];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="rounded-xl border border-border bg-surface-raised">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-medium text-text-primary">
              {t.theme}
            </h3>
            <p className="mt-0.5 text-xs text-text-faint">
              {t.themeHint}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h3 className="text-sm font-medium text-text-primary">
              {t.language}
            </h3>
            <p className="mt-0.5 text-xs text-text-faint">
              {t.languageHint}
            </p>
          </div>
          <LocaleSwitcher />
        </div>
      </div>
    </div>
  );
}
