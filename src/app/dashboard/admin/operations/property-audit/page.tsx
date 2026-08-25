"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

// Property audit dashboard. Lists every property the host can manage,
// runs the /api/properties/[id]/audit endpoint per property on demand,
// and renders the structured findings with per-severity styling.
//
// Read-only — no mutating actions. Findings link out to the relevant
// admin surface (sync logs, settings) where the host can fix the
// underlying issue. The audit deliberately re-uses the same
// generateFeed() the public iCal endpoint uses, so what's surfaced
// here is exactly what Airbnb / Booking are crawling right now.

interface AuditFinding {
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  details?: Record<string, unknown>;
}

interface FeedSummary {
  platform: string;
  totalEvents: number;
  upcomingEvents: number;
  sample: Array<{ uid: string; summary: string; startDate: string; endDate: string }>;
  error?: string;
}

interface AuditReport {
  propertyId: number;
  propertyName: string;
  generatedAt: string;
  settings: {
    minNights: number;
    bookingWindow: number;
    cleaningEnabled: boolean;
    feedTokenSet: boolean;
    checkInTime: string;
    checkOutTime: string;
  };
  links: Array<{
    platform: string;
    bufferBefore: number;
    bufferAfter: number;
    lastFetchedAt: string | null;
    lastError: string | null;
    failureCount: number;
    minutesSinceLastFetch: number | null;
  }>;
  counts: {
    reservations: number;
    upcomingReservations: number;
    syncedEvents: number;
    upcomingSyncedEvents: number;
    overrides: { open: number; closed: number };
    cleaningOverrides: number;
  };
  feeds: FeedSummary[];
  findings: AuditFinding[];
}

interface CopyShape {
  title: string;
  subtitle: string;
  loading: string;
  noProperties: string;
  runAudit: string;
  rerun: string;
  generatedAt: string;
  noFindings: string;
  settingsHeader: string;
  linksHeader: string;
  feedsHeader: string;
  findingsHeader: string;
  counts: (label: string, n: number) => string;
  errors: string;
  warnings: string;
  infos: string;
  events: string;
  upcoming: string;
  bufferBefore: string;
  bufferAfter: string;
  lastSync: string;
  never: string;
  minutesAgo: (n: number) => string;
  feedSample: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    title: "Property audit",
    subtitle: "End-to-end correctness check per property — settings, calendar links, reservation/synced-event overlap, override conflicts, and a spot-check of the iCal feed Airbnb / Booking are reading right now.",
    loading: "Running audit…",
    noProperties: "No properties to audit. Create one first.",
    runAudit: "Run audit",
    rerun: "Re-run",
    generatedAt: "Generated",
    noFindings: "✓ No issues. Settings + data + feed all consistent.",
    settingsHeader: "Settings",
    linksHeader: "Calendar links",
    feedsHeader: "iCal feed contents",
    findingsHeader: "Findings",
    counts: (label, n) => `${n} ${label}`,
    errors: "errors",
    warnings: "warnings",
    infos: "notes",
    events: "events",
    upcoming: "upcoming",
    bufferBefore: "buffer before",
    bufferAfter: "buffer after",
    lastSync: "last sync",
    never: "never",
    minutesAgo: (n) => `${n} min ago`,
    feedSample: "First 5 events:",
  },
  pt: {
    title: "Auditoria da propriedade",
    subtitle: "Verificação de consistência de ponta a ponta por propriedade — configurações, conexões de calendário, sobreposição entre reservas e eventos sincronizados, conflitos de overrides e uma checagem do feed iCal que o Airbnb / Booking estão lendo agora.",
    loading: "Executando auditoria…",
    noProperties: "Não há propriedades para auditar. Crie uma primeiro.",
    runAudit: "Executar auditoria",
    rerun: "Executar novamente",
    generatedAt: "Gerado",
    noFindings: "✓ Sem problemas. Configurações, dados e feed consistentes.",
    settingsHeader: "Configurações",
    linksHeader: "Conexões de calendário",
    feedsHeader: "Conteúdo do feed iCal",
    findingsHeader: "Constatações",
    counts: (label, n) => `${n} ${label}`,
    errors: "erros",
    warnings: "avisos",
    infos: "notas",
    events: "eventos",
    upcoming: "próximos",
    bufferBefore: "buffer antes",
    bufferAfter: "buffer depois",
    lastSync: "última sincronização",
    never: "nunca",
    minutesAgo: (n) => `${n} min atrás`,
    feedSample: "Primeiros 5 eventos:",
  },
  es: {
    title: "Auditoría del alojamiento",
    subtitle: "Comprobación de coherencia de extremo a extremo por alojamiento — ajustes, conexiones de calendario, solapamientos entre reservas y eventos sincronizados, conflictos de overrides y una verificación del feed iCal que Airbnb / Booking están leyendo ahora.",
    loading: "Ejecutando auditoría…",
    noProperties: "No hay alojamientos para auditar. Cree uno primero.",
    runAudit: "Ejecutar auditoría",
    rerun: "Reejecutar",
    generatedAt: "Generado",
    noFindings: "✓ Sin incidencias. Ajustes, datos y feed coherentes.",
    settingsHeader: "Ajustes",
    linksHeader: "Conexiones de calendario",
    feedsHeader: "Contenido del feed iCal",
    findingsHeader: "Hallazgos",
    counts: (label, n) => `${n} ${label}`,
    errors: "errores",
    warnings: "advertencias",
    infos: "notas",
    events: "eventos",
    upcoming: "próximos",
    bufferBefore: "buffer antes",
    bufferAfter: "buffer después",
    lastSync: "última sync",
    never: "nunca",
    minutesAgo: (n) => `hace ${n} min`,
    feedSample: "5 primeros eventos:",
  },
};

