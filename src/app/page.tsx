import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { applySeoOverrides } from "@/lib/seo";
import { localePath } from "@/lib/i18n/alternates";
import { GoogleOneTap } from "@/components/google-one-tap";
import { JsonLd } from "@/components/json-ld";
import { MarketingHeader } from "@/components/marketing-header";
import { getLocale } from "@/lib/i18n/server";
import { getHomeCopy, homeCopy, HOME_META } from "@/lib/i18n/home-copy";
import { OPERATOR_EMAIL, REPO_URL } from "@/lib/site";

// Per-path SEO override hook. The root layout already supplies
// title / description / OG / canonical defaults; this lets a super-admin
// swap any of those for "/" specifically without redeploying.
//
// hreflang + per-language canonical is wired via `localizedAlternates`
// so Google indexes each language version separately and ranks each
// in its own market. The page lives at the same file regardless of
// locale, so the canonical is built from the resolved locale, not the
// file path.
//
// Per-locale title + description + OG locale are set here too (copy in
// `@/lib/i18n/home-copy`). Without them, the root layout's English
// defaults would leak through onto non-EN renders, giving Google a
// `<title>` / `og:description` that say one thing and a `<html lang>`
// body that says another — exactly the signal mismatch that drops a
// page out of a localized SERP.

export async function generateMetadata(): Promise<Metadata> {
  const { localizedAlternates, SUPPORTED_LOCALES } = await import("@/lib/i18n/alternates");
  const { toOgLocale } = await import("@/lib/i18n/locale-tags");
  const locale = await getLocale();
  const alts = localizedAlternates("/", locale);
  const meta = HOME_META[locale] ?? HOME_META.en;
  // OG `alternateLocale` declares the hreflang siblings inside the
  // OpenGraph block too — Facebook / LinkedIn use it the same way
  // Google uses `<link rel="alternate" hreflang>`.
  const alternateLocale = SUPPORTED_LOCALES
    .filter((l) => l !== locale)
    .map(toOgLocale);
  const ogLocale = toOgLocale(locale);
  return applySeoOverrides<Metadata>(
    {
      title: meta.title,
      description: meta.description,
      alternates: alts,
      openGraph: {
        type: "website",
        title: meta.title,
        description: meta.description,
        url: alts.canonical,
        siteName: "Propical",
        locale: ogLocale,
        alternateLocale,
      },
      twitter: {
        card: "summary_large_image",
        title: meta.title,
        description: meta.description,
      },
    },
    "/",
    locale,
  );
}

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: homeCopy.en.faq.items.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://propical.com.br";

