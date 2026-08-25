"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { eyebrowVariants } from "@/components/ui/atoms/eyebrow";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

// Account-level Cleaners pool admin sub-route at
// /dashboard/admin/workspace/cleaners. CRUD for the host's named cleaner
// profiles + a per-row summary of which properties each cleaner is
// assigned to (deep-link to the property's cleaning tab where assignment
// priority is reordered). Per-property assignment lives in the Cleaning
// sidebar of each property — this page is the cross-property pool.

interface AssignmentSummary {
  propertyId: number;
  propertyName: string;
  priority: number;
}

interface CleanerRow {
  id: number;
  name: string;
  phone: string | null;
  createdAt: string;
  assignments: AssignmentSummary[];
}

interface CopyShape {
  failed: string;
  deleteConfirm: string;
  defaultRank: string;
  backupRank: (rank: number) => string;
  title: string;
  subtitle: string;
  addCleaner: string;
  namePlaceholder: string;
  phoneOptionalPlaceholder: string;
  add: string;
  loading: string;
  empty: string;
  phonePlaceholder: string;
  cancel: string;
  save: string;
  notAssigned: string;
  edit: string;
  delete: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    failed: "Failed",
    deleteConfirm: "Delete this cleaner? All property assignments will be removed too.",
    defaultRank: "default",
    backupRank: (rank) => `backup ${rank}`,
    title: "Cleaners",
    subtitle: "Account-level cleaner pool. Assign to specific properties from each property's Cleaning tab.",
    addCleaner: "Add cleaner",
    namePlaceholder: "Name",
    phoneOptionalPlaceholder: "Phone (optional)",
    add: "Add",
    loading: "Loading…",
    empty: "No cleaners yet. Add your first above.",
    phonePlaceholder: "Phone",
    cancel: "Cancel",
    save: "Save",
    notAssigned: "Not assigned to any property",
    edit: "Edit",
    delete: "Delete",
  },
  pt: {
    failed: "Erro",
    deleteConfirm: "Excluir este profissional de limpeza? Todas as atribuições de propriedades também serão removidas.",
    defaultRank: "padrão",
    backupRank: (rank) => `reserva ${rank}`,
    title: "Profissionais de limpeza",
    subtitle: "Equipe de limpeza em nível de conta. Atribua a propriedades específicas na aba «Limpeza» de cada propriedade.",
    addCleaner: "Adicionar profissional de limpeza",
    namePlaceholder: "Nome",
    phoneOptionalPlaceholder: "Telefone (opcional)",
    add: "Adicionar",
    loading: "Carregando…",
    empty: "Nenhum profissional de limpeza ainda. Adicione o primeiro acima.",
    phonePlaceholder: "Telefone",
    cancel: "Cancelar",
    save: "Salvar",
    notAssigned: "Não atribuído a nenhuma propriedade",
    edit: "Editar",
    delete: "Excluir",
  },
  es: {
    failed: "Error",
    deleteConfirm: "¿Eliminar a este miembro del personal de limpieza? También se eliminarán todas sus asignaciones de alojamientos.",
    defaultRank: "principal",
    backupRank: (rank) => `suplente ${rank}`,
    title: "Personal de limpieza",
    subtitle: "Equipo de limpieza a nivel de cuenta. Asígnelo a alojamientos concretos desde la pestaña «Limpieza» de cada alojamiento.",
    addCleaner: "Añadir personal de limpieza",
    namePlaceholder: "Nombre",
    phoneOptionalPlaceholder: "Teléfono (opcional)",
    add: "Añadir",
    loading: "Cargando…",
    empty: "Aún no hay personal de limpieza. Añada el primero arriba.",
    phonePlaceholder: "Teléfono",
    cancel: "Cancelar",
    save: "Guardar",
    notAssigned: "Sin asignar a ningún alojamiento",
    edit: "Editar",
    delete: "Eliminar",
  },
};

export default function AdminCleanersPage() {
  const { locale } = useI18n();
  const t = COPY[locale];
  const [rows, setRows] = useState<CleanerRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Edit state — keyed by cleaner id
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const refresh = async () => {
    try {
      const res = await fetch("/api/cleaners?withAssignments=1");
      if (res.ok) {
        const data = (await res.json()) as CleanerRow[];
        setRows(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cleaners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, phone: phone.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || t.failed);
        return;
      }
      setName("");
      setPhone("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (r: CleanerRow) => {
    setEditingId(r.id);
    setEditName(r.name);
    setEditPhone(r.phone ?? "");
    setError(null);
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cleaners/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, phone: editPhone.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || t.failed);
        return;
      }
      setEditingId(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm(t.deleteConfirm)) return;
    setBusy(true);
    try {
      await fetch(`/api/cleaners/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const priorityLabel = (rank: number): string => {
    if (rank === 0) return t.defaultRank;
    return t.backupRank(rank);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      {/* Create */}
      <section className="rounded-xl border border-border bg-surface-raised p-4 space-y-3">
        <h3 className={eyebrowVariants({ variant: "section" })}>
          {t.addCleaner}
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            disabled={busy}
            className="h-9 flex-1 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-text-primary disabled:opacity-50"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t.phoneOptionalPlaceholder}
            disabled={busy}
            className="h-9 flex-1 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-text-primary disabled:opacity-50"
          />
          <button
            type="button"
            onClick={create}
            disabled={busy || !name.trim()}
            className="rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-action-primary-fg hover:bg-action-primary-hover disabled:opacity-50"
          >
            {t.add}
          </button>
        </div>
        {error && <p className="text-xs text-rose-500">{error}</p>}
      </section>

      {/* List */}
      <section className="rounded-xl border border-border bg-surface-raised">
        {!loaded ? (
          <div className="px-4 py-5 text-sm text-text-faint">
            {t.loading}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-5 text-sm text-text-faint">
            {t.empty}
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3">
                {editingId === r.id ? (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={busy}
                        className="h-9 flex-1 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-text-primary disabled:opacity-50"
                      />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder={t.phonePlaceholder}
                        disabled={busy}
                        className="h-9 flex-1 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-text-primary disabled:opacity-50"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={busy}
                        className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={busy || !editName.trim()}
                        className="rounded-md bg-action-primary px-3 py-1.5 text-xs font-medium text-action-primary-fg hover:bg-action-primary-hover disabled:opacity-50"
                      >
                        {t.save}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-text-primary">{r.name}</span>
                        {r.phone && (
                          <span className="text-xs text-text-faint">{r.phone}</span>
                        )}
                      </div>
                      {r.assignments.length === 0 ? (
                        <div className="mt-1 text-xs text-text-faint italic">
                          {t.notAssigned}
                        </div>
                      ) : (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {r.assignments.map((a) => (
                            <Link
                              key={`${r.id}-${a.propertyId}`}
                              href={`/dashboard?property=${a.propertyId}&view=cleaning`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2 py-0.5 text-sm text-text-secondary hover:bg-surface-hover"
                            >
                              <span>{a.propertyName}</span>
                              <span className="text-sm uppercase tracking-wide text-text-faint">
                                {priorityLabel(a.priority)}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        disabled={busy}
                        className="rounded-md border border-border-strong bg-surface px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                      >
                        {t.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        disabled={busy}
                        className="rounded-md border border-border-strong bg-surface px-2.5 py-1 text-xs text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        {t.delete}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