interface PropertyRow {
  id: number;
  name: string;
}

export default function PropertyAuditPage() {
  const { locale } = useI18n();
  const t = COPY[locale];

  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [reports, setReports] = useState<Record<number, AuditReport>>({});
  const [running, setRunning] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProperties(data.map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {
        // ignore — empty list shown
      })
      .finally(() => setLoadingProps(false));
  }, []);

  const runAudit = async (propertyId: number) => {
    setRunning((prev) => ({ ...prev, [propertyId]: true }));
    setErrors((prev) => ({ ...prev, [propertyId]: "" }));
    try {
      const res = await fetch(`/api/properties/${propertyId}/audit`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrors((prev) => ({ ...prev, [propertyId]: body.error || `HTTP ${res.status}` }));
        return;
      }
      const report: AuditReport = await res.json();
      setReports((prev) => ({ ...prev, [propertyId]: report }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [propertyId]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setRunning((prev) => ({ ...prev, [propertyId]: false }));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      {loadingProps ? (
        <p className="text-sm text-text-faint">{t.loading}</p>
      ) : properties.length === 0 ? (
        <p className="text-sm text-text-faint">{t.noProperties}</p>
      ) : (
        <ul className="space-y-4">
          {properties.map((p) => {
            const report = reports[p.id];
            const isRunning = running[p.id];
            const error = errors[p.id];
            return (
              <li key={p.id} className="rounded-lg border border-border bg-surface-raised p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-text-primary">{p.name}</h3>
                  <button
                    onClick={() => runAudit(p.id)}
                    disabled={isRunning}
                    className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                  >
                    {isRunning ? t.loading : report ? t.rerun : t.runAudit}
                  </button>
                </div>

                {error && (
                  <p className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-500">
                    {error}
                  </p>
                )}

                {report && <ReportView report={report} t={t} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ReportView({ report, t }: { report: AuditReport; t: CopyShape }) {
  const errorCount = report.findings.filter((f) => f.severity === "error").length;
  const warningCount = report.findings.filter((f) => f.severity === "warning").length;
  const infoCount = report.findings.filter((f) => f.severity === "info").length;

  return (
    <div className="mt-4 space-y-4 text-sm">
      <div className="flex flex-wrap gap-3 text-sm text-text-faint">
        <span>{new Date(report.generatedAt).toLocaleString()}</span>
        {errorCount > 0 && <span className="text-rose-500">{errorCount} {t.errors}</span>}
        {warningCount > 0 && <span className="text-amber-500">{warningCount} {t.warnings}</span>}
        {infoCount > 0 && <span>{infoCount} {t.infos}</span>}
        {report.findings.length === 0 && <span className="text-emerald-500">{t.noFindings}</span>}
      </div>

      {/* Settings */}
      <details className="rounded-md border border-border bg-surface px-3 py-2">
        <summary className="cursor-pointer font-medium text-text-secondary">{t.settingsHeader}</summary>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-text-faint">minNights</dt>
          <dd>{report.settings.minNights}</dd>
          <dt className="text-text-faint">bookingWindow</dt>
          <dd>{report.settings.bookingWindow}d</dd>
          <dt className="text-text-faint">cleaningEnabled</dt>
          <dd>{report.settings.cleaningEnabled ? "yes" : "no"}</dd>
          <dt className="text-text-faint">feedToken</dt>
          <dd>{report.settings.feedTokenSet ? "set" : "public"}</dd>
          <dt className="text-text-faint">check-in / out</dt>
          <dd>{report.settings.checkInTime} / {report.settings.checkOutTime}</dd>
          <dt className="text-text-faint">reservations</dt>
          <dd>{report.counts.reservations} ({report.counts.upcomingReservations} {t.upcoming})</dd>
          <dt className="text-text-faint">synced events</dt>
          <dd>{report.counts.syncedEvents} ({report.counts.upcomingSyncedEvents} {t.upcoming})</dd>
          <dt className="text-text-faint">overrides</dt>
          <dd>{report.counts.overrides.open} open / {report.counts.overrides.closed} closed</dd>
        </dl>
      </details>

      {/* Calendar links */}
      <details className="rounded-md border border-border bg-surface px-3 py-2">
        <summary className="cursor-pointer font-medium text-text-secondary">{t.linksHeader} ({report.links.length})</summary>
        <ul className="mt-2 space-y-1 text-sm">
          {report.links.length === 0 && (
            <li className="text-text-faint">—</li>
          )}
          {report.links.map((l, i) => (
            <li key={i} className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="font-mono text-text-secondary">{l.platform}</span>
              <span className="text-text-faint">{t.bufferBefore} {l.bufferBefore}d</span>
              <span className="text-text-faint">{t.bufferAfter} {l.bufferAfter}d</span>
              <span className="text-text-faint">
                {t.lastSync}:{" "}
                {l.lastFetchedAt
                  ? l.minutesSinceLastFetch !== null
                    ? t.minutesAgo(l.minutesSinceLastFetch)
                    : new Date(l.lastFetchedAt).toLocaleString()
                  : t.never}
              </span>
              {l.lastError && <span className="text-rose-500">! {l.lastError}</span>}
            </li>
          ))}
        </ul>
      </details>

      {/* Feed contents */}
      <details className="rounded-md border border-border bg-surface px-3 py-2">
        <summary className="cursor-pointer font-medium text-text-secondary">{t.feedsHeader} ({report.feeds.length})</summary>
        <ul className="mt-2 space-y-3 text-sm">
          {report.feeds.map((f, i) => (
            <li key={i}>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-text-secondary">{f.platform}</span>
                {f.error ? (
                  <span className="text-rose-500">{f.error}</span>
                ) : (
                  <>
                    <span className="text-text-faint">{f.totalEvents} {t.events}</span>
                    <span className="text-text-faint">({f.upcomingEvents} {t.upcoming})</span>
                  </>
                )}
              </div>
              {f.sample.length > 0 && (
                <div className="mt-1.5 ml-3">
                  <p className="text-text-faint">{t.feedSample}</p>
                  <ul className="mt-0.5 space-y-0.5 font-mono text-sm text-text-secondary">
                    {f.sample.map((s, idx) => (
                      <li key={idx}>
                        {s.startDate} → {s.endDate} <span className="text-text-faint">{s.summary || s.uid}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </details>

      {/* Findings */}
      {report.findings.length > 0 && (
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <div className="font-medium text-text-secondary">{t.findingsHeader}</div>
          <ul className="mt-2 space-y-2">
            {report.findings
              .slice()
              .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
              .map((f, i) => (
                <li key={i} className={`rounded px-2 py-1.5 text-sm ${severityClass(f.severity)}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="rounded px-1 text-sm font-bold uppercase tracking-wider">
                      {f.category}
                    </span>
                    <span>{f.message}</span>
                  </div>
                  {f.details && Object.keys(f.details).length > 0 && (
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-sm opacity-70">
                      {JSON.stringify(f.details, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function severityRank(s: AuditFinding["severity"]): number {
  if (s === "error") return 0;
  if (s === "warning") return 1;
  return 2;
}

function severityClass(s: AuditFinding["severity"]): string {
  if (s === "error") return "border border-rose-500/30 bg-rose-500/[0.06] text-rose-700 dark:text-rose-300";
  if (s === "warning") return "border border-amber-500/30 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300";
  return "border border-border-strong bg-surface-raised text-text-muted";
}

// Suppress an "unused" import warning while the file structure stays
// stable across edits; Link is referenced in case the UI grows
// per-finding "fix this" links pointing into the admin tree.
void Link;
