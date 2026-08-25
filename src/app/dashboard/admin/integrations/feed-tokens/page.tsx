"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

interface CopyShape {
  title: string;
  description: string;
  loadFailed: string;
  loading: string;
  empty: string;
  publicCountLabel: string;
  gatedCountLabel: string;
  gatedBadge: string;
  publicBadge: string;
  openSync: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    title: "Feed access tokens",
    description:
      "Each property exposes a combined iCal feed URL. Without a token the URL is public — anyone with the link can read it. With a token set, the URL becomes private. Overview of statuses; token rotation lives on each property's Sync settings tab.",
    loadFailed: "Failed to load",
    loading: "Loading...",
    empty: "No properties yet. Add a property to get its iCal feed URL.",
    publicCountLabel: "Public feed: ",
    gatedCountLabel: "Token set: ",
    gatedBadge: "Token set",
    publicBadge: "Public",
    openSync: "Open Sync →",
  },
  pt: {
    title: "Tokens de acesso ao feed",
    description:
      "Cada propriedade expõe uma URL de feed iCal combinada. Sem token a URL é pública — qualquer pessoa com o link pode lê-la. Com um token definido, a URL se torna privada. Resumo de estados; a rotação do token é feita na aba Sync de cada propriedade.",
    loadFailed: "Erro ao carregar",
    loading: "Carregando...",
    empty: "Ainda não há propriedades. Adicione uma para obter sua URL de feed iCal.",
    publicCountLabel: "Feed público: ",
    gatedCountLabel: "Token definido: ",
    gatedBadge: "Com token",
    publicBadge: "Público",
    openSync: "Abrir Sync →",
  },
  es: {
    title: "Tokens de acceso al feed",
    description:
      "Cada alojamiento expone una URL de feed iCal combinada. Sin token la URL es pública: cualquiera con el enlace puede leerla. Con un token definido, la URL pasa a ser privada. Resumen de estados; la rotación del token se hace en la pestaña de Sync de cada alojamiento.",
    loadFailed: "Error al cargar",
    loading: "Cargando...",
    empty: "Aún no hay alojamientos. Añada uno para obtener su URL de feed iCal.",
    publicCountLabel: "Feed público: ",
    gatedCountLabel: "Token definido: ",
    gatedBadge: "Con token",
    publicBadge: "Público",
    openSync: "Abrir Sync →",
  },
};

// Feed access tokens sub-route at
// /dashboard/admin/integrations/feed-tokens. Same aggregation pattern
// as ticks 16 + 17: gives owners of multiple properties a single
// surface to see which ones expose a public feed URL vs which ones
// have a token set (private). Token rotation itself stays inside the
// per-property Sync settings tab — this page is a read-only overview
// with deep links into the rotation UI.
//
// Reuses GET /api/properties (no page/limit returns the full array
// with all scalar fields including feedToken) — no API change.

interface PropertyRow {
  id: number;
  name: string;
  feedToken: string | null;
}

export default function AdminFeedTokensPage() {
  const { locale } = useI18n();
  const c = COPY[locale];
  const [props, setProps] = useState<PropertyRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setProps(
            data.map((p: { id: number; name: string; feedToken: string | null }) => ({
              id: p.id,
              name: p.name,
              feedToken: p.feedToken,
            }))
          );
        } else {
          setError(c.loadFailed);
        }
      })
      .catch(() => setError(c.loadFailed))
      .finally(() => setLoaded(true));
  }, [c.loadFailed]);

  const sorted = useMemo(
    () => [...props].sort((a, b) => a.name.localeCompare(b.name)),
    [props]
  );
  const publicCount = props.filter((p) => !p.feedToken).length;
  const gatedCount = props.length - publicCount;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={c.title} subtitle={c.description} />

      {!loaded ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-faint">
          {c.loading}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-5 text-sm text-rose-300">
          {error}
        </div>
      ) : props.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-muted">
          {c.empty}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 text-xs text-text-muted">
            <span>
              {c.publicCountLabel}
              <span className="text-text-primary">{publicCount}</span>
            </span>
            <span>
              {c.gatedCountLabel}
              <span className="text-text-primary">{gatedCount}</span>
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
            <ul className="divide-y divide-border/50">
              {sorted.map((p) => {
                const gated = !!p.feedToken;
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 flex-1 truncate text-text-primary">{p.name}</span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide ${
                        gated
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {gated ? c.gatedBadge : c.publicBadge}
                    </span>
                    <Link
                      href={`/dashboard?property=${p.id}&view=sync`}
                      className="shrink-0 text-xs text-text-muted hover:text-text-primary hover:underline"
                    >
                      {c.openSync}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
