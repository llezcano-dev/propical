"use client";

import { useState } from "react";
import Link from "next/link";
import { PlatformInstructions } from "@/components/platform-instructions";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { eyebrowVariants } from "@/components/ui/atoms/eyebrow";
import type { Locale } from "@/lib/i18n/translations";
import type { CalendarLink } from "@/lib/types";
import { saveCalendarLinkAndSync } from "@/lib/calendar-link-sync";
import { resolvePlatformMeta } from "@/lib/platform-meta";

// In-dashboard onboarding for users who land logged-in (e.g. Google
// One-Tap, signup with no prior /onboard run) and have zero properties.
//
// Empty-state hijack pattern: replaces the entire main column of the
// dashboard until the user has named one property AND saved at least
// one calendar feed (or used the sample-property escape). Auto-advances
// step → step on success so there is no "Next" button to fail to click.
//
// Two steps:
//   1. Name the property + escape: "Try a sample property" creates a
//      fully-populated demo through /api/properties/sample for users
//      who want to look around before committing.
//   2. Connect at least one calendar feed. Preset rows (airbnb,
//      booking, vrbo) match the public /onboard wizard so a host who
//      saw that flow recognises the surface. "Add another platform"
//      mirrors onboarding for custom OTAs. Soft escape: "Add a manual
//      reservation instead" link for hosts who don't list anywhere.
//
// onComplete fires when the wizard's exit conditions are met (sample
// property created, OR property + ≥1 calendar link saved, OR manual-
// reservation escape clicked). The parent reloads its property list
// and the dashboard re-renders without this component.

interface DashboardOnboardingProps {
  /** Called when the user finishes the wizard (or escapes via the
   *  sample-property / manual-reservation paths). The parent should
   *  refetch properties and let the dashboard re-render normally. */
  onComplete: () => void;
}

interface PresetPlatform {
  platform: string;
  label: string;
  color: string;
  placeholder: string;
  hasInstructions: boolean;
}

const PRESETS: PresetPlatform[] = [
  { platform: "airbnb", label: "Airbnb", color: resolvePlatformMeta("airbnb").color, placeholder: "https://www.airbnb.com/calendar/ical/…", hasInstructions: true },
  { platform: "booking", label: "Booking.com", color: resolvePlatformMeta("booking").color, placeholder: "https://admin.booking.com/…/ical.html?…", hasInstructions: true },
  { platform: "vrbo", label: "Vrbo", color: resolvePlatformMeta("vrbo").color, placeholder: "https://www.vrbo.com/icalendar/…", hasInstructions: false },
];

const CUSTOM_PALETTE = ["#7c3aed", "#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#6366f1"];

interface CustomDraft {
  rowId: string;
  platform: string;
  displayName: string;
  color: string;
}

/* ────────────────────────────────────────────────────────────────────
   Copy — typed per-locale lookup. Adding a new Locale to translations.ts
   forces every key here to be filled in (TS error otherwise).
──────────────────────────────────────────────────────────────────── */