// SoftwareApplication schema — describes the *product* Propical is.
// Distinct from the Organization block in the root layout (which
// describes the *publisher*). Required-by-Google fields: name, applicationCategory,
// operatingSystem, offers. The price=0 + priceCurrency=USD pair is what makes
// the "Free" badge appear in the rich result.
const SOFTWARE_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#software`,
  name: "Propical",
  description:
    "Free open-source property management software for short-term rental hosts. Cross-syncs Airbnb, Booking.com, and Vrbo iCal calendars; automates cleaning schedules; manages multi-property guest data.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Linux (self-host)",
  url: SITE_URL,
  softwareVersion: "1.0",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  publisher: { "@id": `${SITE_URL}/#organization` },
  featureList: [
    "Cross-platform iCal calendar sync",
    "Cleaning schedule automation",
    "Multi-property dashboard",
    "Per-property message templates",
    "GDPR-compliant data export and deletion",
  ],
};

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const locale = await getLocale();
  const t = getHomeCopy(locale);

  return (
    <div className="editorial min-h-screen flex flex-col">
      <JsonLd data={FAQ_LD} />
      <JsonLd data={SOFTWARE_LD} />
      <GoogleOneTap />

      <MarketingHeader />

      {/* ─────────────── Hero ─────────────── */}
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0 pointer-events-none opacity-60" aria-hidden="true" />
        <div className="calendar-pills absolute inset-0 pointer-events-none" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1180px] px-4 pt-16 sm:px-6 pb-16 text-center sm:pt-20 sm:pb-20">
          <p className="hero-in mono mb-5 inline-block rounded-full bg-surface-raised px-3 py-1 text-sm uppercase tracking-[0.14em] text-text-muted">
            {t.hero.eyebrow}
          </p>
          <h1 className="hero-in hero-in-2 display mx-auto max-w-[820px] text-[36px] font-semibold leading-[1.05] tracking-[-0.03em] text-text-primary sm:text-[52px] lg:text-[60px]">
            {t.hero.titleLead}{" "}
            <span className="relative whitespace-nowrap">
              <span className="italic font-normal">{t.hero.titleAccent}</span>
              <svg
                className="absolute left-0 right-0 -bottom-1 sm:-bottom-1.5"
                width="100%"
                height="10"
                viewBox="0 0 220 10"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  className="underline-draw"
                  d="M2 6 Q 55 1, 110 5 T 218 5"
                  fill="none"
                  stroke="var(--m-accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            .
          </h1>
          <p className="hero-in hero-in-3 mx-auto mt-6 max-w-[620px] text-[16px] leading-[1.55] text-text-secondary sm:text-[18px]">
            {t.hero.subtitleA}{" "}
            <span className="text-text-primary font-medium">{t.hero.platforms}</span>{" "}
            {t.hero.subtitleB}{" "}
            <span className="text-text-primary font-medium">{t.hero.subtitleC}</span>
            {t.hero.subtitleD}
          </p>

          <div className="hero-in hero-in-4 mt-8 flex justify-center">
            <Link
              href={localePath("/onboard", locale)}
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-action-primary px-8 text-[14px] font-medium text-action-primary-fg transition-all hover:bg-action-primary-hover hover:translate-y-[-1px] active:translate-y-0 shadow-[0_2px_10px_color-mix(in_srgb,var(--acai)_35%,transparent)] sm:w-auto"
            >
              {t.hero.cta}
              <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
          <p className="hero-in hero-in-4 mt-4 text-caption text-text-muted">
            {t.hero.ctaNote}
          </p>
        </div>
      </section>

      {/* ─────────────── How it works ─────────────── */}
      <section id="how-it-works" className="border-t border-border bg-surface-raised">
        <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[640px] text-center">
            <p className="mono text-sm uppercase tracking-[0.14em] text-text-muted">{t.how.eyebrow}</p>
            <h2 className="display-tight mt-3 text-[32px] font-semibold tracking-tight text-text-primary sm:text-[42px]">
              {t.how.title}
            </h2>
          </div>
          <ol className="mt-14 grid gap-6 sm:grid-cols-3 sm:gap-8">
            {t.how.steps.map((s, i) => (
              <Step key={i} n={`0${i + 1}`} title={s.title} body={s.body} />
            ))}
          </ol>
          <div className="mt-12 text-center">
            <Link
              href={localePath("/onboard", locale)}
              className="inline-flex items-center gap-2 text-[14px] font-medium text-action-primary-text hover:underline"
            >
              {t.how.tryWizard}
              <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────── Features ─────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[640px] text-center">
            <p className="mono text-sm uppercase tracking-[0.14em] text-text-muted">{t.features.eyebrow}</p>
            <h2 className="display-tight mt-3 text-[32px] font-semibold tracking-tight text-text-primary sm:text-[42px]">
              {t.features.titleA}<br className="hidden sm:inline" /> {t.features.titleB}
            </h2>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.items.map((f, i) => (
              <Feature key={i} title={f.title} body={f.body} />
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── Compatible with strip ─────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 sm:py-16">
          <p className="mono text-center text-sm uppercase tracking-[0.14em] text-text-muted">
            {t.compatible.label}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-4">
            {[
              { name: "Airbnb", color: "#ff385c" },
              { name: "Booking.com", color: "#003580" },
              { name: "Vrbo", color: "#245abc" },
              { name: "Expedia", color: "#c69a14" },
              { name: "Hostaway", color: "#2e5bff" },
              { name: "Lodgify", color: "#00928a" },
              { name: "Smoobu", color: "#5b1a98" },
              { name: "Plum Guide", color: "#2e1065" },
            ].map((p) => (
              <PlatformChip key={p.name} name={p.name} color={p.color} />
            ))}
          </div>
          <p className="mt-6 text-center text-caption text-text-muted">
            {t.compatible.footer}
          </p>
        </div>
      </section>

      {/* ─────────────── Trust ─────────────── */}
      <section className="border-t border-border bg-surface-raised">
        <div className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-12">
            <Trust
              title={t.trust.open.title}
              body={t.trust.open.body}
              link={{ href: REPO_URL, label: t.trust.open.link, external: true }}
            />
            <Trust
              title={t.trust.gdpr.title}
              body={t.trust.gdpr.body}
              link={{ href: "/privacy", label: t.trust.gdpr.link }}
            />
          </div>
        </div>
      </section>

      {/* ─────────────── FAQ ─────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[760px] px-4 py-20 sm:px-6 sm:py-24">
          <div className="text-center">
            <p className="mono text-sm uppercase tracking-[0.14em] text-text-muted">{t.faq.eyebrow}</p>
            <h2 className="display-tight mt-3 text-[32px] font-semibold tracking-tight text-text-primary sm:text-[40px]">
              {t.faq.title}
            </h2>
          </div>
          <div className="mt-12 space-y-3">
            {t.faq.items.map((f) => (
              <Faq key={f.q} q={f.q}>
                {f.a}
              </Faq>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── Final CTA ─────────────── */}
      <section className="border-t border-border bg-surface-raised">
        <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-[680px] text-center">
            <h2 className="display text-[36px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[52px]">
              {t.finalCta.titleA} <span className="italic font-normal">{t.finalCta.titleB}</span>
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed text-text-secondary">
              {t.finalCta.body}
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href={localePath("/onboard", locale)}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-action-primary px-7 text-[14px] font-medium text-action-primary-fg transition-all hover:bg-action-primary-hover hover:translate-y-[-1px] active:translate-y-0 shadow-[0_2px_10px_color-mix(in_srgb,var(--acai)_35%,transparent)] sm:w-auto"
              >
                {t.finalCta.primary}
              </Link>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-6 text-[14px] font-medium text-text-primary transition-colors hover:bg-surface-hover sm:w-auto"
              >
                {t.finalCta.secondary}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── Footer ─────────────── */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 text-caption text-text-muted sm:flex-row">
            <p>{t.footer.copyright}</p>
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">{t.footer.github}</a>
              <Link href="/terms" className="hover:text-text-primary transition-colors">{t.footer.terms}</Link>
              <Link href="/privacy" className="hover:text-text-primary transition-colors">{t.footer.privacy}</Link>
              <a href={`mailto:${OPERATOR_EMAIL}`} className="hover:text-text-primary transition-colors">
                {t.footer.contact}
              </a>
              <Link href={localePath("/login", locale)} className="hover:text-text-primary transition-colors">{t.footer.signIn}</Link>
            </nav>
          </div>
          <p className="mt-3 text-center text-sm text-text-faint sm:text-left">
            {t.footer.cookieNoteA}<Link href="/privacy" className="underline underline-offset-2 hover:text-text-muted">{t.footer.cookieNoteLink}</Link>{t.footer.cookieNoteB}
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────── Sub-components ─────────────── */

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="relative rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-strong">
      <span className="mono absolute -top-3 left-6 inline-block rounded-md bg-text-primary px-2 py-0.5 text-sm font-medium text-surface">
        {n}
      </span>
      <h3 className="mt-2 text-[16px] font-semibold tracking-tight text-text-primary">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{body}</p>
    </li>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 transition-all hover:border-border-strong hover:translate-y-[-2px]">
      <h3 className="text-[15px] font-semibold tracking-tight text-text-primary">{title}</h3>
      <p className="mt-2 text-caption leading-relaxed text-text-secondary">{body}</p>
    </div>
  );
}

