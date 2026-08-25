"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { eyebrowVariants } from "@/components/ui/atoms/eyebrow";
import type { Locale } from "@/lib/i18n/translations";

interface CopyShape {
  default: string;
  firstBackup: string;
  secondBackup: string;
  nthBackup: (rank: number) => string;
  failed: string;
  cleaners: string;
  add: string;
  emptyState: string;
  moveUp: string;
  moveDown: string;
  remove: string;
  poolEmpty: string;
  pickFromPool: string;
  createNew: string;
  cancel: string;
  addBtn: string;
  namePlaceholder: string;
  phonePlaceholder: string;
  back: string;
  createAndAdd: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    default: "Default",
    firstBackup: "1st backup",
    secondBackup: "2nd backup",
    nthBackup: (rank) => `${rank}th backup`,
    failed: "Failed",
    cleaners: "Cleaners",
    add: "+ Add",
    emptyState: "No one assigned. Add a default and optional backups.",
    moveUp: "Move up",
    moveDown: "Move down",
    remove: "Remove",
    poolEmpty: "All pool cleaners already assigned",
    pickFromPool: "Pick from your pool…",
    createNew: "+ Create new",
    cancel: "Cancel",
    addBtn: "Add",
    namePlaceholder: "Name",
    phonePlaceholder: "Phone (optional)",
    back: "Back",
    createAndAdd: "Create & add",
  },
  pt: {
    default: "Principal",
    firstBackup: "1.º substituto",
    secondBackup: "2.º substituto",
    nthBackup: (rank) => `${rank}.º substituto`,
    failed: "Erro",
    cleaners: "Profissionais de limpeza",
    add: "+ Adicionar",
    emptyState: "Ninguém atribuído. Adicione um principal e, se quiser, substitutos.",
    moveUp: "Subir",
    moveDown: "Descer",
    remove: "Remover",
    poolEmpty: "Todo o pessoal do pool já está atribuído",
    pickFromPool: "Selecionar do pool…",
    createNew: "+ Criar novo",
    cancel: "Cancelar",
    addBtn: "Adicionar",
    namePlaceholder: "Nome",
    phonePlaceholder: "Telefone (opcional)",
    back: "Voltar",
    createAndAdd: "Criar e adicionar",
  },
  es: {
    default: "Principal",
    firstBackup: "1.º suplente",
    secondBackup: "2.º suplente",
    nthBackup: (rank) => `${rank}.º suplente`,
    failed: "Error",
    cleaners: "Personal de limpieza",
    add: "+ Añadir",
    emptyState: "Nadie asignado. Añada un principal y, si quiere, suplentes.",
    moveUp: "Subir",
    moveDown: "Bajar",
    remove: "Quitar",
    poolEmpty: "Todo el personal del pool ya está asignado",
    pickFromPool: "Seleccionar del pool…",
    createNew: "+ Crear nuevo",
    cancel: "Cancelar",
    addBtn: "Añadir",
    namePlaceholder: "Nombre",
    phonePlaceholder: "Teléfono (opcional)",
    back: "Atrás",
    createAndAdd: "Crear y añadir",
  },
};

// per-property Cleaners assignment panel rendered in the
// PropertyCleaningView sidebar. Pulls from the account-level Cleaner pool
// (/api/cleaners) and the per-property assignments (/api/cleaner-
// assignments?propertyId=X). Lets the host:
//   - rank assigned cleaners (priority asc; 0 = default, 1 = first backup, …)
//   - reorder via ↑ / ↓ (PATCH /api/cleaner-assignments/[id] { priority })
//   - remove (DELETE)
//   - add from the pool, with an inline "Create new cleaner" form
//
// Cleaners are metadata — no login access, no User account.

interface Assignment {
  id: number;
  cleanerProfileId: number;
  cleanerName: string | null;
  cleanerPhone: string | null;
  priority: number;
}

interface Pool {
  id: number;
  name: string;
  phone: string | null;
}

interface CleanersPanelProps {
  propertyId: number;
}

