"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { Chip } from "@/components/ui/atoms/chip";
import { PageHeader } from "@/components/ui/molecules/page-header";

interface CopyShape {
  title: string;
  description: string;
  loading: string;
  notSuperadmin: string;
  filterAll: string;
  filterNew: string;
  filterRead: string;
  filterArchived: string;
  refreshing: string;
  refresh: string;
  empty: string;
  anonymous: string;
  markRead: string;
  archive: string;
  restore: string;
  delete: string;
  confirmDelete: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    title: "Feedback",
    description:
      "Messages from site visitors via the floating Feedback button. Spam-gated by 30-second per-IP rate limit + honeypot.",
    loading: "Loading...",
    notSuperadmin: "Only superadmins can review feedback.",
    filterAll: "All",
    filterNew: "New",
    filterRead: "Read",
    filterArchived: "Archived",
    refreshing: "Refreshing...",
    refresh: "Refresh",
    empty: "No feedback yet.",
    anonymous: "anonymous",
    markRead: "Mark read",
    archive: "Archive",
    restore: "Restore",
    delete: "Delete",
    confirmDelete: "Permanently delete?",
  },
  pt: {
    title: "Feedback",
    description:
      "Mensagens dos visitantes do site pelo botão flutuante de Feedback. Antispam: limite de 30 segundos por IP + honeypot.",
    loading: "Carregando...",
    notSuperadmin: "Apenas superadministradores podem revisar o feedback.",
    filterAll: "Todos",
    filterNew: "Novos",
    filterRead: "Lidos",
    filterArchived: "Arquivados",
    refreshing: "Atualizando...",
    refresh: "Atualizar",
    empty: "Ainda não há feedback.",
    anonymous: "anônimo",
    markRead: "Marcar como lido",
    archive: "Arquivar",
    restore: "Restaurar",
    delete: "Excluir",
    confirmDelete: "Excluir permanentemente?",
  },
  es: {
    title: "Comentarios",
    description:
      "Mensajes de los visitantes del sitio a través del botón flotante de Feedback. Antispam: límite de 30 segundos por IP más honeypot.",
    loading: "Cargando...",
    notSuperadmin: "Solo los superadministradores pueden revisar los comentarios.",
    filterAll: "Todos",
    filterNew: "Nuevos",
    filterRead: "Leídos",
    filterArchived: "Archivados",
    refreshing: "Actualizando...",
    refresh: "Actualizar",
    empty: "Aún no hay comentarios.",
    anonymous: "anónimo",
    markRead: "Marcar como leído",
    archive: "Archivar",
    restore: "Restaurar",
    delete: "Eliminar",
    confirmDelete: "¿Eliminar de forma permanente?",
  },
};

// Site-wide visitor feedback queue. Source: the floating
// FeedbackButton mounted in the root layout. Super-admin only.
// (filter chips, table, mark-as-X actions) consistent with the rest of
// the admin section.

interface FeedbackRow {
  id: number;
  body: string;
  contactEmail: string | null;
  pagePath: string;
  userAgent: string;
  status: "new" | "read" | "archived";
  createdAt: string;
  updatedAt: string | null;
  user: { id: number; username: string | null } | null;
}

interface CountsResponse {
  new: number;
  read: number;
  archived: number;
}

interface MeResponse {
  user?: { role: string } | null;
}

