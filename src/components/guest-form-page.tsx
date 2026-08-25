"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GuestFormPrivacyPanel } from "@/components/guest-form-filler";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { eyebrowVariants } from "@/components/ui/atoms/eyebrow";
import type { Locale } from "@/lib/i18n/translations";
import {
  FIELD_TYPES,
  GUEST_FORM_BUILDER_COPY,
  SUGGESTED,
  TYPE_LABELS,
  WITH_OPTIONS,
  type FieldType,
  type SuggestedQuestion,
} from "@/lib/guest-form-builder-i18n";
import { GUEST_UI_COPY } from "@/lib/guest-form-i18n";

// Dedicated pre-arrival guest-form builder. Reached at
// /dashboard?property=<id>&view=guest-form — linked from Sync settings.
// Left: the field constructor. Right: a live preview of exactly what
// the guest sees when they open the share link.
//
// The form is Portuguese-only: the base (and only) language is pt,
// authored directly in the form name and field labels. There are no
// language tabs and no per-template translations.

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  helpText?: string;
  required: boolean;
  options?: string[];
}

function freshId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function newField(type: FieldType): FormField {
  const f: FormField = { id: freshId(), type, label: "", required: false };
  if (WITH_OPTIONS.has(type)) f.options = ["Opção 1", "Opção 2"];
  return f;
}

