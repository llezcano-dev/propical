"use client";

import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n } from "@/lib/i18n/context";
import { useSession } from "@/lib/session-context";
import { REPO_URL } from "@/lib/site";

interface MarketingHeaderProps {
  /** Sticky variant for long-content pages. Off by
   *  default so the home page and onboarding wizard match. */
  sticky?: boolean;
  /** Switch language in place (no page reload) instead of hard-
   *  navigating to the locale-prefixed URL. Set on pages whose copy is
   *  entirely client-rendered via t() — the auth screens — so a
   *  language switch keeps in-progress form state (e.g. a half-typed
   *  verification code). Leave off for content pages that need the
   *  server body to re-render in the new locale. */
  softLocaleSwitch?: boolean;
}

const NAV_LABELS = {
  en: { signIn: "Sign in", getStarted: "Get started", dashboard: "Dashboard" },
  pt: { signIn: "Entrar", getStarted: "Começar", dashboard: "Painel" },
  es: { signIn: "Iniciar sesión", getStarted: "Comenzar", dashboard: "Panel" },
};

/**
 * Public-marketing header — used on the home page and /onboard.
 * Identical brand mark + nav across both so a visitor never sees the
 * chrome change while bouncing between them.
 *
 * Brand mark: ambar pill + noite house silhouette + areia sun (casa+sol).
 * Same geometry as `public/icon.svg` (24-unit viewBox),
 * statically — no SMIL smoke — so the header mark matches the favicon.
 * The sun + house use fixed brand colours because the pill keeps its ambar
 * background in both themes; the openings reuse var(--m-accent) so they
 * stay punched out of the pill in light and dark.
 *
 * Nav: GitHub · Sign in · Get started · ThemeToggle · LocaleSwitcher.
 * GitHub + Get started both hide on <sm to keep the small-screen header
 * to a single readable row.
 */
export function MarketingHeader({ sticky = false, softLocaleSwitch = false }: MarketingHeaderProps) {
  const { locale } = useI18n();
  const session = useSession();
  const t = NAV_LABELS[locale];
  const isAuthenticated = session !== null;
  // Cookie-based locale: the URL never changes with the language, so
  // internal links are always unprefixed. `localized` is a no-op kept
  // for call-site clarity.
  const localized = (href: string): string => href;
  return (
    <header
      className={
        sticky
          ? "sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md"
          : "border-b border-border"
      }
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <Link
          href={localized("/")}
          aria-label="propical home"
          className="group flex shrink-0 items-center gap-2 min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-action-primary/50"
        >
          <BrandMark />
          <span className="font-mono text-xl font-semibold tracking-[-0.02em] text-text-primary">
            propical
          </span>
        </Link>

        {/* Right cluster — uses shrink-0 + whitespace-nowrap on every
            child so the auth labels never wrap onto a second line at
            ~375px (previously "Sign in" wrapped to two lines because
            the cluster ran out of space). */}
        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-sm uppercase tracking-[0.09em] text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary sm:inline-flex"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
            </svg>
            GitHub
          </a>
          {isAuthenticated ? (
            // Already signed in — collapse Sign in + Get started into a
            // single Dashboard button. Anything else is the wrong call:
            // showing Sign in to a signed-in user is confusing, and a
            // separate Sign out belongs in the dashboard chrome (where
            // the user is when they want to leave), not in marketing
            // header that they hit while exploring landing/onboard pages.
            <Link
              href={localized("/dashboard")}
              className="whitespace-nowrap rounded-md bg-text-primary px-2.5 py-1 font-mono text-sm font-medium uppercase tracking-[0.09em] text-surface transition-colors hover:bg-text-secondary sm:px-3"
            >
              {t.dashboard}
            </Link>
          ) : (
            <>
              <Link
                href={localized("/login")}
                className="whitespace-nowrap rounded-md px-2.5 py-1 font-mono text-sm uppercase tracking-[0.09em] text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary sm:px-3"
              >
                {t.signIn}
              </Link>
              <Link
                href={localized("/onboard")}
                className="hidden whitespace-nowrap rounded-md bg-text-primary px-3 py-1 font-mono text-sm font-medium uppercase tracking-[0.09em] text-surface transition-colors hover:bg-text-secondary sm:inline-flex"
              >
                {t.getStarted}
              </Link>
            </>
          )}
          {/* Divider hidden on mobile — every pixel matters and the
              auth pill / locale switcher already provide visual
              separation via their own borders. */}
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
          <ThemeToggle />
          <LocaleSwitcher reloadOnChange={!softLocaleSwitch} />
        </nav>
      </div>
    </header>
  );
}