export function CleanersPanel({ propertyId }: CleanersPanelProps) {
  const { locale } = useI18n();
  const c = COPY[locale];
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pool, setPool] = useState<Pool[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-form state
  const [showAdd, setShowAdd] = useState(false);
  const [pickedProfileId, setPickedProfileId] = useState<string>("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const refresh = async () => {
    try {
      const [aRes, pRes] = await Promise.all([
        fetch(`/api/cleaner-assignments?propertyId=${propertyId}`),
        fetch(`/api/cleaners`),
      ]);
      if (aRes.ok) setAssignments(await aRes.json());
      if (pRes.ok) setPool(await pRes.json());
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const assignedProfileIds = new Set(
    assignments.map((a) => a.cleanerProfileId).filter((id): id is number => id !== null),
  );
  const availablePool = pool.filter((p) => !assignedProfileIds.has(p.id));

  const nextPriority =
    assignments.length === 0
      ? 0
      : Math.max(...assignments.map((a) => a.priority)) + 1;

  const priorityLabel = (rank: number): string => {
    if (rank === 0) return c.default;
    if (rank === 1) return c.firstBackup;
    if (rank === 2) return c.secondBackup;
    return c.nthBackup(rank);
  };

  const addProfile = async (profileId: number) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cleaner-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          cleanerProfileId: profileId,
          priority: nextPriority,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || c.failed);
        return;
      }
      setShowAdd(false);
      setPickedProfileId("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleAddPicked = async () => {
    const idNum = Number.parseInt(pickedProfileId, 10);
    if (Number.isNaN(idNum)) return;
    await addProfile(idNum);
  };

  const handleCreateAndAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cleaners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: newPhone.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || c.failed);
        setBusy(false);
        return;
      }
      const profile = (await res.json()) as Pool;
      setNewName("");
      setNewPhone("");
      setCreatingNew(false);
      // addProfile will refresh and clear busy
      await addProfile(profile.id);
    } catch {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    try {
      await fetch(`/api/cleaner-assignments/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const setPriority = async (id: number, priority: number) => {
    setBusy(true);
    try {
      await fetch(`/api/cleaner-assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  // Swap by index in the priority-asc array. Two PATCH calls: a→b, b→a.
  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= assignments.length) return;
    const a = assignments[idx];
    const b = assignments[target];
    setBusy(true);
    try {
      await fetch(`/api/cleaner-assignments/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: b.priority }),
      });
      await fetch(`/api/cleaner-assignments/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: a.priority }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-border px-5 py-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className={eyebrowVariants({ variant: "section" })}>
          {c.cleaners}
        </div>
        {!showAdd && loaded && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            disabled={busy}
            className="text-sm text-action-primary-text hover:underline disabled:opacity-50"
          >
            {c.add}
          </button>
        )}
      </div>

      {!loaded ? (
        <div className="text-sm text-text-faint">…</div>
      ) : (
        <>
          {assignments.length === 0 ? (
            <p className="text-sm text-text-muted leading-relaxed">
              {c.emptyState}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {assignments.map((a, idx) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-2.5 py-1.5"
                >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                      <span className="truncate text-sm font-medium text-text-primary">
                        {a.cleanerName || "—"}
                      </span>
                      <span className="text-sm uppercase tracking-wide text-text-faint">
                        {priorityLabel(idx)}
                      </span>
                    </div>
                    {a.cleanerPhone && (
                      <div className="text-sm text-text-faint truncate">
                        {a.cleanerPhone}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      disabled={busy || idx === 0}
                      title={c.moveUp}
                      className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-surface-hover hover:text-text-primary disabled:opacity-30"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(idx, 1)}
                      disabled={busy || idx === assignments.length - 1}
                      title={c.moveDown}
                      className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-surface-hover hover:text-text-primary disabled:opacity-30"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      disabled={busy}
                      title={c.remove}
                      className="flex h-6 w-6 items-center justify-center rounded text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
              {/* Manual priority normalisation hint when ordering is uneven —
                  the priority field tolerates gaps but the UI sets new
                  priorities to N+1 which keeps it sane. */}
            </ul>
          )}

          {showAdd && (
            <div className="mt-3 rounded-md border border-border-strong bg-surface p-3 space-y-2">
              {!creatingNew ? (
                <>
                  <select
                    value={pickedProfileId}
                    onChange={(e) => setPickedProfileId(e.target.value)}
                    disabled={busy}
                    className="h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-text-primary outline-none focus:border-text-primary disabled:opacity-50"
                  >
                    <option value="">
                      {availablePool.length === 0 ? c.poolEmpty : c.pickFromPool}
                    </option>
                    {availablePool.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.phone ? ` · ${p.phone}` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setCreatingNew(true)}
                      disabled={busy}
                      className="text-sm text-action-primary-text hover:underline disabled:opacity-50"
                    >
                      {c.createNew}
                    </button>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAdd(false);
                          setPickedProfileId("");
                          setError(null);
                        }}
                        disabled={busy}
                        className="rounded-md border border-border-strong bg-surface-raised px-2.5 py-1 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                      >
                        {c.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddPicked}
                        disabled={busy || !pickedProfileId}
                        className="rounded-md bg-action-primary px-2.5 py-1 text-sm font-medium text-action-primary-fg hover:bg-action-primary-hover disabled:opacity-50"
                      >
                        {c.addBtn}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={c.namePlaceholder}
                    disabled={busy}
                    className="h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-text-primary outline-none focus:border-text-primary disabled:opacity-50"
                  />
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder={c.phonePlaceholder}
                    disabled={busy}
                    className="h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-text-primary outline-none focus:border-text-primary disabled:opacity-50"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingNew(false);
                        setNewName("");
                        setNewPhone("");
                      }}
                      disabled={busy}
                      className="rounded-md border border-border-strong bg-surface-raised px-2.5 py-1 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                    >
                      {c.back}
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateAndAdd}
                      disabled={busy || !newName.trim()}
                      className="rounded-md bg-action-primary px-2.5 py-1 text-sm font-medium text-action-primary-fg hover:bg-action-primary-hover disabled:opacity-50"
                    >
                      {c.createAndAdd}
                    </button>
                  </div>
                </>
              )}
              {error && <p className="text-sm text-rose-500">{error}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
