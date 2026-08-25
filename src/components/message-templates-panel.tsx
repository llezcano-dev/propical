"use client";

import { useEffect, useState } from "react";
import { SettingsCard } from "@/components/settings-card";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { eyebrowVariants } from "@/components/ui/atoms/eyebrow";
import type { Locale } from "@/lib/i18n/translations";
import {
  SAMPLE_VARS,
  VAR_HINTS,
  languageName,
} from "@/lib/message-template-i18n";

interface CopyShape {
  nameAndBodyRequired: string;
  confirmDelete: string;
  title: string;
  newTemplate: string;
  namePlaceholder: string;
  subjectPlaceholder: string;
  bodyPlaceholder: string;
  variables: string;
  preview: string;
  cancel: string;
  save: string;
  empty: string;
  edit: string;
  remove: string;
  languageName: (code: string) => string;
  varHints: { token: string; desc: string }[];
  sampleVars: Record<string, string>;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    nameAndBodyRequired: "Name and body are required",
    confirmDelete: "Delete this template?",
    title: "Message templates",
    newTemplate: "New template",
    namePlaceholder: "Template name",
    subjectPlaceholder: "Subject (optional)",
    bodyPlaceholder: "Message body",
    variables: "Variables:",
    preview: "Preview",
    cancel: "Cancel",
    save: "Save",
    empty: "No templates yet.",
    edit: "Edit",
    remove: "Delete",
    languageName,
    varHints: VAR_HINTS.en,
    sampleVars: SAMPLE_VARS.en,
  },
  pt: {
    nameAndBodyRequired: "O nome e o corpo são obrigatórios",
    confirmDelete: "Excluir este modelo?",
    title: "Modelos de mensagens",
    newTemplate: "Novo modelo",
    namePlaceholder: "Nome do modelo",
    subjectPlaceholder: "Assunto (opcional)",
    bodyPlaceholder: "Corpo da mensagem",
    variables: "Variáveis:",
    preview: "Pré-visualização",
    cancel: "Cancelar",
    save: "Salvar",
    empty: "Ainda não há modelos.",
    edit: "Editar",
    remove: "Excluir",
    languageName,
    varHints: VAR_HINTS.pt,
    sampleVars: SAMPLE_VARS.pt,
  },
  es: {
    nameAndBodyRequired: "El nombre y el cuerpo son obligatorios",
    confirmDelete: "¿Eliminar esta plantilla?",
    title: "Plantillas de mensajes",
    newTemplate: "Nueva plantilla",
    namePlaceholder: "Nombre de la plantilla",
    subjectPlaceholder: "Asunto (opcional)",
    bodyPlaceholder: "Cuerpo del mensaje",
    variables: "Variables:",
    preview: "Vista previa",
    cancel: "Cancelar",
    save: "Guardar",
    empty: "Aún no hay plantillas.",
    edit: "Editar",
    remove: "Eliminar",
    languageName,
    varHints: VAR_HINTS.es,
    sampleVars: SAMPLE_VARS.es,
  },
};

interface MessageTemplate {
  id: number;
  propertyId: number;
  name: string;
  language: string;
  subject: string;
  body: string;
}

interface MessageTemplatesPanelProps {
  propertyId: number;
}

function renderTemplate(input: string, vars: Record<string, string>): string {
  return input.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : `{{${k}}}`
  );
}