type StatusFilter = "all" | "new" | "read" | "archived";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // Show date + HH:MM since feedback timestamps cluster more by hour
  // than by day.
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function AdminFeedbackPage() {
  const { locale } = useI18n();
  const c = COPY[locale];
  const [role, setRole] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [counts, setCounts] = useState<CountsResponse>({ new: 0, read: 0, archived: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: MeResponse) => {
        setRole(data?.user?.role ?? null);
        setRoleLoaded(true);
      })
      .catch(() => {
        setRoleLoaded(true);
      });
  }, []);

  const isSuperadmin = role === "superadmin";

  const load = async () => {
    if (!isSuperadmin) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/feedback", window.location.origin);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      const res = await fetch(url.toString());
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Failed to load (${res.status})`);
        return;
      }
      const data = (await res.json()) as { items: FeedbackRow[]; counts: CountsResponse };
      setItems(data.items);
      setCounts(data.counts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperadmin) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperadmin, statusFilter]);

  const setStatus = async (id: number, status: "new" | "read" | "archived") => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Failed (${res.status})`);
        return;
      }
      void load();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: number) => {
    if (!confirm(c.confirmDelete)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Failed (${res.status})`);
        return;
      }
      void load();
    } finally {
      setBusy(null);
    }
  };

  const statusTone = (status: string): "action" | "neutral" | "faint" => {
    if (status === "new") return "action";
    if (status === "read") return "neutral";
    return "faint";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={c.title} subtitle={c.description} />

      {!roleLoaded ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-faint">
          {c.loading}
        </div>
      ) : !isSuperadmin ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-muted">
          {c.notSuperadmin}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "new", "read", "archived"] as const).map((f) => {
              const count =
                f === "all"
                  ? counts.new + counts.read + counts.archived
                  : counts[f];
              const active = statusFilter === f;
              const label =
                f === "all"
                  ? c.filterAll
                  : f === "new"
                    ? c.filterNew
                    : f === "read"
                      ? c.filterRead
                      : c.filterArchived;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? "border-action-primary bg-action-primary/10 text-action-primary-text"
                      : "border-border text-text-muted hover:border-border-strong hover:text-text-primary"
                  }`}
                >
                  {label}
                  <span className="ml-1.5 text-sm text-text-faint">{count}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="ml-auto rounded-md px-2.5 py-1 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
            >
              {loading ? c.refreshing : c.refresh}
            </button>
          </div>

          <div className="rounded-xl border border-border bg-surface-raised p-2">
            {error && <p className="px-3 py-2 text-xs text-rose-300">{error}</p>}
            {!error && items.length === 0 && !loading && (
              <p className="px-3 py-2 text-xs text-text-faint">
                {c.empty}
              </p>
            )}
            {items.length > 0 && (
              <ul className="divide-y divide-border/50">
                {items.map((f) => (
                  <li key={f.id} className="px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-text-faint">
                          <Chip variant="tag" tone={statusTone(f.status)} size="sm" className="rounded-md">
                            {f.status}
                          </Chip>
                          <span>{formatDate(f.createdAt)}</span>
                          {f.user ? (
                            <>
                              <span>·</span>
                              <span className="font-medium text-text-secondary">
                                {f.user.username ?? `user #${f.user.id}`}
                              </span>
                            </>
                          ) : (
                            <>
                              <span>·</span>
                              <span className="italic">
                                {c.anonymous}
                              </span>
                            </>
                          )}
                          {f.contactEmail && (
                            <>
                              <span>·</span>
                              <a
                                href={`mailto:${f.contactEmail}`}
                                className="font-mono text-text-secondary hover:text-action-primary-text hover:underline"
                              >
                                {f.contactEmail}
                              </a>
                            </>
                          )}
                          {f.pagePath && (
                            <>
                              <span>·</span>
                              <a
                                href={f.pagePath}
                                target="_blank"
                                rel="noopener"
                                className="font-mono text-text-muted hover:text-text-primary hover:underline"
                              >
                                {f.pagePath}
                              </a>
                            </>
                          )}
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                          {f.body}
                        </p>
                        {f.userAgent && (
                          <p
                            className="mt-1.5 truncate font-mono text-sm text-text-faint"
                            title={f.userAgent}
                          >
                            {f.userAgent}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-stretch gap-1">
                        {f.status === "new" && (
                          <button
                            type="button"
                            onClick={() => void setStatus(f.id, "read")}
                            disabled={busy === f.id}
                            className="rounded-md border border-border px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
                          >
                            {c.markRead}
                          </button>
                        )}
                        {f.status !== "archived" && (
                          <button
                            type="button"
                            onClick={() => void setStatus(f.id, "archived")}
                            disabled={busy === f.id}
                            className="rounded-md border border-border px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
                          >
                            {c.archive}
                          </button>
                        )}
                        {f.status === "archived" && (
                          <button
                            type="button"
                            onClick={() => void setStatus(f.id, "new")}
                            disabled={busy === f.id}
                            className="rounded-md border border-border px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
                          >
                            {c.restore}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void remove(f.id)}
                          disabled={busy === f.id}
                          className="rounded-md border border-rose-500/30 px-2 py-1 text-sm text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-50"
                        >
                          {c.delete}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
