"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { resolvePlatformMeta } from "@/lib/platform-meta";
import { PlatformDot } from "@/components/ui/atoms/platform-dot";
import { PageHeader } from "@/components/ui/molecules/page-header";

interface CopyShape {
  title: string;
  description: string;
  loadFailed: string;
  loading: string;
  empty: string;
  errorBanner: (count: number) => string;
  openSync: string;
  okBadge: string;
  errorBadge: string;
  never: string;
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  daysAgo: (n: number) => string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    title: "iCal links",
    description:
      "All calendar feeds connected across your properties. Click a property to open its Sync settings.",
    loadFailed: "Failed to load",
    loading: "Loading...",
    empty: "No iCal links connected yet. Add them on each property's Sync settings tab.",
    errorBanner: (count) =>
      `${count} link${count === 1 ? "" : "s"} reporting an error. Open the property to check the URL.`,
    openSync: "Open Sync",
    okBadge: "OK",
    errorBadge: "Error",
    never: "never",
    justNow: "just now",
    minutesAgo: (n) => `${n}m ago`,
    hoursAgo: (n) => `${n}h ago`,
    daysAgo: (n) => `${n}d ago`,
  },
  pt: {
    title: "Links iCal",
    description:
      "Todos os feeds de calendário conectados nas suas propriedades. Clique em uma propriedade para abrir seus ajustes de Sync.",
    loadFailed: "Erro ao carregar",
    loading: "Carregando...",
    empty: "Nenhum link iCal conectado ainda. Adicione na aba de ajustes de Sync de cada propriedade.",
    errorBanner: (count) =>
      `${count} link${count === 1 ? "" : "s"} com erro. Abra a propriedade para verificar a URL.`,
    openSync: "Abrir Sync",
    okBadge: "OK",
    errorBadge: "Erro",
    never: "nunca",
    justNow: "agora mesmo",
    minutesAgo: (n) => `há ${n} min`,
    hoursAgo: (n) => `há ${n} h`,
    daysAgo: (n) => `há ${n} d`,
  },
  es: {
    title: "Enlaces iCal",
    description:
      "Todos los feeds de calendario conectados en sus alojamientos. Pulse en un alojamiento para abrir sus ajustes de Sync.",
    loadFailed: "Error al cargar",
    loading: "Cargando...",
    empty: "Aún no hay enlaces iCal conectados. Añádalos en la pestaña de ajustes de Sync de cada alojamiento.",
    errorBanner: (count) =>
      `${count} enlace${count === 1 ? "" : "s"} con error. Abra el alojamiento para revisar la URL.`,
    openSync: "Abrir Sync",
    okBadge: "OK",
    errorBadge: "Error",
    never: "nunca",
    justNow: "ahora mismo",
    minutesAgo: (n) => `hace ${n} min`,
    hoursAgo: (n) => `hace ${n} h`,
    daysAgo: (n) => `hace ${n} d`,
  },
};

// iCal links sub-route at
// /dashboard/admin/integrations/ical-links. First admin-shell surface
// that aggregates a per-property thing across the whole account: lists
// every CalendarLink the user can manage (own + managed properties),
// with platform colour, status (OK / error), and last-fetched-at. Lets
// hosts who run several properties spot a broken sync without clicking
// into each property's Sync tab one by one. Reuses the existing
// /api/calendar/links GET (with no propertyId, returns all accessible).
// Available to any logged-in user (cleaners are bounced at the shell);
// no superadmin gating since the data is the user's own.

interface CalendarLinkRow {
  id: number;
  propertyId: number;
  platform: string;
  icalExportUrl: string;
  lastFetchedAt: string | null;
  lastError: string | null;
  failureCount: number;
  property: { id: number; name: string };
}

export default function AdminIcalLinksPage() {
  const { locale } = useI18n();
  const c = COPY[locale];
  const [rows, setRows] = useState<CalendarLinkRow[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calendar/links")
      .then((r) => (r.ok ? (r.json() as Promise<CalendarLinkRow[]>) : null))
      .then((data) => {
        if (Array.isArray(data)) setRows(data);
        else setError(c.loadFailed);
      })
      .catch(() => setError(c.loadFailed))
      .finally(() => setLoaded(true));
  }, [c.loadFailed]);

  // Group by property so the table reads as "this property has these
  // feeds" rather than a flat list — for accounts with 5+ properties
  // the property-grouped layout scans much faster.
  const grouped = useMemo(() => {
    const m = new Map<number, { property: { id: number; name: string }; links: CalendarLinkRow[] }>();
    for (const r of rows) {
      const entry = m.get(r.propertyId) ?? { property: r.property, links: [] };
      entry.links.push(r);
      m.set(r.propertyId, entry);
    }
    return Array.from(m.values()).sort((a, b) => a.property.name.localeCompare(b.property.name));
  }, [rows]);

  const errorCount = rows.filter((r) => r.lastError).length;

  const formatRelative = (iso: string | null): string => {
    if (!iso) return c.never;
    const then = new Date(iso).getTime();
    const diffMin = Math.floor((now - then) / 60000);
    if (diffMin < 1) return c.justNow;
    if (diffMin < 60) return c.minutesAgo(diffMin);
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return c.hoursAgo(diffHr);
    const diffDay = Math.floor(diffHr / 24);
    return c.daysAgo(diffDay);
  };

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
          {errorCount > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-200">
              {c.errorBanner(errorCount)}
            </div>
          )}
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
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </span>
                </Link>
                <ul className="divide-y divide-border/50">
                  {g.links.map((link) => {
                    const ok = !link.lastError;
                    return (
                      <li key={link.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <PlatformDot platform={link.platform} />
                        <span className="w-32 shrink-0 text-text-secondary">
                          {resolvePlatformMeta(link.platform).displayName}
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide ${
                            ok
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {ok ? c.okBadge : c.errorBadge}
                        </span>
                        <span
                          className="min-w-0 flex-1 truncate text-xs text-text-faint"
                          title={link.lastError ?? link.icalExportUrl}
                        >
                          {link.lastError ?? link.icalExportUrl}
                        </span>
                        <span className="shrink-0 text-xs text-text-faint">
                          {formatRelative(link.lastFetchedAt)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
