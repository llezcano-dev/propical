"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

// Guest form templates sub-route at
// /dashboard/admin/content/guest-forms. Cross-property overview of
// every GuestFormTemplate the user can manage. Same pattern
// as iCal links / feed tokens / message templates — read-only summary
// in the admin shell, edits stay on the per-property settings tab via
// a deep-link. Surfaces field-count + submission-count per template so
// hosts can spot which properties have an active template and how
// often guests are filling it.

interface CopyShape {
  title: string;
  description: string;
  loadFailed: string;
  loading: string;
  empty: string;
  loadingEllipsis: string;
  summary: (totalCount: number, propertyCount: number, totalSubmissions: number) => string;
  openSync: string;
  untitled: string;
  fields: (n: number) => string;
  submissions: (n: number) => string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    title: "Guest form templates",
    description:
      "All guest pre-arrival form templates across your properties. Click a property to open its Sync settings, where the template is edited.",
    loadFailed: "Failed to load",
    loading: "Loading...",
    empty:
      "No guest forms configured yet. Open a property and build a template on its Sync settings tab.",
    loadingEllipsis: "Loading...",
    summary: (totalCount, propertyCount, totalSubmissions) =>
      `${totalCount} template${totalCount === 1 ? "" : "s"} across ${propertyCount} propert${
        propertyCount === 1 ? "y" : "ies"
      } · ${totalSubmissions} submission${totalSubmissions === 1 ? "" : "s"}.`,
    openSync: "Open Sync",
    untitled: "Untitled template",
    fields: (n) => `${n} field${n === 1 ? "" : "s"}`,
    submissions: (n) => `${n} submission${n === 1 ? "" : "s"}`,
  },
  pt: {
    title: "Modelos de formulários para hóspedes",
    description:
      "Todos os modelos de formulários de pré-chegada nas suas propriedades. Clique em uma propriedade para abrir as configurações de Sync, onde o modelo é editado.",
    loadFailed: "Erro ao carregar",
    loading: "Carregando...",
    empty:
      "Ainda não há formulários para hóspedes configurados. Abra uma propriedade e crie um modelo na aba de configurações de Sync.",
    loadingEllipsis: "Carregando...",
    summary: (totalCount, propertyCount, totalSubmissions) =>
      `${totalCount} modelo${totalCount === 1 ? "" : "s"} em ${propertyCount} propriedade${
        propertyCount === 1 ? "" : "s"
      } · ${totalSubmissions} envio${totalSubmissions === 1 ? "" : "s"}.`,
    openSync: "Abrir Sync",
    untitled: "Modelo sem título",
    fields: (n) => `${n} campo${n === 1 ? "" : "s"}`,
    submissions: (n) => `${n} envio${n === 1 ? "" : "s"}`,
  },
  es: {
    title: "Plantillas de formularios para huéspedes",
    description:
      "Todas las plantillas de formularios previos a la llegada en sus alojamientos. Pulse en un alojamiento para abrir sus ajustes de Sync, donde se edita la plantilla.",
    loadFailed: "Error al cargar",
    loading: "Cargando...",
    empty:
      "Aún no hay formularios para huéspedes configurados. Abra un alojamiento y cree una plantilla en la pestaña de ajustes de Sync.",
    loadingEllipsis: "Cargando...",
    summary: (totalCount, propertyCount, totalSubmissions) =>
      `${totalCount} plantilla${totalCount === 1 ? "" : "s"} en ${propertyCount} alojamiento${
        propertyCount === 1 ? "" : "s"
      } · ${totalSubmissions} respuesta${totalSubmissions === 1 ? "" : "s"}.`,
    openSync: "Abrir Sync",
    untitled: "Plantilla sin título",
    fields: (n) => `${n} campo${n === 1 ? "" : "s"}`,
    submissions: (n) => `${n} respuesta${n === 1 ? "" : "s"}`,
  },
};

interface TemplateRow {
  id: number;
  propertyId: number;
  name: string;
  fieldCount: number;
  submissionCount: number;
  createdAt: string;
  updatedAt: string | null;
  property: { id: number; name: string };
}

interface ApiResponse {
  templates?: TemplateRow[];
}

export default function AdminGuestFormsPage() {
  const { locale } = useI18n();
  const c = COPY[locale];
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/guest-form-templates")
      .then((r) => (r.ok ? (r.json() as Promise<ApiResponse>) : null))
      .then((data) => {
        const list = Array.isArray(data?.templates) ? data!.templates! : [];
        setRows(list);
      })
      .catch(() => setError(c.loadFailed))
      .finally(() => setLoaded(true));
  }, [c.loadFailed]);

  const grouped = useMemo(() => {
    const m = new Map<
      number,
      { property: { id: number; name: string }; templates: TemplateRow[] }
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
  const totalSubmissions = rows.reduce((sum, r) => sum + r.submissionCount, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={c.title} subtitle={c.description} />

      {!loaded ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-faint">
          {c.loading}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-5 text-sm text-rose-300">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-muted">
          {c.empty}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-surface-raised p-3 text-sm text-text-muted">
            {c.summary(totalCount, propertyCount, totalSubmissions)}
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
                    {c.openSync}
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
                      className="flex items-center gap-3 px-4 py-2.5 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-text-primary">
                          {tpl.name || c.untitled}
                        </div>
                        <div className="text-sm text-text-faint">
                          {c.fields(tpl.fieldCount)}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide ${
                          tpl.submissionCount > 0
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-surface-hover text-text-muted"
                        }`}
                      >
                        {c.submissions(tpl.submissionCount)}
                      </span>
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
