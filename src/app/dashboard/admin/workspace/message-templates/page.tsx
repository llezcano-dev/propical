"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

// Message templates sub-route at
// /dashboard/admin/workspace/message-templates. Cross-property overview
// of every MessageTemplate the user can manage (own + managed
// properties). Same aggregation pattern as ical-links (tick 16) +
// feed-tokens (tick 18) + sync-logs (tick 17): read-only summary in the
// admin shell, edits stay on the per-property Sync settings tab via a
// deep-link. Reuses GET /api/message-templates — extended in this tick
// to accept no propertyId and return all accessible templates with
// property metadata included for grouping. No superadmin gating; data
// is the user's own. Cleaners bounce at the shell.

interface MessageTemplateRow {
  id: number;
  propertyId: number;
  name: string;
  language: string;
  subject: string;
  body: string;
  createdAt: string;
  property: { id: number; name: string };
}

interface ApiResponse {
  templates?: MessageTemplateRow[];
}

interface CopyShape {
  failedToLoad: string;
  title: string;
  subtitle: string;
  loading: string;
  empty: string;
  summary: (total: number, properties: number) => string;
  openSync: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    failedToLoad: "Failed to load",
    title: "Message templates",
    subtitle: "All message templates across your properties. Click a property to open its Sync settings, where templates are edited.",
    loading: "Loading...",
    empty: "No templates yet. Open a property and add them on its Sync settings tab.",
    summary: (total, properties) =>
      `${total} template${total === 1 ? "" : "s"} across ${properties} propert${properties === 1 ? "y" : "ies"}.`,
    openSync: "Open Sync",
  },
  pt: {
    failedToLoad: "Erro ao carregar",
    title: "Modelos de mensagens",
    subtitle: "Todos os modelos de mensagens nas suas propriedades. Clique em uma propriedade para abrir seus ajustes de Sync, onde os modelos são editados.",
    loading: "Carregando...",
    empty: "Ainda não há modelos. Abra uma propriedade e adicione na aba de ajustes de Sync.",
    summary: (total, properties) =>
      `${total} modelo${total === 1 ? "" : "s"} em ${properties} propriedade${properties === 1 ? "" : "s"}.`,
    openSync: "Abrir Sync",
  },
  es: {
    failedToLoad: "Error al cargar",
    title: "Plantillas de mensajes",
    subtitle: "Todas las plantillas de mensajes en sus alojamientos. Pulse en un alojamiento para abrir sus ajustes de Sync, donde se editan las plantillas.",
    loading: "Cargando...",
    empty: "Aún no hay plantillas. Abra un alojamiento y añádalas en la pestaña de ajustes de Sync.",
    summary: (total, properties) =>
      `${total} plantilla${total === 1 ? "" : "s"} en ${properties} alojamiento${properties === 1 ? "" : "s"}.`,
    openSync: "Abrir Sync",
  },
};

export default function AdminMessageTemplatesPage() {
  const { locale } = useI18n();
  const t = COPY[locale];
  const [rows, setRows] = useState<MessageTemplateRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/message-templates")
      .then((r) => (r.ok ? (r.json() as Promise<ApiResponse>) : null))
      .then((data) => {
        const list = Array.isArray(data?.templates) ? data!.templates! : [];
        setRows(list);
      })
      .catch(() => setError(t.failedToLoad))
      .finally(() => setLoaded(true));
  }, [t.failedToLoad]);

  // Group templates by property — mirrors the iCal-links + feed-tokens
  // overview shape so the shell reads consistently across these
  // cross-property surfaces.
  const grouped = useMemo(() => {
    const m = new Map<
      number,
      { property: { id: number; name: string }; templates: MessageTemplateRow[] }
    >();
    for (const r of rows) {
      const entry = m.get(r.propertyId) ?? { property: r.property, templates: [] };
      entry.templates.push(r);
      m.set(r.propertyId, entry);
    }
    return Array.from(m.values()).sort((a, b) =>
      a.property.name.localeCompare(b.property.name),
    );
  }, [rows]);

  const totalCount = rows.length;
  const propertyCount = grouped.length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      {!loaded ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-faint">
          {t.loading}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-5 text-sm text-rose-300">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-muted">
          {t.empty}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-surface-raised p-3 text-sm text-text-muted">
            {t.summary(totalCount, propertyCount)}
          </div>
          <div className="space-y-4">
            {grouped.map((g) => (
              <div
                key={g.property.id}
                className="overflow-hidden rounded-xl border border-border bg-surface-raised"
              >
                <Link
                  href={`/dashboard?property=${g.property.id}&view=sync`}
                  className="flex items-center justify-between border-b border-border bg-surface-hover/40 px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
                >
                  <span>{g.property.name}</span>
                  <span className="flex items-center gap-1 text-xs text-text-faint">
                    {t.openSync}
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </span>
                </Link>
                <ul className="divide-y divide-border/50">
                  {g.templates.map((tpl) => (
                    <li
                      key={tpl.id}
                      className="flex items-start gap-3 px-4 py-2.5 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-text-primary">{tpl.name}</span>
                          <span className="rounded bg-surface-hover px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-text-muted">
                            {tpl.language}
                          </span>
                        </div>
                        <div
                          className="mt-0.5 truncate text-xs text-text-faint"
                          title={tpl.subject || tpl.body}
                        >
                          {tpl.subject || tpl.body.slice(0, 120)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
