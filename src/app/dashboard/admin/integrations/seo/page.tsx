"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { Eyebrow } from "@/components/ui/atoms/eyebrow";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

interface CopyShape {
  title: string;
  description: string;
  loading: string;
  notSuperadmin: string;
  existingHeader: string;
  refreshing: string;
  refresh: string;
  loadFailed: (status: number) => string;
  loadFailedShort: string;
  empty: string;
  noTitleOverride: string;
  titleLabel: string;
  descriptionLabel: string;
  ogImageLabel: string;
  canonicalLabel: string;
  failedSave: string;
  saveFailed: string;
  saved: string;
  failedDelete: string;
  failedCreate: string;
  confirmDelete: (path: string, locale: string) => string;
  delete: string;
  saving: string;
  save: string;
  addOverrideTitle: string;
  addOverrideDescription: string;
  titlePlaceholder: (max: number) => string;
  descriptionPlaceholder: (max: number) => string;
  ogImagePlaceholder: string;
  canonicalPlaceholder: string;
  adding: string;
  addOverrideButton: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    title: "SEO overrides",
    description:
      "Per-page overrides for title, description, OG image, and canonical URL. Empty fields keep the page's built-in defaults.",
    loading: "Loading...",
    notSuperadmin: "Only superadmins can edit SEO overrides.",
    existingHeader: "Existing",
    refreshing: "Refreshing...",
    refresh: "Refresh",
    loadFailed: (status) => `Failed to load SEO overrides (${status})`,
    loadFailedShort: "Failed to load SEO overrides",
    empty:
      "No per-page overrides yet. Add one below to override the default title / description / OG image emitted by the page.",
    noTitleOverride: "(no title override)",
    titleLabel: "Title (leave empty to keep page default)",
    descriptionLabel: "Description",
    ogImageLabel: "OG image URL",
    canonicalLabel: "Canonical URL",
    failedSave: "Failed to save",
    saveFailed: "Failed to save",
    saved: "Saved. Live within 60s.",
    failedDelete: "Failed to delete",
    failedCreate: "Failed to create",
    confirmDelete: (path, l) => `Delete SEO override for ${path} (${l})?`,
    delete: "Delete",
    saving: "Saving...",
    save: "Save",
    addOverrideTitle: "Add an override",
    addOverrideDescription:
      "Path is the URL pathname (e.g. /about). Empty fields keep the page's built-in defaults.",
    titlePlaceholder: (max) => `Title (max ${max} chars)`,
    descriptionPlaceholder: (max) => `Description (max ${max} chars)`,
    ogImagePlaceholder: "OG image URL",
    canonicalPlaceholder: "Canonical URL (optional)",
    adding: "Adding...",
    addOverrideButton: "Add override",
  },
  pt: {
    title: "Overrides de SEO",
    description:
      "Overrides por página para title, description, imagem OG e URL canônica. Campos vazios mantêm os valores padrão da página.",
    loading: "Carregando...",
    notSuperadmin: "Apenas superadministradores podem editar os overrides de SEO.",
    existingHeader: "Existentes",
    refreshing: "Atualizando...",
    refresh: "Atualizar",
    loadFailed: (status) => `Não foi possível carregar os overrides de SEO (${status})`,
    loadFailedShort: "Não foi possível carregar os overrides de SEO",
    empty:
      "Ainda não há overrides por página. Adicione um abaixo para substituir o title / description / imagem OG padrão da página.",
    noTitleOverride: "(sem override de title)",
    titleLabel: "Title (deixe vazio para manter o valor padrão)",
    descriptionLabel: "Description",
    ogImageLabel: "URL da imagem OG",
    canonicalLabel: "URL canônica",
    failedSave: "Não foi possível salvar",
    saveFailed: "Não foi possível salvar",
    saved: "Salvo. Ativo em menos de 60 s.",
    failedDelete: "Não foi possível excluir",
    failedCreate: "Não foi possível criar",
    confirmDelete: (path, l) => `Excluir o override de SEO de ${path} (${l})?`,
    delete: "Excluir",
    saving: "Salvando...",
    save: "Salvar",
    addOverrideTitle: "Adicionar um override",
    addOverrideDescription:
      "Path é o caminho do URL (ex.: /about). Campos vazios mantêm os valores padrão da página.",
    titlePlaceholder: (max) => `Title (máx. ${max} caracteres)`,
    descriptionPlaceholder: (max) => `Description (máx. ${max} caracteres)`,
    ogImagePlaceholder: "URL da imagem OG",
    canonicalPlaceholder: "URL canônica (opcional)",
    adding: "Adicionando...",
    addOverrideButton: "Adicionar override",
  },
  es: {
    title: "Overrides SEO",
    description:
      "Overrides por página para title, description, imagen OG y URL canónica. Los campos vacíos conservan los valores predeterminados de la página.",
    loading: "Cargando...",
    notSuperadmin: "Solo los superadministradores pueden editar los overrides SEO.",
    existingHeader: "Existentes",
    refreshing: "Actualizando...",
    refresh: "Actualizar",
    loadFailed: (status) => `No se pudieron cargar los overrides SEO (${status})`,
    loadFailedShort: "No se pudieron cargar los overrides SEO",
    empty:
      "Aún no hay overrides por página. Añada uno abajo para sustituir el title / description / imagen OG por defecto de la página.",
    noTitleOverride: "(sin override de title)",
    titleLabel: "Title (déjelo vacío para conservar el valor por defecto)",
    descriptionLabel: "Description",
    ogImageLabel: "URL de la imagen OG",
    canonicalLabel: "URL canónica",
    failedSave: "No se pudo guardar",
    saveFailed: "No se pudo guardar",
    saved: "Guardado. Activo en menos de 60 s.",
    failedDelete: "No se pudo eliminar",
    failedCreate: "No se pudo crear",
    confirmDelete: (path, l) => `¿Eliminar el override SEO de ${path} (${l})?`,
    delete: "Eliminar",
    saving: "Guardando...",
    save: "Guardar",
    addOverrideTitle: "Añadir un override",
    addOverrideDescription:
      "Path es la ruta del URL (p. ej. /about). Los campos vacíos conservan los valores predeterminados de la página.",
    titlePlaceholder: (max) => `Title (máx. ${max} caracteres)`,
    descriptionPlaceholder: (max) => `Description (máx. ${max} caracteres)`,
    ogImagePlaceholder: "URL de la imagen OG",
    canonicalPlaceholder: "URL canónica (opcional)",
    adding: "Añadiendo...",
    addOverrideButton: "Añadir override",
  },
};

