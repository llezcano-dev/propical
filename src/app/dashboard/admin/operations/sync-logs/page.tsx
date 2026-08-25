"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import type { Locale, TranslationKey } from "@/lib/i18n/translations";
import { renderSyncLogMessage } from "@/lib/sync-log-messages";
import { Chip } from "@/components/ui/atoms/chip";
import { PageHeader } from "@/components/ui/molecules/page-header";

// Sync logs sub-route at
// /dashboard/admin/operations/sync-logs. Aggregates across all the
// user's accessible properties so they can scan recent sync runs in
// one chronological feed instead of opening each property's Sync tab.
// Reuses GET /api/calendar/sync (no propertyId) which already scopes
// to the user's accessible property set + includes global (propertyId
// null) entries. Pulls /api/properties separately to map propertyId
// to property name for display — same approach the dashboard uses, no
// API change required.
//
// Available to any logged-in user (cleaners are bounced at the shell);
// no superadmin gating since the data is the user's own.

interface SyncLogRow {
  id: number;
  propertyId: number | null;
  level: string;
  message: string;
  createdAt: string;
}

interface SyncResponse {
  logs?: SyncLogRow[];
}

interface PropertyRow {
  id: number;
  name: string;
}

type LevelFilter = "all" | "issues";

interface CopyShape {
  failedToLoad: string;
  dateLocale: string;
  title: string;
  subtitle: string;
  all: string;
  issuesOnly: string;
  loading: string;
  noIssues: string;
  noEntries: string;
  global: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    failedToLoad: "Failed to load",
    dateLocale: "en-GB",
    title: "Sync logs",
    subtitle: "Chronological feed of sync events across all your properties. Last 200 entries.",
    all: "All",
    issuesOnly: "Issues only",
    loading: "Loading...",
    noIssues: "No issues — every sync completed cleanly.",
    noEntries: "No log entries yet. They'll appear after the first sync run.",
    global: "global",
  },
  pt: {
    failedToLoad: "Erro ao carregar",
    dateLocale: "pt-BR",
    title: "Logs de sincronização",
    subtitle: "Feed cronológico de eventos de sincronização em todas as suas propriedades. Últimas 200 entradas.",
    all: "Todos",
    issuesOnly: "Somente problemas",
    loading: "Carregando...",
    noIssues: "Sem problemas: todas as sincronizações foram concluídas com sucesso.",
    noEntries: "Ainda não há entradas. Elas aparecerão após a primeira sincronização.",
    global: "global",
  },
  es: {
    failedToLoad: "Error al cargar",
    dateLocale: "es-ES",
    title: "Logs de sync",
    subtitle: "Feed cronológico de eventos de sync en todos sus alojamientos. Últimas 200 entradas.",
    all: "Todos",
    issuesOnly: "Solo incidencias",
    loading: "Cargando...",
    noIssues: "Sin incidencias: todas las sincronizaciones se completaron sin problemas.",
    noEntries: "Aún no hay entradas. Aparecerán tras el primer sync.",
    global: "global",
  },
};

export default function AdminSyncLogsPage() {
  const { locale, t: translate } = useI18n();
  const t = COPY[locale];
  const [logs, setLogs] = useState<SyncLogRow[]>([]);
  const [props, setProps] = useState<PropertyRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LevelFilter>("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/calendar/sync?limit=200").then((r) =>
        r.ok ? (r.json() as Promise<SyncResponse>) : null
      ),
      fetch("/api/properties").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([syncData, propsData]) => {
        if (syncData && Array.isArray(syncData.logs)) setLogs(syncData.logs);
        // /api/properties without page/limit returns the full array (see
        // src/app/api/properties/route.ts:35).
        if (Array.isArray(propsData)) {
          setProps(propsData.map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })));
        }
      })
      .catch(() => setError(t.failedToLoad))
      .finally(() => setLoaded(true));
  }, [t.failedToLoad]);

  const propNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of props) m.set(p.id, p.name);
    return m;
  }, [props]);

  const visible = useMemo(() => {
    if (filter === "all") return logs;
    return logs.filter((l) => l.level === "warn" || l.level === "error");
  }, [logs, filter]);

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString(t.dateLocale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Match the dot+pill colour conventions used in the audit page.
  const levelTone = (lvl: string): { dot: string; tone: "error" | "warning" | "success" | "info" } => {
    if (lvl === "error") return { dot: "bg-rose-400", tone: "error" };
    if (lvl === "warn") return { dot: "bg-amber-400", tone: "warning" };
    if (lvl === "success") return { dot: "bg-emerald-400", tone: "success" };
    return { dot: "bg-sky-400", tone: "info" };
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "all"
              ? "bg-surface-hover text-text-primary"
              : "text-text-muted hover:bg-surface-hover/60"
          }`}
        >
          {t.all}
          <span className="ml-1 text-text-faint">({logs.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setFilter("issues")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "issues"
              ? "bg-surface-hover text-text-primary"
              : "text-text-muted hover:bg-surface-hover/60"
          }`}
        >
          {t.issuesOnly}
          <span className="ml-1 text-text-faint">({errorCount + warnCount})</span>
        </button>
      </div>

      {!loaded ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-faint">
          {t.loading}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-5 text-sm text-rose-300">
          {error}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-muted">
          {filter === "issues" ? t.noIssues : t.noEntries}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
          <ul className="divide-y divide-border/50">
            {visible.map((log) => {
              const tone = levelTone(log.level);
              const propName = log.propertyId !== null ? propNameById.get(log.propertyId) : null;
              return (
                <li key={log.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
                  <Chip variant="tag" tone={tone.tone} size="sm" className="shrink-0 font-semibold">
                    {log.level}
                  </Chip>
                  {log.propertyId !== null ? (
                    <Link
                      href={`/dashboard?property=${log.propertyId}&view=sync`}
                      className="shrink-0 text-xs text-text-muted hover:text-text-primary hover:underline"
                    >
                      {propName ?? `#${log.propertyId}`}
                    </Link>
                  ) : (
                    <span className="shrink-0 text-xs text-text-faint">
                      {t.global}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-text-secondary" title={log.message}>
                    {renderSyncLogMessage(log.message, (key, params) =>
                      translate(key as TranslationKey, params),
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-text-faint">{formatTime(log.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
