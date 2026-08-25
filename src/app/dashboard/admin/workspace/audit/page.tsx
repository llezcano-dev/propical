"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

// Audit log sub-route at
// /dashboard/admin/workspace/audit. Reuses the same /api/audit
// endpoint AuditPanel calls, but as a routed page (no modal overlay)
// so it lives in the admin shell and can be deep-linked. The data is
// per-user (filters by session.userId on the server) — when a global
// admin audit endpoint exists, this page swaps its fetch URL.

interface AuditEntry {
  id: number;
  action: string;
  resourceType: string;
  resourceId: number;
  payload: string | null;
  createdAt: string;
}

interface AuditResponse {
  entries?: AuditEntry[];
}

interface CopyShape {
  dateLocale: string;
  title: string;
  subtitle: string;
  loading: string;
  empty: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    dateLocale: "en-GB",
    title: "Audit log",
    subtitle: "Recent actions tied to your session. The last 50 entries are kept.",
    loading: "Loading...",
    empty: "No activity yet.",
  },
  pt: {
    dateLocale: "pt-BR",
    title: "Registro de auditoria",
    subtitle: "Ações recentes associadas à sua sessão. São mantidas as 50 últimas entradas.",
    loading: "Carregando...",
    empty: "Nenhuma atividade ainda.",
  },
  es: {
    dateLocale: "es-ES",
    title: "Registro de auditoría",
    subtitle: "Acciones recientes asociadas a su sesión. Se conservan las 50 últimas entradas.",
    loading: "Cargando...",
    empty: "Aún no hay actividad.",
  },
};

function summarize(e: AuditEntry): string {
  if (!e.payload) return `#${e.resourceId}`;
  try {
    const obj = JSON.parse(e.payload) as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined);
    if (keys.length === 0) return `#${e.resourceId}`;
    const head = keys.slice(0, 3).join(", ");
    return `#${e.resourceId} · ${head}`;
  } catch {
    return `#${e.resourceId}`;
  }
}

function actionTone(action: string): string {
  if (action === "create") return "bg-emerald-500/15 text-emerald-500";
  if (action === "delete") return "bg-rose-500/15 text-rose-500";
  return "bg-sky-400/15 text-sky-400";
}

export default function AdminAuditPage() {
  const { locale } = useI18n();
  const t = COPY[locale];
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => (r.ok ? (r.json() as Promise<AuditResponse>) : null))
      .then((data) => {
        setEntries(Array.isArray(data?.entries) ? data!.entries! : []);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(t.dateLocale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
        {!loaded ? (
          <div className="px-4 py-6 text-sm text-text-faint">
            {t.loading}
          </div>
        ) : entries.length === 0 ? (
          <div className="px-4 py-6 text-sm text-text-faint">
            {t.empty}
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-sm font-semibold uppercase ${actionTone(e.action)}`}>
                    {e.action}
                  </span>
                  <span className="shrink-0 text-text-muted">{e.resourceType}</span>
                  <span className="truncate text-text-primary">{summarize(e)}</span>
                </div>
                <span className="shrink-0 text-text-faint">{formatDate(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