interface CopyShape {
  step1Title: string;
  step1Body: string;
  step1Placeholder: string;
  step1Continue: string;
  step1Creating: string;
  step1Sample: string;
  step2TitlePrefix: string;
  step2TitleSuffix: string;
  step2Body: string;
  customFallback: string;
  customNamePlaceholder: string;
  test: string;
  save: string;
  connected: string;
  pasteBackPrefix: string;
  pasteBackSuffix: string;
  copy: string;
  copied: string;
  addAnotherPlatform: string;
  notListing: string;
  manualReservationLink: string;
  hubTip: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    step1Title: "Name your first property",
    step1Body:
      "Just a label for you — you can rename it later. Next we'll connect at least one calendar.",
    step1Placeholder: "e.g. Sunset Apartment",
    step1Continue: "Continue →",
    step1Creating: "Creating…",
    step1Sample: "Or try a sample property →",
    step2TitlePrefix: "Connect a calendar to \"",
    step2TitleSuffix: "\"",
    step2Body:
      "Paste the iCal export URL from any platform you list on. Next, you'll copy ours back into them — we generate the import URL the moment you save.",
    customFallback: "Custom platform",
    customNamePlaceholder: "Platform name",
    test: "Test",
    save: "Save",
    connected: "Connected",
    pasteBackPrefix: "Paste back into ",
    pasteBackSuffix: ":",
    copy: "Copy",
    copied: "Copied",
    addAnotherPlatform: "Add another platform",
    notListing: "Not listing anywhere?",
    manualReservationLink: "Add a manual reservation instead →",
    hubTip:
      "Tip: connect every platform to Propical, and switch off any calendar links you set up directly between platforms. When Propical is the single hub, each booking is counted once — cross-linking platforms makes the same booking echo around and look like a double-booking.",
  },
  pt: {
    step1Title: "Dê um nome à sua primeira propriedade",
    step1Body:
      "Apenas um rótulo para você — pode renomear depois. Em seguida, conectamos pelo menos um calendário.",
    step1Placeholder: "p. ex. Apartamento do Centro",
    step1Continue: "Continuar →",
    step1Creating: "Criando…",
    step1Sample: "Ou testar uma propriedade de exemplo →",
    step2TitlePrefix: "Conectar um calendário a «",
    step2TitleSuffix: "»",
    step2Body:
      "Cole a URL de exportação iCal de qualquer plataforma em que você anuncie. Depois copie a nossa de volta — geramos a URL de importação no momento em que você salvar.",
    customFallback: "Plataforma personalizada",
    customNamePlaceholder: "Nome da plataforma",
    test: "Testar",
    save: "Salvar",
    connected: "Conectada",
    pasteBackPrefix: "Colar de volta em ",
    pasteBackSuffix: ":",
    copy: "Copiar",
    copied: "Copiado",
    addAnotherPlatform: "Adicionar outra plataforma",
    notListing: "Não anuncia em nenhuma plataforma?",
    manualReservationLink: "Adicionar uma reserva manual →",
    hubTip:
      "Dica: conecte cada plataforma ao Propical e desative os links de calendário que você criou diretamente entre plataformas. Quando o Propical é o único ponto central, cada reserva é contada uma única vez — se as plataformas também sincronizam entre si, a mesma reserva fica em loop e parece uma reserva dupla.",
  },
  es: {
    step1Title: "Póngale nombre a su primer alojamiento",
    step1Body:
      "Solo una etiqueta para usted — puede renombrarlo después. A continuación conectamos al menos un calendario.",
    step1Placeholder: "p. ej. Ático del Centro",
    step1Continue: "Continuar →",
    step1Creating: "Creando…",
    step1Sample: "O probar un alojamiento de demo →",
    step2TitlePrefix: "Conectar un calendario a «",
    step2TitleSuffix: "»",
    step2Body:
      "Pegue la URL de exportación iCal de cualquier plataforma en la que publique. Después copia la nuestra de vuelta — generamos la URL de importación en el momento de guardar.",
    customFallback: "Plataforma personalizada",
    customNamePlaceholder: "Nombre de la plataforma",
    test: "Probar",
    save: "Guardar",
    connected: "Conectada",
    pasteBackPrefix: "Pegar de vuelta en ",
    pasteBackSuffix: ":",
    copy: "Copiar",
    copied: "Copiado",
    addAnotherPlatform: "Añadir otra plataforma",
    notListing: "¿No publica en ninguna plataforma?",
    manualReservationLink: "Añadir una reserva manual →",
    hubTip:
      "Consejo: conecte cada plataforma a Propical y desactive los enlaces de calendario que haya creado directamente entre plataformas. Cuando Propical es el único punto central, cada reserva se cuenta una sola vez — si las plataformas también se sincronizan entre sí, la misma reserva da vueltas en bucle y parece una reserva doble.",
  },
};

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
  return (
    out
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "custom"
  );
}

