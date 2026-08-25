"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlatformInstructions } from "@/components/platform-instructions";
import { MarketingHeader } from "@/components/marketing-header";
import { useI18n } from "@/lib/i18n/context";
import { localePath } from "@/lib/i18n/alternates";
import type { Locale } from "@/lib/i18n/translations";

/* ────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────── */

interface DraftLink {
  platform: string;
  customName?: string;
  color?: string;
  icalExportUrl: string;
  lastTestStatus?: "valid" | "invalid";
}

interface DraftRow {
  /** Local-only id so the React key is stable across renders */
  rowId: string;
  /** Canonical platform slug. For custom platforms this is the slugified customName. */
  platform: string;
  /** Display name shown to the user. Editable for custom; fixed for presets. */
  customName?: string;
  /** Hex color for the platform pill */
  color: string;
  /** Whether the row is included in the saved draft + feed URL list */
  enabled: boolean;
  url: string;
  /** Local UI status — separate from saved status so the user sees fresh feedback */
  testStatus: "untested" | "testing" | "valid" | "invalid" | "error";
  testReason?: string;
  /** Toggle for the instructions panel */
  instructionsOpen: boolean;
}

interface Preset {
  platform: string;
  displayName: string;
  color: string;
  exportPlaceholder: string;
  /** Whether the existing PlatformInstructions component knows how to render
      tutorial content for this preset (today: airbnb + booking only). */
  hasInstructions: boolean;
}

const PRESETS: Preset[] = [
  {
    platform: "airbnb",
    displayName: "Airbnb",
    color: "#ff385c",
    exportPlaceholder: "https://www.airbnb.com/calendar/ical/…",
    hasInstructions: true,
  },
  {
    platform: "booking",
    displayName: "Booking.com",
    color: "#003580",
    exportPlaceholder: "https://admin.booking.com/…/ical.html?…",
    hasInstructions: true,
  },
  {
    platform: "vrbo",
    displayName: "Vrbo",
    color: "#2c5da9",
    exportPlaceholder: "https://www.vrbo.com/icalendar/…",
    hasInstructions: false,
  },
];

/** Cycle through this palette when auto-assigning a colour to a custom platform. */
const CUSTOM_PALETTE = ["#7c3aed", "#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#6366f1"];

/* ────────────────────────────────────────────────────────────────────
   Copy — typed per-locale lookup. Adding a new Locale to translations.ts
   forces every key here to be filled in (TS error otherwise).
──────────────────────────────────────────────────────────────────── */

