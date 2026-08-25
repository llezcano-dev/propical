"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { OPERATOR_EMAIL, REPO_URL } from "@/lib/site";

// Footer for the logged-in app shell — Privacy, Terms, GitHub source, support.
export function SupportFooter() {
  const { t } = useI18n();

  return (
    <div className="border-t border-border bg-surface px-4 py-3 text-center text-caption text-text-faint">
      <p className="mb-1.5 text-sm text-text-faint">
        {t("footer.cookiesNote")}{" "}
        <Link href="/privacy" className="underline hover:text-text-secondary">{t("footer.privacy")}</Link>.
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        <span>© 2026 Propical</span>
        <Link href="/privacy" className="hover:text-text-secondary">{t("footer.privacy")}</Link>
        <Link href="/terms" className="hover:text-text-secondary">{t("footer.terms")}</Link>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-text-secondary"
        >
          {t("footer.source")}
        </a>
        <a href={`mailto:${OPERATOR_EMAIL}`} className="hover:text-text-secondary">
          {t("footer.contact")}
        </a>
        <LocaleSwitcher variant="inline" reloadOnChange={false} />
      </nav>
    </div>
  );
}