export function MessageTemplatesPanel({ propertyId }: MessageTemplatesPanelProps) {
  const { locale } = useI18n();
  const c = COPY[locale];
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<string>(locale);
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch(`/api/message-templates?propertyId=${propertyId}`);
    if (!res.ok) return;
    const data = await res.json();
    setTemplates((data.templates || []) as MessageTemplate[]);
  };

  useEffect(() => {
    refresh();
  }, [propertyId]);

  const startCreate = () => {
    setEditingId("new");
    setName("");
    setLanguage(locale);
    setSubject("");
    setBodyText("");
    setError(null);
  };

  const startEdit = (t: MessageTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setLanguage(t.language);
    setSubject(t.subject);
    setBodyText(t.body);
    setError(null);
  };

  const cancel = () => {
    setEditingId(null);
    setError(null);
  };

  const save = async () => {
    if (!name.trim() || !bodyText.trim()) {
      setError(c.nameAndBodyRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        propertyId,
        name: name.trim(),
        language,
        subject,
        body: bodyText,
      };
      if (editingId === "new") {
        const res = await fetch("/api/message-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error || "Failed");
          return;
        }
      } else if (typeof editingId === "number") {
        const res = await fetch(`/api/message-templates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error || "Failed");
          return;
        }
      }
      setEditingId(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm(c.confirmDelete)) return;
    await fetch(`/api/message-templates/${id}`, { method: "DELETE" });
    await refresh();
  };

  const insertVar = (v: string) => {
    setBodyText((prev) => prev + (prev.endsWith("\n") || prev === "" ? "" : " ") + v);
  };

  return (
    <SettingsCard
      title={c.title}
      action={
        editingId === null ? (
          <button
            onClick={startCreate}
            className="rounded-md border border-border-strong px-2.5 py-1 text-sm text-text-primary hover:bg-border-strong"
          >
            {c.newTemplate}
          </button>
        ) : undefined
      }
    >

      {editingId !== null && (
        <div className="mb-4 space-y-2 rounded-md border border-border-strong bg-surface p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={c.namePlaceholder}
            className="h-9 w-full rounded-md border border-border-strong bg-surface-raised px-2 text-sm text-text-primary outline-none focus:border-text-primary"
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={c.subjectPlaceholder}
            className="h-9 w-full rounded-md border border-border-strong bg-surface-raised px-2 text-sm text-text-primary outline-none focus:border-text-primary"
          />
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder={c.bodyPlaceholder}
            rows={5}
            className="w-full rounded-md border border-border-strong bg-surface-raised px-2 py-1.5 text-sm text-text-primary outline-none focus:border-text-primary"
          />
          <div className="flex flex-wrap gap-1.5 text-sm">
            <span className="text-text-faint">
              {c.variables}
            </span>
            {c.varHints.map((v) => (
              <button
                key={v.token}
                title={v.desc}
                onClick={() => insertVar(v.token)}
                className="rounded bg-border-strong px-1.5 py-0.5 font-mono text-text-muted hover:bg-border-strong hover:text-text-primary"
              >
                {v.token}
              </button>
            ))}
          </div>
          {bodyText && (
            <div className="rounded-md border border-border bg-surface p-2 text-sm">
              <div className={cn("mb-1", eyebrowVariants({ variant: "tag" }))}>
                {c.preview}
              </div>
              {subject && (
                <div className="mb-1 font-semibold text-text-primary">
                  {renderTemplate(subject, c.sampleVars)}
                </div>
              )}
              <pre className="whitespace-pre-wrap font-sans text-text-secondary">
                {renderTemplate(bodyText, c.sampleVars)}
              </pre>
            </div>
          )}

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={cancel}
              disabled={busy}
              className="rounded-md px-2 py-1 text-sm text-text-muted hover:text-text-primary"
            >
              {c.cancel}
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="rounded-md bg-action-primary px-3 py-1 text-sm font-medium text-action-primary-fg hover:bg-action-primary-hover disabled:opacity-50"
            >
              {c.save}
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <p className="text-caption">
          {c.empty}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-text-primary">
                  {t.name}
                  <span className="ml-2 rounded bg-border-strong px-1.5 py-0.5 text-sm uppercase text-text-muted">
                    {c.languageName(t.language)}
                  </span>
                </div>
                <div className="truncate text-sm text-text-faint">{t.subject || t.body.slice(0, 80)}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => startEdit(t)}
                  className="rounded px-2 py-1 text-text-muted hover:text-text-primary"
                >
                  {c.edit}
                </button>
                <button
                  onClick={() => remove(t.id)}
                  className="rounded px-2 py-1 text-rose-500 hover:bg-rose-500/10"
                >
                  {c.remove}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}