interface CopyShape {
  introEyebrow: string;
  introTitleLead: string;
  introTitleAccent: string;
  introBody: string;
  loading: string;
  step1Title: string;
  step1Subtitle: string;
  step1Placeholder: string;
  step2Title: string;
  step2Subtitle: string;
  addAnotherPlatform: string;
  step3Title: string;
  step3SubtitleEmpty: string;
  signinPrefix: string;
  signinLink: string;
  signinSuffix: string;
  saving: string;
  saveAndCreate: string;
  /** Custom platform fallback display name */
  customFallback: string;
  /** aria-label `${enable} {display}` */
  enableAria: (display: string) => string;
  customNamePlaceholder: string;
  removePlatformAria: string;
  hideInstructions: (display: string) => string;
  showInstructions: (display: string) => string;
  icalExportLabel: (display: string) => string;
  invalidBadUrl: string;
  invalidUnreachable: string;
  invalidNotIcal: string;
  invalidGeneric: string;
  validOk: string;
  pasteBackLabel: (display: string) => string;
  feedUrlPlaceholder: string;
  copy: string;
  copied: string;
  feedHelp: string;
  testTesting: string;
  testValid: string;
  testRetry: string;
  testFresh: string;
  changeColor: string;
  /** Step 3 subtitle when at least one platform is enabled. */
  verifiedSubtitle: (validCount: number, enabledCount: number) => string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    introEyebrow: "Onboarding · Free for every property",
    introTitleLead: "Set up your ",
    introTitleAccent: "first property",
    introBody:
      "Pick the platforms you list on, paste each one's iCal export URL, and copy the URLs we generate back into them. You can do this without an account first — sign up at the end to keep your data.",
    loading: "Loading…",
    step1Title: "Name your property",
    step1Subtitle: "Just a label for you. You can rename it later.",
    step1Placeholder: "My first property",
    step2Title: "Add calendar feeds",
    step2Subtitle:
      "Tick each platform you use — paste their iCal URL, copy ours back. Anything not on this list, add as Custom.",
    addAnotherPlatform: "Add another platform",
    step3Title: "Create your account",
    step3SubtitleEmpty:
      "You can sign up without picking a platform — add them later from the dashboard.",
    signinPrefix: "Free to start, no credit card. Already have an account? ",
    signinLink: "Sign in",
    signinSuffix: ".",
    saving: "Saving…",
    saveAndCreate: "Save and create account",
    customFallback: "Custom platform",
    enableAria: (display) => `Enable ${display}`,
    customNamePlaceholder: "Custom platform name",
    removePlatformAria: "Remove this platform",
    hideInstructions: (display) => `Hide instructions for ${display}`,
    showInstructions: (display) => `Show instructions for ${display}`,
    icalExportLabel: (display) => `${display} iCal export URL`,
    invalidBadUrl: "URL doesn't look right — check for missing https://",
    invalidUnreachable:
      "Couldn't reach that URL. The platform may be slow — try again in a minute.",
    invalidNotIcal:
      "URL responded but doesn't return a calendar. Double-check you copied the iCal export, not the listing page.",
    invalidGeneric:
      "Couldn't verify this URL — you can still save and we'll keep trying after signup.",
    validOk: "Looks good — we'll start syncing every 10 minutes after you sign up.",
    pasteBackLabel: (display) => `Paste this Propical URL back into ${display}`,
    feedUrlPlaceholder: "URL appears once you save the property name above",
    copy: "Copy",
    copied: "Copied!",
    feedHelp:
      "This URL is yours forever — even after signup. It'll start serving live data once you complete signup.",
    testTesting: "Testing…",
    testValid: "Verified",
    testRetry: "Retry",
    testFresh: "Test fetch",
    changeColor: "Change color",
    verifiedSubtitle: (valid, enabled) =>
      `${valid} of ${enabled} platform${enabled === 1 ? "" : "s"} verified. Anything unverified you can fix after signup.`,
  },
  pt: {
    introEyebrow: "Início · Grátis para todas as propriedades",
    introTitleLead: "Configure sua ",
    introTitleAccent: "primeira propriedade",
    introBody:
      "Marque as plataformas onde você anuncia, cole a URL iCal de cada uma e copie as nossas de volta. Você pode fazer isso sem conta primeiro — no final, você se cadastra para salvar os dados.",
    loading: "Carregando…",
    step1Title: "Dê um nome à propriedade",
    step1Subtitle: "Apenas um rótulo para você. Pode renomear quando quiser.",
    step1Placeholder: "Minha primeira propriedade",
    step2Title: "Conecte os feeds de calendário",
    step2Subtitle:
      "Marque cada plataforma que usar — cole sua URL iCal e copie a nossa de volta. O que não estiver na lista, adicione como «Plataforma personalizada».",
    addAnotherPlatform: "Adicionar outra plataforma",
    step3Title: "Crie sua conta",
    step3SubtitleEmpty:
      "Você pode se cadastrar sem escolher plataforma — adicione-as depois pelo painel.",
    signinPrefix: "Grátis para começar, sem cartão. Já tem uma conta? ",
    signinLink: "Entrar",
    signinSuffix: ".",
    saving: "Salvando…",
    saveAndCreate: "Salvar e criar conta",
    customFallback: "Plataforma personalizada",
    enableAria: (display) => `Ativar ${display}`,
    customNamePlaceholder: "Nome da plataforma",
    removePlatformAria: "Remover esta plataforma",
    hideInstructions: (display) => `Ocultar instruções para ${display}`,
    showInstructions: (display) => `Mostrar instruções para ${display}`,
    icalExportLabel: (display) => `URL de exportação iCal · ${display}`,
    invalidBadUrl: "A URL não parece certa — verifique se começa com https://",
    invalidUnreachable:
      "Não foi possível acessar essa URL. A plataforma pode estar lenta — tente novamente em um minuto.",
    invalidNotIcal:
      "A URL responde, mas não retorna um calendário. Verifique se você copiou a exportação iCal e não a página do anúncio.",
    invalidGeneric:
      "Não foi possível verificar esta URL — você pode salvar mesmo assim e continuaremos tentando após o cadastro.",
    validOk: "Tudo certo — começamos a sincronizar a cada 10 minutos assim que você se cadastrar.",
    pasteBackLabel: (display) => `Cole esta URL do Propical de volta no ${display}`,
    feedUrlPlaceholder: "A URL aparece assim que você salvar o nome da propriedade acima",
    copy: "Copiar",
    copied: "Copiado!",
    feedHelp:
      "Esta URL é sua para sempre — mesmo após o cadastro. Ela começará a servir dados ao vivo assim que você concluir o cadastro.",
    testTesting: "Verificando…",
    testValid: "Verificada",
    testRetry: "Tentar novamente",
    testFresh: "Testar",
    changeColor: "Mudar cor",
    verifiedSubtitle: (valid, enabled) =>
      `${valid} de ${enabled} ${enabled === 1 ? "plataforma verificada" : "plataformas verificadas"}. O que não foi validado pode ser corrigido após o cadastro.`,
  },
  es: {
    introEyebrow: "Inicio · Gratis para todos los alojamientos",
    introTitleLead: "Configure su ",
    introTitleAccent: "primer alojamiento",
    introBody:
      "Marque las plataformas en las que publica, pegue la URL iCal de cada una y copie las nuestras de vuelta. Puede hacerlo sin cuenta primero — al final se registra para guardar los datos.",
    loading: "Cargando…",
    step1Title: "Póngale nombre al alojamiento",
    step1Subtitle: "Solo una etiqueta para usted. Puede renombrarlo cuando quiera.",
    step1Placeholder: "Mi primer alojamiento",
    step2Title: "Conecte los feeds de calendario",
    step2Subtitle:
      "Marque cada plataforma que use — pegue su URL iCal y copie la nuestra de vuelta. Lo que no esté en la lista, añádalo como «Plataforma personalizada».",
    addAnotherPlatform: "Añadir otra plataforma",
    step3Title: "Cree su cuenta",
    step3SubtitleEmpty:
      "Puede registrarse sin elegir plataforma — añádalas luego desde el panel.",
    signinPrefix: "Gratis para empezar, sin tarjeta. ¿Ya tiene cuenta? ",
    signinLink: "Iniciar sesión",
    signinSuffix: ".",
    saving: "Guardando…",
    saveAndCreate: "Guardar y crear cuenta",
    customFallback: "Plataforma personalizada",
    enableAria: (display) => `Activar ${display}`,
    customNamePlaceholder: "Nombre de la plataforma",
    removePlatformAria: "Quitar esta plataforma",
    hideInstructions: (display) => `Ocultar instrucciones para ${display}`,
    showInstructions: (display) => `Mostrar instrucciones para ${display}`,
    icalExportLabel: (display) => `URL de exportación iCal · ${display}`,
    invalidBadUrl: "La URL no tiene buena pinta — compruebe que empieza por https://",
    invalidUnreachable:
      "No hemos podido alcanzar esa URL. La plataforma puede ir lenta — inténtelo en un minuto.",
    invalidNotIcal:
      "La URL responde, pero no devuelve un calendario. Compruebe que copió la exportación iCal y no la página del anuncio.",
    invalidGeneric:
      "No hemos podido verificar esta URL — puede guardar igualmente y seguiremos intentándolo tras el registro.",
    validOk: "Todo en orden — empezamos a sincronizar cada 10 minutos en cuanto se registre.",
    pasteBackLabel: (display) => `Pegue esta URL de Propical de vuelta en ${display}`,
    feedUrlPlaceholder: "La URL aparece en cuanto guarde el nombre del alojamiento arriba",
    copy: "Copiar",
    copied: "¡Copiado!",
    feedHelp:
      "Esta URL es suya para siempre — incluso después de registrarse. Empezará a servir datos en vivo en cuanto complete el registro.",
    testTesting: "Comprobando…",
    testValid: "Verificada",
    testRetry: "Reintentar",
    testFresh: "Probar",
    changeColor: "Cambiar color",
    verifiedSubtitle: (valid, enabled) =>
      `${valid} de ${enabled} ${enabled === 1 ? "plataforma verificada" : "plataformas verificadas"}. Lo que no se haya validado se arregla después del registro.`,
  },
};