export function DashboardOnboarding({ onComplete }: DashboardOnboardingProps) {
  const { locale, t: gt } = useI18n();
  const t = COPY[locale];

  // Step 1 — property name
  const [step, setStep] = useState<1 | 2>(1);
  const [propertyName, setPropertyName] = useState("");
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 — calendar feeds
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [savedLinks, setSavedLinks] = useState<CalendarLink[]>([]);
  const [savingPlatform, setSavingPlatform] = useState<string | null>(null);
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string; futureEvents?: number; totalEvents?: number }>>({});
  const [customDrafts, setCustomDrafts] = useState<CustomDraft[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const setUrl = (platform: string, value: string) =>
    setUrlInputs((prev) => ({ ...prev, [platform]: value }));

  // ── Step 1 actions ──────────────────────────────────────────────

  const createProperty = async () => {
    const trimmed = propertyName.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not create property");
        return;
      }
      const property = await res.json();
      setPropertyId(property.id);
      setStep(2);
    } finally {
      setCreating(false);
    }
  };

  const createSampleProperty = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/properties/sample", { method: "POST" });
      if (!res.ok) {
        // Fallback to a plain "Sample Apartment" if the sample endpoint is missing.
        const fallback = await fetch("/api/properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Sample Apartment" }),
        });
        if (!fallback.ok) {
          setError("Could not create sample property");
          return;
        }
      }
      // Sample property is fully populated server-side — exit the wizard.
      onComplete();
    } finally {
      setCreating(false);
    }
  };

  // ── Step 2 actions ──────────────────────────────────────────────

  const customLinks = savedLinks.filter((l) => !PRESETS.some((p) => p.platform === l.platform));

  const presetSlugs = new Set(PRESETS.map((p) => p.platform));

  const addCustomDraft = () => {
    const rowId = `draft:${Math.random().toString(36).slice(2, 8)}`;
    setCustomDrafts((prev) => [
      ...prev,
      {
        rowId,
        platform: rowId,
        displayName: "",
        color: CUSTOM_PALETTE[(customLinks.length + prev.length) % CUSTOM_PALETTE.length],
      },
    ]);
  };

  const updateCustomDraftName = (rowId: string, displayName: string) => {
    setCustomDrafts((prev) =>
      prev.map((d) => {
        if (d.rowId !== rowId) return d;
        const slug = clientSlug(displayName);
        const finalSlug = presetSlugs.has(slug) ? `${slug}-custom` : slug;
        return { ...d, displayName, platform: finalSlug };
      }),
    );
  };

  const removeCustomDraft = (rowId: string) =>
    setCustomDrafts((prev) => prev.filter((d) => d.rowId !== rowId));

  const testPlatform = async (platform: string, url: string) => {
    if (!url.trim()) return;
    setTestingPlatform(platform);
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
    try {
      const res = await fetch("/api/calendar/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const result = await res.json();
      setTestResults((prev) => ({ ...prev, [platform]: result }));
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [platform]: { success: false, error: String(err) } }));
    } finally {
      setTestingPlatform(null);
    }
  };

  const savePlatform = async (platform: string, url: string, displayName?: string) => {
    if (!propertyId || !url.trim() || savingPlatform) return;
    setSavingPlatform(platform);
    setError(null);
    try {
      const result = await saveCalendarLinkAndSync({ propertyId, platform, icalExportUrl: url.trim() });
      if (!result.ok) {
        setError(result.error ?? "Could not save calendar");
        return;
      }
      setSavedLinks((prev) => [...prev, result.link as CalendarLink]);
      // Clean up the draft entry if this was a custom row.
      if (displayName) {
        setCustomDrafts((prev) => prev.filter((d) => d.platform !== platform));
      }
      // First successful save → wizard goal hit. Auto-exit to the real
      // dashboard so the user sees their data, not the wizard, going
      // forward.
      onComplete();
    } finally {
      setSavingPlatform(null);
    }
  };

  const feedUrl = (platform: string) => {
    if (typeof window === "undefined" || !propertyId) return "";
    return `${window.location.origin}/api/calendar/feed/${propertyId}/for-${platform}.ics`;
  };

  const copyUrl = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      window.prompt("Copy this URL:", url);
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-border bg-surface-raised/40 p-6 sm:p-10">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-3">
        <StepDot active={step === 1} done={step === 2} number={1} />
        <span
          className={`flex-1 border-t ${
            step === 2 ? "border-action-primary" : "border-border"
          }`}
        />
        <StepDot active={step === 2} done={false} number={2} />
      </div>

      {step === 1 && (
        <>
          <h2 className="text-balance text-2xl font-bold tracking-tight text-text-primary sm:text-[1.75rem]">
            {t.step1Title}
          </h2>
          <p className="mt-2 max-w-md text-sm text-text-muted">
            {t.step1Body}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void createProperty();
            }}
            className="mt-5 space-y-3"
          >
            <input
              autoFocus
              data-testid="onboarding-name"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder={t.step1Placeholder}
              className="h-11 w-full rounded-lg border border-border-strong bg-surface px-3.5 text-[15px] text-text-primary outline-none transition-colors focus:border-action-primary"
              maxLength={100}
            />
            {error && step === 1 && (
              <p role="alert" className="text-sm text-rose-400">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="submit"
                data-testid="onboarding-continue"
                disabled={creating || !propertyName.trim()}
                className="h-11 rounded-lg bg-action-primary px-6 text-sm font-medium text-action-primary-fg transition-colors hover:bg-action-primary-hover disabled:opacity-50"
              >
                {creating ? t.step1Creating : t.step1Continue}
              </button>
              <button
                type="button"
                data-testid="onboarding-sample"
                onClick={() => void createSampleProperty()}
                disabled={creating}
                className="text-sm text-text-muted underline-offset-4 hover:text-text-primary hover:underline disabled:opacity-50"
              >
                {t.step1Sample}
              </button>
            </div>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="text-balance text-2xl font-bold tracking-tight text-text-primary sm:text-[1.75rem]">
            {`${t.step2TitlePrefix}${propertyName}${t.step2TitleSuffix}`}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-text-muted">
            {t.step2Body}
          </p>

          {/* Friendly hub-and-spoke guidance. The #1 misconfiguration
              for multi-platform hosts is cross-linking platforms
              directly (Airbnb → Booking, etc.) on top of connecting
              them to Propical — which makes every booking echo around
              and surface as a phantom double-booking. Surfacing the
              tip right at the connect step is the cheapest place to
              prevent it. */}
          <div className="mt-3 flex max-w-xl items-start gap-2 rounded-lg border border-action-primary/20 bg-action-primary/[0.04] px-3 py-2.5">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-action-primary-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm leading-relaxed text-text-muted">
              {t.hubTip}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ...PRESETS.map((p) => ({
                rowId: `preset:${p.platform}`,
                platform: p.platform,
                label: p.label,
                color: p.color,
                placeholder: p.placeholder,
                hasInstructions: p.hasInstructions,
                isDraft: false,
                displayName: undefined as string | undefined,
              })),
              ...customDrafts.map((d) => ({
                rowId: d.rowId,
                platform: d.platform,
                label: d.displayName || t.customFallback,
                color: d.color,
                placeholder: "https://…",
                hasInstructions: false,
                isDraft: true,
                displayName: d.displayName,
              })),
            ].map((row) => {
              const url = urlInputs[row.platform] ?? "";
              const isSaved = savedLinks.some((l) => l.platform === row.platform);
              const isSaving = savingPlatform === row.platform;
              const isTesting = testingPlatform === row.platform;
              const result = testResults[row.platform];
              return (
                <div
                  key={row.rowId}
                  className={`rounded-lg border p-4 transition-colors ${
                    isSaved
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      {row.isDraft ? (
                        <input
                          autoFocus
                          value={row.displayName ?? ""}
                          onChange={(e) => updateCustomDraftName(row.rowId, e.target.value)}
                          placeholder={t.customNamePlaceholder}
                          className="h-7 min-w-0 flex-1 rounded border border-border-strong bg-surface px-2 text-sm font-semibold text-text-primary outline-none focus:border-text-primary"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-text-primary">
                          {row.label}
                        </span>
                      )}
                    </div>
                    {isSaved && (
                      <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {t.connected}
                      </span>
                    )}
                    {row.isDraft && (
                      <button
                        type="button"
                        onClick={() => removeCustomDraft(row.rowId)}
                        className="rounded p-0.5 text-text-faint hover:bg-surface-hover hover:text-rose-400"
                        aria-label="Remove"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {!isSaved && (
                    <>
                      <div className="flex gap-1.5">
                        <input
                          value={url}
                          onChange={(e) => setUrl(row.platform, e.target.value)}
                          placeholder={row.placeholder}
                          disabled={
                            row.isDraft && !(row.displayName ?? "").trim()
                          }
                          className="h-9 flex-1 rounded-md border border-border-strong bg-surface-raised/40 px-2.5 text-sm text-text-primary placeholder-text-faint outline-none focus:border-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => void testPlatform(row.platform, url)}
                          disabled={!url.trim() || isTesting || isSaving}
                          className="rounded-md border border-border-strong px-2.5 py-1 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-40"
                        >
                          {isTesting ? "…" : t.test}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void savePlatform(row.platform, url, row.displayName)
                          }
                          disabled={
                            !url.trim() ||
                            isSaving ||
                            (row.isDraft && !(row.displayName ?? "").trim())
                          }
                          className="rounded-md bg-action-primary px-2.5 py-1 text-sm font-medium text-action-primary-fg transition-colors hover:bg-action-primary-hover disabled:opacity-40"
                        >
                          {isSaving ? "…" : t.save}
                        </button>
                      </div>
                      {result && (
                        <p
                          className={`mt-2 text-sm ${
                            result.success ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {result.success
                            ? gt("sync.testResult", { future: result.futureEvents ?? 0, total: result.totalEvents ?? 0 })
                            : result.error}
                        </p>
                      )}
                      {row.hasInstructions &&
                        (row.platform === "airbnb" || row.platform === "booking") && (
                          <div className="mt-2">
                            <PlatformInstructions
                              platform={row.platform}
                              mode="export"
                            />
                          </div>
                        )}
                    </>
                  )}

                  {isSaved && (
                    <div className="space-y-1.5">
                      <p className={eyebrowVariants({ variant: "tag" })}>
                        {`${t.pasteBackPrefix}${row.label}${t.pasteBackSuffix}`}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <code className="flex-1 truncate rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-text-secondary">
                          {feedUrl(row.platform)}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            void copyUrl(feedUrl(row.platform), `feed-${row.platform}`)
                          }
                          className="shrink-0 rounded-md bg-border-strong px-2.5 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
                        >
                          {copied === `feed-${row.platform}` ? t.copied : t.copy}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addCustomDraft}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-border-strong px-3 py-2 text-sm text-text-muted transition-colors hover:border-text-muted hover:text-text-primary"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M7 1v12M1 7h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            {t.addAnotherPlatform}
          </button>

          {error && step === 2 && (
            <p role="alert" className="mt-3 text-sm text-rose-400">
              {error}
            </p>
          )}

          {/* Soft escape — for hosts who don't list on any platform.
              Routes them straight to the property's calendar so they
              can add a manual reservation. The wizard exits via the
              same onComplete path so the dashboard re-renders. */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-sm">
            <span className="text-text-faint">
              {t.notListing}
            </span>
            <Link
              data-testid="onboarding-manual"
              href={propertyId ? `/dashboard?property=${propertyId}&view=calendar` : "/dashboard"}
              onClick={() => onComplete()}
              className="text-action-primary-text underline-offset-4 hover:text-action-primary-text-hover hover:underline"
            >
              {t.manualReservationLink}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function StepDot({ active, done, number }: { active: boolean; done: boolean; number: number }) {
  if (done) {
    return (
      <span
        aria-label={`Step ${number} complete`}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-action-primary text-action-primary-fg"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-current={active ? "step" : undefined}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
        active
          ? "bg-action-primary text-action-primary-fg"
          : "bg-surface-hover text-text-faint"
      }`}
    >
      {number}
    </span>
  );
}