export function GuestFormPage({
  propertyId,
  propertyName,
}: {
  propertyId: number;
  propertyName: string;
}) {
  const { locale } = useI18n();
  const c = GUEST_FORM_BUILDER_COPY[locale];
  const [name, setName] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  // Auto-save status chip. The previous "Save form" button was easy to
  // miss — hosts hit the preview's Submit (which does nothing) and lost
  // their work. Edits now persist on their own ~600ms after the last
  // keystroke / toggle, with this chip as the visible receipt.
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dragId, setDragId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Last value the server confirmed. We compare current state against
  // this to decide whether there's anything to save, so a no-op edit
  // (toggle then untoggle) doesn't trigger a network round-trip.
  const lastSavedRef = useRef<{ name: string; fields: FormField[] } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/properties/${propertyId}/guest-form`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        const loadedName = data.template?.name ?? "";
        const loadedFields = Array.isArray(data.template?.fields)
          ? (data.template.fields as FormField[])
          : [];
        setName(loadedName);
        setFields(loadedFields);
        // Snapshot what the server already holds so the auto-save
        // effect doesn't fire on the initial load.
        lastSavedRef.current = {
          name: loadedName,
          fields: loadedFields,
        };
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  // Auto-save: ~600ms after the last edit, push the current name +
  // fields. Skipped while the initial load is in flight, and skipped
  // when nothing has actually changed against lastSavedRef.
  useEffect(() => {
    if (loading || !lastSavedRef.current) return;
    const last = lastSavedRef.current;
    const unchanged =
      last.name === name &&
      JSON.stringify(last.fields) === JSON.stringify(fields);
    if (unchanged) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/properties/${propertyId}/guest-form`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, fields }),
        });
        if (!res.ok) {
          setSaveState("error");
          return;
        }
        // Snapshot the values we just sent (not whatever fresh edits
        // the host has already made in the meantime) — the next render
        // pass will compare and trigger another save if needed.
        lastSavedRef.current = { name, fields };
        setSaveState("saved");
        setTimeout(
          () => setSaveState((s) => (s === "saved" ? "idle" : s)),
          1600,
        );
      } catch {
        setSaveState("error");
      }
    }, 600);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [name, fields, loading, propertyId]);

  const patchField = (id: string, patch: Partial<FormField>) =>
    setFields((arr) => arr.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const addField = (type: FieldType) => {
    setFields((arr) => [...arr, newField(type)]);
    setAddOpen(false);
  };

  const addSuggested = (s: SuggestedQuestion) => {
    const f: FormField = { id: freshId(), type: s.type, label: s.label, required: false };
    if (s.options) f.options = [...s.options];
    setFields((arr) => [...arr, f]);
  };

  const removeField = (id: string) =>
    setFields((arr) => arr.filter((f) => f.id !== id));

  const duplicateField = (id: string) =>
    setFields((arr) => {
      const idx = arr.findIndex((f) => f.id === id);
      if (idx < 0) return arr;
      const copy: FormField = { ...arr[idx], id: freshId() };
      if (copy.options) copy.options = [...copy.options];
      const out = arr.slice();
      out.splice(idx + 1, 0, copy);
      return out;
    });

  // Reorder: drop the dragged field directly before the target field.
  const reorder = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setFields((arr) => {
      const from = arr.findIndex((f) => f.id === sourceId);
      const to = arr.findIndex((f) => f.id === targetId);
      if (from < 0 || to < 0) return arr;
      const out = arr.slice();
      const [moved] = out.splice(from, 1);
      out.splice(out.findIndex((f) => f.id === targetId), 0, moved);
      return out;
    });
  };

  return (
    <div className="-mx-3 sm:-mx-6 lg:-mx-8">
      <div className="mx-auto max-w-[1760px] space-y-5 px-3 sm:px-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/dashboard?property=${propertyId}&view=sync`}
              className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              {c.backToSync}
            </Link>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-text-primary">
              {c.title}
            </h1>
            <p className="mt-0.5 text-caption">
              {c.subtitle(propertyName)}
            </p>
          </div>
          {/* Auto-save status chip. No manual button — every edit
              persists ~600ms after the host stops typing. The label
              also functions as a passive reassurance: hosts who used
              to look for a "Save" button find a "Saved" indicator
              instead and know the work is safe. */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              saveState === "saving"
                ? "bg-surface-raised text-text-muted"
                : saveState === "saved"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : saveState === "error"
                    ? "bg-rose-500/10 text-rose-500"
                    : "bg-surface-raised text-text-faint"
            }`}
            aria-live="polite"
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                saveState === "saving"
                  ? "animate-pulse bg-text-muted"
                  : saveState === "saved"
                    ? "bg-emerald-500"
                    : saveState === "error"
                      ? "bg-rose-500"
                      : "bg-emerald-500/60"
              }`}
            />
            {saveState === "saving"
              ? c.saving
              : saveState === "saved"
                ? c.saved
                : saveState === "error"
                  ? c.saveFailed
                  : c.autoSave}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-text-faint">{c.loading}</p>
        ) : (
          <>
            <div className="flex flex-col gap-6 lg:flex-row">
              {/* Builder */}
              <div className="min-w-0 space-y-4 lg:flex-1">
                <div className="rounded-xl border border-border bg-surface-raised p-4">
                  <label className="block text-sm font-medium text-text-muted">
                    {c.formTitle}
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={c.formTitlePlaceholder}
                    className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-text-primary outline-none focus:border-text-primary"
                  />
                </div>

                {/* Suggested questions — one-tap presets with the right
                    field type. An already-added one (matched by label)
                    shows a check and is disabled. */}
                <div className="rounded-xl border border-border bg-surface-raised p-4">
                  <h3 className="text-eyebrow">
                    {c.suggestedTitle}
                  </h3>
                    <p className="mt-0.5 text-caption">
                    {c.suggestedBody}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {SUGGESTED.map((s) => {
                      const added = fields.some(
                        (f) => f.label.trim().toLowerCase() === s.label.toLowerCase(),
                      );
                      return (
                        <button
                          key={s.label}
                          type="button"
                          disabled={added}
                          onClick={() => addSuggested(s)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            added
                              ? "cursor-default border-border text-text-faint"
                              : "border-border-strong text-text-secondary hover:border-action-primary hover:text-text-primary"
                          }`}
                        >
                          {added ? "✓ " : "+ "}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {fields.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center">
                    <p className="text-sm text-text-muted">{c.emptyTitle}</p>
                  <p className="mt-0.5 text-caption">
                      {c.emptyBody}
                    </p>
                  </div>
                )}

                {fields.map((f, i) => (
                  <div
                    key={f.id}
                    onDragOver={(e) => {
                      if (dragId) e.preventDefault();
                    }}
                    onDrop={() => {
                      if (dragId) reorder(dragId, f.id);
                      setDragId(null);
                    }}
                    className={`rounded-xl border bg-surface-raised p-4 transition-colors ${
                      dragId === f.id
                        ? "border-action-primary opacity-50"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        draggable
                        onDragStart={() => setDragId(f.id)}
                        onDragEnd={() => setDragId(null)}
                        title={c.dragToReorder}
                        className="cursor-grab select-none rounded p-1 text-text-faint hover:bg-surface-hover hover:text-text-secondary active:cursor-grabbing"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                          <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                          <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
                        </svg>
                      </span>
                      <span className="rounded bg-surface-hover px-2 py-0.5 text-sm font-semibold uppercase tracking-wide text-text-muted">
                        {TYPE_LABELS[locale][f.type]}
                      </span>
                      <span className="text-sm text-text-faint">#{i + 1}</span>
                      <div className="ml-auto flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => duplicateField(f.id)}
                          aria-label={c.duplicateAria}
                          title={c.duplicate}
                          className="rounded p-1.5 text-text-faint hover:bg-surface-hover hover:text-text-secondary"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m11.25 4.125v3" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeField(f.id)}
                          aria-label={c.removeAria}
                          title={c.remove}
                          className="rounded p-1.5 text-text-faint hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <input
                      value={f.label}
                      onChange={(e) => patchField(f.id, { label: e.target.value })}
                      placeholder={c.questionLabelPlaceholder}
                      className="mt-3 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-text-primary"
                    />
                    <input
                      value={f.helpText ?? ""}
                      onChange={(e) => patchField(f.id, { helpText: e.target.value })}
                      placeholder={c.helpTextPlaceholder}
                      className="mt-2 w-full rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm text-text-secondary outline-none focus:border-text-primary"
                    />

                    {WITH_OPTIONS.has(f.type) && (
                      <div className="mt-2">
                        <label className="text-sm font-medium text-text-faint">
                          {c.optionsLabel}
                        </label>
                        <textarea
                          value={(f.options ?? []).join("\n")}
                          onChange={(e) =>
                            patchField(f.id, {
                              options: e.target.value.split("\n").map((s) => s.replace(/^\s+/, "")),
                            })
                          }
                          onBlur={(e) =>
                            patchField(f.id, {
                              options: e.target.value
                                .split("\n")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          rows={3}
                          className="mt-1 w-full rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-text-primary"
                        />
                      </div>
                    )}

                    <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 text-sm text-text-muted">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) => patchField(f.id, { required: e.target.checked })}
                        className="h-3.5 w-3.5 accent-action-primary"
                      />
                      {c.required}
                    </label>
                  </div>
                ))}

                {/* Add field */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAddOpen((v) => !v)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong py-3 text-sm font-medium text-text-muted transition-colors hover:border-action-primary hover:text-text-primary"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    {c.addQuestion}
                  </button>
                  {addOpen && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-surface-raised p-2 sm:grid-cols-3">
                      {FIELD_TYPES[locale].map((ft) => (
                        <button
                          key={ft.type}
                          type="button"
                          onClick={() => addField(ft.type)}
                          className="rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-action-primary hover:bg-surface-hover"
                        >
                          <span className="block text-sm font-medium text-text-primary">
                            {ft.label}
                          </span>
                          <span className="block text-sm text-text-faint">
                            {ft.hint}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Live preview — always shows the form in Portuguese,
                  so the host previews the exact result a guest sees
                  when they open the share link. */}
              <aside className="w-full lg:w-[440px] lg:shrink-0">
                <div className="lg:sticky lg:top-3">
                  <p className={cn("mb-2", eyebrowVariants({ variant: "section" }))}>
                    {c.previewLabel}
                  </p>
                  <FormPreview
                    name={name}
                    fields={fields}
                    propertyName={propertyName}
                  />
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Renders the form the way the guest sees it on the public share page
// (the dark, standalone /g/<token> screen) so the host previews the
// real result while editing. The form is Portuguese-only, so the
// preview renders the host's pt content directly.
function FormPreview({
  name,
  fields,
  propertyName,
}: {
  name: string;
  fields: FormField[];
  propertyName: string;
}) {
  const inputCls =
    "mt-1.5 w-full rounded-md border border-[#1e2329] bg-[#161b22] px-3 py-2 text-sm text-[#e8e8ec]";
  const copy = GUEST_UI_COPY;
  const { locale } = useI18n();
  const c = GUEST_FORM_BUILDER_COPY[locale];
  const title = name || copy.titleFallback;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="bg-[#0d1117] px-5 py-6">
        <p className="text-sm uppercase tracking-wider text-[#a0a0a8]">
          {propertyName}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#e8e8ec]">
          {title || copy.titleFallback}
        </h2>
        <p className="mt-1 text-sm text-[#a0a0a8]">{copy.intro}</p>

        {/* Same privacy panel the guest sees on /g/<token>, rendered
            here so the host can verify what's surfaced to their guests
            before they share the link. */}
        <div className="mt-5">
          <GuestFormPrivacyPanel copy={copy.privacy} />
        </div>

        <div className="mt-5 space-y-4">
          {fields.length === 0 && (
            <p className="rounded-md border border-dashed border-[#1e2329] px-3 py-6 text-center text-sm text-[#6b7280]">
              {c.previewEmpty}
            </p>
          )}
          {fields.map((f) => {
            return (
              <div key={f.id}>
                <span className="block text-sm font-medium text-[#e8e8ec]">
                  {f.label || c.untitledQuestionLabel}
                  {f.required && <span className="ml-1 text-[#ff385c]">*</span>}
                </span>
                {f.helpText && (
                  <span className="mt-0.5 block text-sm text-[#a0a0a8]">
                    {f.helpText}
                  </span>
                )}
                {f.type === "long-text" ? (
                  <textarea rows={3} disabled className={inputCls} />
                ) : f.type === "yes-no" ? (
                  <div className="mt-1.5 flex gap-2">
                    {[copy.yes, copy.no].map((o) => (
                      <span
                        key={o}
                        className="flex-1 rounded-md border border-[#1e2329] bg-[#161b22] px-3 py-2 text-center text-sm text-[#e8e8ec]"
                      >
                        {o}
                      </span>
                    ))}
                  </div>
                ) : f.type === "select" ? (
                  <select disabled className={inputCls}>
                    <option>{copy.selectPlaceholder}</option>
                    {(f.options ?? []).map((o, i) => (
                      <option key={i}>{o}</option>
                    ))}
                  </select>
                ) : f.type === "multi-select" ? (
                  <div className="mt-1.5 space-y-1.5">
                    {(f.options ?? []).length === 0 && (
                      <span className="text-sm text-[#6b7280]">{c.noOptionsYet}</span>
                    )}
                    {(f.options ?? []).map((o, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-2 rounded-md border border-[#1e2329] bg-[#161b22] px-3 py-1.5 text-sm text-[#e8e8ec]"
                      >
                        <span className="h-3.5 w-3.5 rounded-sm border border-[#3a3f47]" />
                        {o}
                      </span>
                    ))}
                  </div>
                ) : (
                  <input
                    type={
                      f.type === "number"
                        ? "number"
                        : f.type === "date"
                          ? "date"
                          : f.type === "time"
                            ? "time"
                            : f.type === "email"
                              ? "email"
                              : f.type === "phone"
                                ? "tel"
                                : "text"
                    }
                    disabled
                    className={inputCls}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Preview Submit — visibly disabled so hosts don't click it
            expecting to save their work (the form auto-saves on edit;
            this button only exists in the rendered preview). */}
        <div className="mt-6 select-none rounded-md bg-[#ff385c]/40 px-4 py-2.5 text-center text-sm font-medium text-white/70">
          {copy.submit} <span className="text-sm uppercase tracking-wide text-white/60">{c.previewOnly}</span>
        </div>
      </div>
    </div>
  );
}