// SEO overrides sub-route at
// /dashboard/admin/integrations/seo. Lifts the "Admin · SEO overrides"
// section out of admin-panel.tsx (lines ~1519-1727) into its own
// deep-linkable surface. Reuses /api/admin/seo GET/POST and
// /api/admin/seo/[id] PUT/DELETE — both already superadmin-gated.
// Non-superadmin users see a permission notice instead of the form.
// Uses native dark-palette tokens (matches the users + site-settings
// migrations from earlier ticks) rather than the shadcn primitives the
// legacy section uses, so the surface is consistent inside the new
// admin shell. SettingsPanel still renders its own copy until the
// removal sweep ships.

interface SeoRow {
  id: number;
  path: string;
  locale: string;
  title: string | null;
  description: string | null;
  ogImage: string | null;
  canonical: string | null;
}

interface NewSeoDraft {
  path: string;
  locale: "en" | "pt" | "es";
  title: string;
  description: string;
  ogImage: string;
  canonical: string;
}

interface MeResponse {
  user?: { role: string } | null;
}

const EMPTY_NEW_SEO: NewSeoDraft = {
  path: "",
  locale: "en",
  title: "",
  description: "",
  ogImage: "",
  canonical: "",
};

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 320;
const URL_MAX = 512;

export default function AdminSeoOverridesPage() {
  const { locale } = useI18n();
  const t = COPY[locale];
  const [role, setRole] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [rows, setRows] = useState<SeoRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, SeoRow>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<{ id: number; text: string; ok: boolean } | null>(null);
  const [newSeo, setNewSeo] = useState<NewSeoDraft>(EMPTY_NEW_SEO);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? (r.json() as Promise<MeResponse>) : null))
      .then((data) => setRole(data?.user?.role ?? null))
      .catch(() => setRole(null))
      .finally(() => setRoleLoaded(true));
  }, []);

  const isSuperadmin = role === "superadmin";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/seo");
      if (!res.ok) {
        setError(t.loadFailed(res.status));
        return;
      }
      const data = (await res.json()) as SeoRow[];
      setRows(data);
      const next: Record<number, SeoRow> = {};
      for (const r of data) next[r.id] = { ...r };
      setDrafts(next);
    } catch {
      setError(t.loadFailedShort);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperadmin) return;
    void load();
  }, [isSuperadmin]);

  const isDirty = (row: SeoRow): boolean => {
    const draft = drafts[row.id];
    if (!draft) return false;
    return (
      (draft.title ?? "") !== (row.title ?? "") ||
      (draft.description ?? "") !== (row.description ?? "") ||
      (draft.ogImage ?? "") !== (row.ogImage ?? "") ||
      (draft.canonical ?? "") !== (row.canonical ?? "")
    );
  };

  const setDraft = <K extends keyof SeoRow>(id: number, key: K, value: SeoRow[K]) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: value } }));
  };

  const save = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;
    setBusy(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/seo/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title ?? "",
          description: draft.description ?? "",
          ogImage: draft.ogImage ?? "",
          canonical: draft.canonical ?? "",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage({
          id,
          text: data.error ?? t.saveFailed,
          ok: false,
        });
        return;
      }
      setMessage({
        id,
        text: t.saved,
        ok: true,
      });
      await load();
    } finally {
      setBusy(null);
      setTimeout(() => setMessage((m) => (m && m.id === id ? null : m)), 4000);
    }
  };

  const remove = async (row: SeoRow) => {
    if (!confirm(t.confirmDelete(row.path, row.locale))) return;
    setBusy(row.id);
    try {
      const res = await fetch(`/api/admin/seo/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage({
          id: row.id,
          text: data.error ?? t.failedDelete,
          ok: false,
        });
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSeo),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setCreateError(data.error ?? t.failedCreate);
        return;
      }
      setNewSeo(EMPTY_NEW_SEO);
      await load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t.title} subtitle={t.description} />

      {!roleLoaded ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-faint">
          {t.loading}
        </div>
      ) : !isSuperadmin ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-muted">
          {t.notSuperadmin}
        </div>
      ) : (
        <>
          {/* Existing overrides list */}
          <div className="space-y-3 rounded-xl border border-border bg-surface-raised p-2">
            <div className="flex items-center justify-between px-3 pb-1 pt-2">
              <Eyebrow variant="section">
                {t.existingHeader}
                {rows.length > 0 && ` · ${rows.length}`}
              </Eyebrow>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="rounded-md px-2.5 py-1 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
              >
                {loading ? t.refreshing : t.refresh}
              </button>
            </div>

            {error && <p className="px-3 py-2 text-xs text-rose-300">{error}</p>}
            {!error && rows.length === 0 && !loading && (
              <p className="px-3 py-2 text-xs text-text-faint">
                {t.empty}
              </p>
            )}
            {rows.length > 0 && (
              <div className="space-y-2 px-1 pb-1">
                {rows.map((row) => {
                  const draft = drafts[row.id] ?? row;
                  const dirty = isDirty(row);
                  return (
                    <details
                      key={row.id}
                      className="rounded-lg border border-border/60 bg-surface p-3"
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 truncate font-mono text-xs text-text-secondary">
                          <span className="truncate">{row.path}</span>
                          <span className="inline-flex shrink-0 items-center rounded-md bg-surface-hover px-1.5 py-0.5 text-sm uppercase tracking-wide text-text-muted">
                            {row.locale}
                          </span>
                        </span>
                        <span className="truncate text-xs text-text-faint">
                          {row.title ?? (
                            <em>{t.noTitleOverride}</em>
                          )}
                        </span>
                      </summary>
                      <div className="mt-3 grid gap-2">
                        <label
                          className="text-xs text-text-faint"
                          htmlFor={`seo-title-${row.id}`}
                        >
                          {t.titleLabel}
                        </label>
                        <input
                          id={`seo-title-${row.id}`}
                          type="text"
                          value={draft.title ?? ""}
                          onChange={(e) => setDraft(row.id, "title", e.target.value || null)}
                          maxLength={TITLE_MAX}
                          className="h-9 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none transition-colors focus:border-text-primary focus:ring-1 focus:ring-text-primary/30"
                        />
                        <label
                          className="text-xs text-text-faint"
                          htmlFor={`seo-desc-${row.id}`}
                        >
                          {t.descriptionLabel}
                        </label>
                        <textarea
                          id={`seo-desc-${row.id}`}
                          value={draft.description ?? ""}
                          onChange={(e) =>
                            setDraft(row.id, "description", e.target.value || null)
                          }
                          maxLength={DESCRIPTION_MAX}
                          rows={2}
                          className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm text-text-primary outline-none transition-colors focus:border-text-primary focus:ring-1 focus:ring-text-primary/30"
                        />
                        <label
                          className="text-xs text-text-faint"
                          htmlFor={`seo-og-${row.id}`}
                        >
                          {t.ogImageLabel}
                        </label>
                        <input
                          id={`seo-og-${row.id}`}
                          type="text"
                          value={draft.ogImage ?? ""}
                          onChange={(e) => setDraft(row.id, "ogImage", e.target.value || null)}
                          maxLength={URL_MAX}
                          placeholder="https://propical.com.br/og/about.png"
                          className="h-9 rounded-md border border-border-strong bg-surface px-3 font-mono text-xs text-text-primary outline-none transition-colors focus:border-text-primary focus:ring-1 focus:ring-text-primary/30"
                        />
                        <label
                          className="text-xs text-text-faint"
                          htmlFor={`seo-canon-${row.id}`}
                        >
                          {t.canonicalLabel}
                        </label>
                        <input
                          id={`seo-canon-${row.id}`}
                          type="text"
                          value={draft.canonical ?? ""}
                          onChange={(e) =>
                            setDraft(row.id, "canonical", e.target.value || null)
                          }
                          maxLength={URL_MAX}
                          placeholder="/about or https://propical.com.br/about"
                          className="h-9 rounded-md border border-border-strong bg-surface px-3 font-mono text-xs text-text-primary outline-none transition-colors focus:border-text-primary focus:ring-1 focus:ring-text-primary/30"
                        />
                        <div className="mt-2 flex items-center justify-end gap-2">
                          {message?.id === row.id && (
                            <span
                              className={`text-xs ${
                                message.ok ? "text-emerald-300" : "text-rose-300"
                              }`}
                            >
                              {message.text}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => void remove(row)}
                            disabled={busy === row.id}
                            className="h-8 rounded-md px-3 text-xs text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-50"
                          >
                            {t.delete}
                          </button>
                          <button
                            type="button"
                            onClick={() => void save(row.id)}
                            disabled={!dirty || busy === row.id}
                            className="h-8 rounded-md bg-action-primary px-3 text-xs font-medium text-action-primary-fg transition-colors hover:bg-action-primary-hover disabled:opacity-50"
                          >
                            {busy === row.id ? t.saving : t.save}
                          </button>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add a new override */}
          <div className="rounded-xl border border-border bg-surface-raised p-5">
            <p className="mb-1 text-sm font-medium text-text-primary">
              {t.addOverrideTitle}
            </p>
            <p className="mb-4 text-xs text-text-faint">
              {t.addOverrideDescription}
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="text"
                value={newSeo.path}
                onChange={(e) => setNewSeo((s) => ({ ...s, path: e.target.value }))}
                placeholder="/about"
                className="h-9 rounded-md border border-border-strong bg-surface px-3 font-mono text-sm text-text-primary outline-none transition-colors focus:border-text-primary focus:ring-1 focus:ring-text-primary/30"
              />
              <select
                value={newSeo.locale}
                onChange={(e) =>
                  setNewSeo((s) => ({ ...s, locale: e.target.value as "en" | "pt" | "es" }))
                }
                className="h-9 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-text-primary focus:ring-1 focus:ring-text-primary/30"
              >
                <option value="en">en</option>
                <option value="pt">pt</option><option value="es">es</option>
              </select>
            </div>
            <div className="mt-3 grid gap-2">
              <input
                type="text"
                value={newSeo.title}
                onChange={(e) => setNewSeo((s) => ({ ...s, title: e.target.value }))}
                placeholder={t.titlePlaceholder(TITLE_MAX)}
                maxLength={TITLE_MAX}
                className="h-9 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-text-primary focus:ring-1 focus:ring-text-primary/30"
              />
              <textarea
                value={newSeo.description}
                onChange={(e) => setNewSeo((s) => ({ ...s, description: e.target.value }))}
                placeholder={t.descriptionPlaceholder(DESCRIPTION_MAX)}
                maxLength={DESCRIPTION_MAX}
                rows={2}
                className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-text-primary focus:ring-1 focus:ring-text-primary/30"
              />
              <input
                type="text"
                value={newSeo.ogImage}
                onChange={(e) => setNewSeo((s) => ({ ...s, ogImage: e.target.value }))}
                placeholder={t.ogImagePlaceholder}
                maxLength={URL_MAX}
                className="h-9 rounded-md border border-border-strong bg-surface px-3 font-mono text-xs text-text-primary outline-none focus:border-text-primary focus:ring-1 focus:ring-text-primary/30"
              />
              <input
                type="text"
                value={newSeo.canonical}
                onChange={(e) => setNewSeo((s) => ({ ...s, canonical: e.target.value }))}
                placeholder={t.canonicalPlaceholder}
                maxLength={URL_MAX}
                className="h-9 rounded-md border border-border-strong bg-surface px-3 font-mono text-xs text-text-primary outline-none focus:border-text-primary focus:ring-1 focus:ring-text-primary/30"
              />
            </div>
            <div className="mt-3 flex items-center justify-end gap-3">
              {createError && <span className="text-xs text-rose-300">{createError}</span>}
              <button
                type="button"
                onClick={() => void create()}
                disabled={creating || newSeo.path.trim().length === 0}
                className="h-9 rounded-md bg-action-primary px-4 text-sm font-medium text-action-primary-fg transition-colors hover:bg-action-primary-hover disabled:opacity-50"
              >
                {creating ? t.adding : t.addOverrideButton}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