/* ────────────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────────── */

function newRowId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Mirror of slugify() in src/lib/slugify.ts but client-side. Kept tight —
    we only need the subset needed for picking a custom platform slug. */
function clientSlug(raw: string): string {
  if (!raw) return "custom";
  const cyr: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
    ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
    я: "ya", є: "ye", і: "i", ї: "yi", ґ: "g", ў: "u",
  };
  let out = "";
  for (const ch of raw) {
    const lower = ch.toLowerCase();
    out += cyr[lower] !== undefined ? cyr[lower] : lower.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  const cleaned = out
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return cleaned || "custom";
}

function feedUrl(slug: string, platform: string): string {
  // SSR-safe: window may not exist on first render
  const origin = typeof window === "undefined" ? "https://propical.com.br" : window.location.origin;
  return `${origin}/api/calendar/feed/${slug}/for-${platform}.ics`;
}

function presetRow(preset: Preset): DraftRow {
  return {
    rowId: newRowId(),
    platform: preset.platform,
    color: preset.color,
    enabled: false,
    url: "",
    testStatus: "untested",
    instructionsOpen: false,
  };
}

/* ────────────────────────────────────────────────────────────────────
   Page
──────────────────────────────────────────────────────────────────── */

export default function OnboardPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const t = COPY[locale];
  const [propertyName, setPropertyName] = useState("");
  const [feedSlug, setFeedSlug] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[]>(() => PRESETS.map(presetRow));
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  /* ── hydrate from existing draft on mount ─────────────────────── */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/onboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { draft: { propertyName: string; feedSlug: string | null; links: DraftLink[] } | null } | null) => {
        if (cancelled) return;
        if (data?.draft) {
          setPropertyName(data.draft.propertyName);
          setFeedSlug(data.draft.feedSlug);
          // Hydrate rows: presets first, then any custom links from the draft.
          const seenPresets = new Set<string>();
          const hydrated: DraftRow[] = PRESETS.map((p) => {
            const link = data.draft!.links.find((l) => l.platform === p.platform);
            seenPresets.add(p.platform);
            return {
              ...presetRow(p),
              enabled: !!link,
              url: link?.icalExportUrl ?? "",
              testStatus: link?.lastTestStatus === "valid" ? "valid" : link?.lastTestStatus === "invalid" ? "invalid" : "untested",
            };
          });
          for (const link of data.draft.links) {
            if (seenPresets.has(link.platform)) continue;
            hydrated.push({
              rowId: newRowId(),
              platform: link.platform,
              customName: link.customName,
              color: link.color || CUSTOM_PALETTE[hydrated.length % CUSTOM_PALETTE.length],
              enabled: true,
              url: link.icalExportUrl,
              testStatus: link.lastTestStatus === "valid" ? "valid" : link.lastTestStatus === "invalid" ? "invalid" : "untested",
              instructionsOpen: false,
            });
          }
          setRows(hydrated);
        }
        setHydrated(true);
      })
      .catch(() => !cancelled && setHydrated(true));
    return () => { cancelled = true; };
  }, []);

  /* ── persist debounced ─────────────────────────────────────────── */
  const persist = useCallback(async (next: { propertyName: string; rows: DraftRow[] }) => {
    setSaving(true);
    try {
      const links: DraftLink[] = next.rows
        .filter((r) => r.enabled && r.url.trim())
        .map((r) => ({
          platform: r.platform,
          icalExportUrl: r.url.trim(),
          ...(r.customName ? { customName: r.customName } : {}),
          color: r.color,
          ...(r.testStatus === "valid" || r.testStatus === "invalid" ? { lastTestStatus: r.testStatus } : {}),
        }));
      // Auto-save: a single failed fetch is non-fatal — iOS Safari throws
      // "Load failed" when the user backgrounds the tab or the network
      // blips mid-request. Catch it locally so it doesn't bubble up as
      // an unhandled rejection; the next debounce cycle will retry the
      // moment the user edits anything else.
      let res: Response | undefined;
      try {
        res = await fetch("/api/onboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyName: next.propertyName.trim(), links }),
        });
      } catch {
        return;
      }
      if (res.ok) {
        try {
          const data = await res.json();
          if (data?.draft?.feedSlug) setFeedSlug(data.draft.feedSlug);
        } catch {
          // Body unreadable (rare) — the next save cycle will refresh it.
        }
      }
    } finally {
      setSaving(false);
    }
  }, []);

  // Debounce persist on changes — 600ms after the last edit.
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => persist({ propertyName, rows }), 600);
    return () => clearTimeout(timer);
  }, [hydrated, propertyName, rows, persist]);

  /* ── row mutations ─────────────────────────────────────────────── */
  const updateRow = useCallback((rowId: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }, []);

  const toggleRow = useCallback((rowId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, enabled: !r.enabled, instructionsOpen: !r.enabled } : r))
    );
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }, []);

  const addCustomRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        rowId: newRowId(),
        platform: `custom-${newRowId()}`,
        customName: "",
        color: CUSTOM_PALETTE[prev.length % CUSTOM_PALETTE.length],
        enabled: true,
        url: "",
        testStatus: "untested",
        instructionsOpen: false,
      },
    ]);
  }, []);

  const setCustomName = useCallback((rowId: string, customName: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        const slug = clientSlug(customName);
        // Avoid colliding with preset platform slugs by suffixing.
        const presetSlugs = new Set(PRESETS.map((p) => p.platform));
        const finalSlug = presetSlugs.has(slug) ? `${slug}-custom` : slug;
        return { ...r, customName, platform: finalSlug };
      })
    );
  }, []);

  /* ── per-row test fetch ───────────────────────────────────────── */
  const testRow = useCallback(async (rowId: string) => {
    const row = rows.find((r) => r.rowId === rowId);
    if (!row?.url.trim()) return;
    updateRow(rowId, { testStatus: "testing" });
    try {
      const res = await fetch("/api/onboard/test-platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: row.url.trim() }),
      });
      const data = await res.json();
      updateRow(rowId, {
        testStatus: data.ok ? "valid" : "invalid",
        testReason: data.ok ? undefined : data.reason,
      });
    } catch {
      updateRow(rowId, { testStatus: "error", testReason: "network" });
    }
  }, [rows, updateRow]);

  /* ── copy to clipboard ────────────────────────────────────────── */
  const copyText = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* ignore — older browsers */
    }
  }, []);

  /* ── derived state ────────────────────────────────────────────── */
  const enabledCount = rows.filter((r) => r.enabled).length;
  const validCount = rows.filter((r) => r.enabled && r.testStatus === "valid").length;

  /* ── submit ───────────────────────────────────────────────────── */
  const handleSaveAndSignup = async () => {
    await persist({ propertyName, rows });
    router.push("/signup?from=onboard");
  };

  /* ── UI ───────────────────────────────────────────────────────── */
  return (
    <div className="editorial min-h-screen flex flex-col">
      {/* ── Header — shared with home so a visitor never sees
            the chrome change. Same brand mark, same nav, same width. ── */}
      <MarketingHeader />

      {/* ── Main ── */}
      <main className="flex-1">
        <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-14">
          {/* Intro hero —: hidden on <sm so the user lands
              directly on Step 1 above the fold. Free-for-everything
              wording replaces the old "1 property" line that read like
              a tier limit. */}
          <div className="hidden text-center sm:block">
            <p className="mono text-sm uppercase tracking-[0.14em] text-text-muted">
              {t.introEyebrow}
            </p>
            <h1 className="display mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-text-primary sm:text-[44px]">
              {t.introTitleLead}
              <span className="italic font-normal">{t.introTitleAccent}</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-[560px] text-[15px] leading-relaxed text-text-secondary">
              {t.introBody}
            </p>
          </div>

          {!hydrated ? (
            <div className="mt-6 rounded-xl border border-border bg-surface-raised p-8 text-center text-sm text-text-muted sm:mt-10">
              {t.loading}
            </div>
          ) : (
            <div className="mt-6 space-y-6 sm:mt-10">
              {/* Step 1 — Property name */}
              <Card
                stepNumber={1}
                title={t.step1Title}
                subtitle={t.step1Subtitle}
              >
                <input
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder={t.step1Placeholder}
                  className="h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-[14px] text-text-primary placeholder-text-faint outline-none focus:border-text-primary transition-colors"
                  autoFocus
                />
              </Card>

              {/* Step 2 — Platform rows */}
              <Card
                stepNumber={2}
                title={t.step2Title}
                subtitle={t.step2Subtitle}
              >
                <div className="space-y-3">
                  {rows.map((row) => (
                    <PlatformRow
                      key={row.rowId}
                      row={row}
                      preset={PRESETS.find((p) => p.platform === row.platform) ?? null}
                      feedSlug={feedSlug}
                      copied={copied}
                      onToggle={() => toggleRow(row.rowId)}
                      onUrlChange={(url) => updateRow(row.rowId, { url, testStatus: "untested" })}
                      onCustomNameChange={(name) => setCustomName(row.rowId, name)}
                      onColorChange={(color) => updateRow(row.rowId, { color })}
                      onToggleInstructions={() => updateRow(row.rowId, { instructionsOpen: !row.instructionsOpen })}
                      onRemove={() => removeRow(row.rowId)}
                      onTest={() => testRow(row.rowId)}
                      onCopy={(text, key) => copyText(text, key)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addCustomRow}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-border-strong px-3 py-2 text-sm text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {t.addAnotherPlatform}
                </button>
              </Card>

              {/* Step 3 — Create account. Visually anchored as a third
                  numbered step so the three-step rhythm (name / feeds /
                  account) reads at a glance on a 1280px laptop. */}
              <Card
                stepNumber={3}
                title={t.step3Title}
                subtitle={
                  enabledCount === 0
                    ? t.step3SubtitleEmpty
                    : t.verifiedSubtitle(validCount, enabledCount)
                }
              >
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-text-muted">
                    {t.signinPrefix}
                    <Link href={localePath("/login", locale)} className="text-text-primary underline-offset-2 hover:underline">
                      {t.signinLink}
                    </Link>
                    {t.signinSuffix}
                  </p>
                  <button
                    onClick={handleSaveAndSignup}
                    disabled={saving}
                    className="inline-flex h-11 items-center gap-2 rounded-md bg-action-primary px-6 text-[14px] font-medium text-action-primary-fg shadow-[0_2px_10px_color-mix(in_srgb,var(--acai)_35%,transparent)] transition-all hover:bg-action-primary-hover hover:translate-y-[-1px] disabled:opacity-50"
                  >
                    {saving ? t.saving : t.saveAndCreate}
                    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Components
──────────────────────────────────────────────────────────────────── */

function Card({
  stepNumber,
  title,
  subtitle,
  children,
}: {
  stepNumber?: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 sm:p-8">
      <div className="mb-5 flex items-start gap-3">
        {stepNumber !== undefined && (
          // Coloured numbered chip —. Coral pill anchors the
          // step visually so a returning user can scan "1 / 2 / 3"
          // without reading the headers.
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-action-primary text-sm font-semibold text-action-primary-fg shadow-sm shadow-action-primary/30"
          >
            {stepNumber}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold tracking-tight text-text-primary">{title}</h2>
          {subtitle && <p className="mt-1 text-sm leading-relaxed text-text-secondary">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

interface PlatformRowProps {
  row: DraftRow;
  preset: Preset | null;
  feedSlug: string | null;
  copied: string | null;
  onToggle: () => void;
  onUrlChange: (v: string) => void;
  onCustomNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onToggleInstructions: () => void;
  onRemove: () => void;
  onTest: () => void;
  onCopy: (text: string, key: string) => void;
}

function PlatformRow({
  row,
  preset,
  feedSlug,
  copied,
  onToggle,
  onUrlChange,
  onCustomNameChange,
  onColorChange,
  onToggleInstructions,
  onRemove,
  onTest,
  onCopy,
}: PlatformRowProps) {
  const { locale } = useI18n();
  const t = COPY[locale];
  const isCustom = !preset;
  const display = preset?.displayName ?? (row.customName?.trim() || t.customFallback);
  const ourFeedUrl = feedSlug ? feedUrl(feedSlug, row.platform) : null;
  const copyKey = `our-${row.rowId}`;

  return (
    <div className="rounded-lg border border-border bg-surface transition-colors hover:border-border-strong">
      {/* Header row: enabled toggle + name + color + remove (if custom).
          The whole row is the toggle target — clicking anywhere on it
          enables/disables the platform. The genuinely interactive
          children (checkbox, custom-name input, colour swatch, remove)
          stop propagation so they keep their own behaviour. */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none rounded-t-lg transition-colors hover:bg-surface-raised"
        onClick={onToggle}
      >
        <input
          type="checkbox"
          checked={row.enabled}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          aria-label={t.enableAria(display)}
          className="h-4 w-4 cursor-pointer accent-action-primary"
        />
        <span
          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: row.color }}
          aria-hidden="true"
        />
        {isCustom ? (
          <input
            value={row.customName ?? ""}
            onChange={(e) => onCustomNameChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder={t.customNamePlaceholder}
            className="flex-1 bg-transparent text-[14px] font-medium text-text-primary placeholder-text-faint outline-none"
          />
        ) : (
          <span className="flex-1 text-[14px] font-medium text-text-primary">{display}</span>
        )}
        {row.enabled && (
          <span onClick={(e) => e.stopPropagation()}>
            <ColorSwatchButton color={row.color} onChange={onColorChange} />
          </span>
        )}
        {isCustom && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="text-text-faint hover:text-text-secondary transition-colors"
            aria-label={t.removePlatformAria}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Body — URL inputs + test + Propical URL — only when enabled */}
      {row.enabled && (
        <div className="border-t border-border px-4 py-4 space-y-3">
          {preset?.hasInstructions && (
            <button
              type="button"
              onClick={onToggleInstructions}
              className="text-sm text-text-muted hover:text-text-primary inline-flex items-center gap-1"
            >
              <svg className={`h-3 w-3 transition-transform ${row.instructionsOpen ? "rotate-90" : ""}`} viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {row.instructionsOpen ? t.hideInstructions(display) : t.showInstructions(display)}
            </button>
          )}
          {row.instructionsOpen && preset?.hasInstructions && (preset.platform === "airbnb" || preset.platform === "booking") && (
            <div className="rounded-md border border-border bg-surface-raised p-3">
              <PlatformInstructions platform={preset.platform} mode="export" />
            </div>
          )}

          {/* URL input + test button */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {t.icalExportLabel(display)}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={row.url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder={preset?.exportPlaceholder ?? "https://…"}
                className="h-10 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary placeholder-text-faint outline-none focus:border-text-primary transition-colors sm:flex-1"
              />
              <TestButton status={row.testStatus} onClick={onTest} disabled={!row.url.trim()} />
            </div>
            {row.testStatus === "invalid" && (
              <p className="mt-1.5 text-caption text-rose-700">
                {row.testReason === "bad_url"
                  ? t.invalidBadUrl
                  : row.testReason === "unreachable"
                    ? t.invalidUnreachable
                    : row.testReason === "not_ical"
                      ? t.invalidNotIcal
                      : t.invalidGeneric}
              </p>
            )}
            {row.testStatus === "valid" && (
              <p className="mt-1.5 text-caption text-emerald-700">
                {t.validOk}
              </p>
            )}
          </div>

          {/* Propical feed URL for this platform */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {t.pasteBackLabel(display)}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <code className="h-10 w-full min-w-0 select-all rounded-md border border-border bg-surface-raised px-3 text-sm text-text-secondary flex items-center overflow-x-auto whitespace-nowrap sm:flex-1">
                {ourFeedUrl ?? t.feedUrlPlaceholder}
              </code>
              <button
                type="button"
                onClick={() => ourFeedUrl && onCopy(ourFeedUrl, copyKey)}
                disabled={!ourFeedUrl}
                className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary hover:bg-surface-raised transition-colors disabled:opacity-40 sm:w-auto"
              >
                {copied === copyKey ? t.copied : t.copy}
              </button>
            </div>
            <p className="mt-1.5 text-caption text-text-muted">
              {t.feedHelp}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TestButton({ status, onClick, disabled }: { status: DraftRow["testStatus"]; onClick: () => void; disabled?: boolean }) {
  const { locale } = useI18n();
  const t = COPY[locale];
  const label =
    status === "testing"
      ? t.testTesting
      : status === "valid"
        ? t.testValid
        : status === "invalid" || status === "error"
          ? t.testRetry
          : t.testFresh;
  const tone =
    status === "valid"
      ? "border-transparent bg-emerald-700 text-white"
      : status === "invalid" || status === "error"
        ? "border-rose-700 bg-surface text-rose-700"
        : "border-border-strong bg-surface text-text-primary hover:bg-surface-raised";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || status === "testing"}
      className={`inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors disabled:opacity-40 sm:w-auto ${tone}`}
      aria-live="polite"
    >
      {status === "valid" && (
        <svg className="h-3 w-3" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {(status === "invalid" || status === "error") && (
        <svg className="h-3 w-3" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </button>
  );
}

function ColorSwatchButton({ color, onChange }: { color: string; onChange: (v: string) => void }) {
  const { locale } = useI18n();
  const t = COPY[locale];
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-5 w-5 rounded-md border border-border-strong hover:border-text-muted transition-colors"
        style={{ backgroundColor: color }}
        aria-label={t.changeColor}
      />
      {open && (
        <div className="absolute right-0 top-7 z-10 flex gap-1.5 rounded-md border border-border-strong bg-surface p-2 shadow-lg">
          {[...CUSTOM_PALETTE, "#ff385c", "#003580"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onChange(c); setOpen(false); }}
              className="h-5 w-5 rounded-md border border-border-strong transition-transform hover:scale-110"
              style={{ backgroundColor: c }}
              aria-label={`Set color to ${c}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
