"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";

// Inline SVG flags. We can't use 🇬🇧 / 🇷🇺 emojis here because Windows
// desktop browsers render regional indicator chars as plain letters
// (you see "GB" / "RU" boxes instead of a flag) — fine on iOS / Android /
// Mac which ship a flag-capable emoji font, broken on Windows. SVGs
// dodge the OS font fallback entirely.
function FlagGB({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="white" strokeWidth="3.2" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M12 0 V16 M0 8 H24" stroke="white" strokeWidth="5.3" />
      <path d="M12 0 V16 M0 8 H24" stroke="#C8102E" strokeWidth="3.2" />
    </svg>
  );
}

function FlagES({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="4" y="0" fill="#AA151B" />
      <rect width="24" height="8" y="4" fill="#F1BF00" />
      <rect width="24" height="4" y="12" fill="#AA151B" />
    </svg>
  );
}

function FlagBR({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#009B3A" />
      <path d="M12 2 L2 8 L12 14 L22 8 Z" fill="#FEDF00" />
      <circle cx="12" cy="8" r="3" fill="#002776" />
    </svg>
  );
}

function FlagFor({ code, className }: { code: Locale; className?: string }) {
  if (code === "es") return <FlagES className={className} />;
  if (code === "pt") return <FlagBR className={className} />;
  return <FlagGB className={className} />;
}

interface LocaleOption {
  code: Locale;
  short: string;
  label: string;
}

const OPTIONS: LocaleOption[] = [
  { code: "en", short: "EN", label: "English" },
  { code: "pt", short: "BR", label: "Português" },
  { code: "es", short: "ES", label: "Español" },
];

interface LocaleSwitcherProps {
  variant?: "dropdown" | "inline";
  className?: string;
  reloadOnChange?: boolean;
}

export function LocaleSwitcher({
  variant = "dropdown",
  className = "",
  reloadOnChange = true,
}: LocaleSwitcherProps) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // URL is authoritative for locale (Google needs distinct URLs per
  // language). Cookie is still set as a soft preference so middleware
  // can fall back when a visitor lands on a non-localizable path.
  //
  // Hard navigation (window.location.assign) instead of router.push:
  // App Router's soft navigation reuses the React tree across locale
  // variants because both URLs render via the same page file
  // (middleware rewrites internally). The header reflows from the
  // I18n context flip, but the server-rendered body keeps its old
  // RSC payload — visually the page header changes language while
  // the article body stays in the original language. A real reload
  // forces middleware to re-resolve x-locale from the new URL prefix
  // and the server component to re-render against it. Slight cost
  // (~200-400ms full page load vs instant soft transition), worth
  // it for the language switch — it's a once-per-session action and
  // partial-flip looks broken.
  const choose = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    setLocale(next);
    // reloadOnChange=false: the caller's page is rendered entirely
    // client-side via t() (the auth screens), so the setLocale above
    // already re-renders every string in the new language. Skipping
    // the navigation keeps in-progress React state — a half-entered
    // verification code, the "enter your code" step — instead of
    // remounting the page back to its first step.
    if (!reloadOnChange) return;
    // Cookie-based locale: the URL never changes with the language. A
    // reload forces the server to re-resolve x-locale from the new
    // cookie and re-render the server-rendered body in the new language.
    window.location.reload();
  };

  if (variant === "inline") {
    return (
      <div
        className={`flex items-center rounded-md border border-border-strong overflow-hidden ${className}`}
        role="group"
        aria-label="Language"
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.code}
            type="button"
            onClick={() => choose(opt.code)}
            aria-pressed={locale === opt.code}
            className={`px-2 py-1 text-sm transition-colors ${
              locale === opt.code
                ? "bg-surface-hover text-text-primary"
                : "text-text-faint hover:text-text-secondary"
            }`}
          >
            {opt.short}
          </button>
        ))}
      </div>
    );
  }

  const current = OPTIONS.find((o) => o.code === locale) ?? OPTIONS[0];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        className="flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-text-secondary hover:border-text-primary/40 hover:text-text-primary transition-colors"
      >
        <FlagFor code={current.code} className="h-3 w-[18px] rounded-[1px] border border-border-strong" />
        <span>{current.short}</span>
        <svg
          className={`h-3 w-3 text-text-faint transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-border-strong bg-surface-raised p-1 shadow-xl shadow-black/40"
        >
          {OPTIONS.map((opt) => (
            <li key={opt.code} role="none">
              <button
                type="button"
                role="option"
                aria-selected={locale === opt.code}
                onClick={() => choose(opt.code)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  locale === opt.code
                    ? "bg-surface-hover text-text-primary"
                    : "text-text-secondary hover:bg-surface-hover"
                }`}
              >
                <FlagFor code={opt.code} className="h-3.5 w-[21px] shrink-0 rounded-[1px] border border-border-strong" />
                <span className="flex-1 text-left">{opt.label}</span>
                {locale === opt.code && (
                  <svg
                    className="h-3.5 w-3.5 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