function Trust({
  title,
  body,
  link,
}: {
  title: string;
  body: string;
  link?: { href: string; label: string; external?: boolean };
}) {
  return (
    <div>
      <h3 className="text-[14px] font-semibold tracking-tight text-text-primary">{title}</h3>
      <p className="mt-2 text-caption leading-relaxed text-text-secondary">{body}</p>
      {link && (
        link.external ? (
          <a href={link.href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-caption text-action-primary-text hover:underline">
            {link.label}
            <svg className="h-3 w-3" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        ) : (
          <Link href={link.href} className="mt-3 inline-flex items-center gap-1 text-caption text-action-primary-text hover:underline">
            {link.label}
            <svg className="h-3 w-3" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )
      )}
    </div>
  );
}

function PlatformChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium tracking-tight transition-colors"
      style={{
        color,
        borderColor: `${color}33`,
        backgroundColor: `${color}0d`,
      }}
    >
      {name}
    </span>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-lg border border-border bg-surface open:border-border-strong transition-colors">
      <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-[14px] font-medium text-text-primary [&::-webkit-details-marker]:hidden">
        {q}
        <svg className="h-4 w-4 text-text-muted transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </summary>
      <div className="border-t border-border px-5 py-4 text-caption leading-relaxed text-text-secondary">
        {children}
      </div>
    </details>
  );
}
