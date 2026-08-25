"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";

interface Shortcut {
  keys: string[];
  description: Record<Locale, string>;
}

interface CopyShape {
  title: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: { title: "Keyboard shortcuts" },
  pt: { title: "Atalhos de teclado" },
  es: { title: "Atajos de teclado" },
};

const SHORTCUTS: Shortcut[] = [
  {
    keys: ["?"],
    description: {
      en: "Show this shortcut overlay",
      pt: "Mostrar esta sobreposição de atalhos",
      es: "Mostrar esta ayuda de atajos",
    },
  },
  {
    keys: ["←"],
    description: {
      en: "Previous month (calendar)",
      pt: "Mês anterior (calendário)",
      es: "Mes anterior (calendario)",
    },
  },
  {
    keys: ["→"],
    description: {
      en: "Next month (calendar)",
      pt: "Mês seguinte (calendário)",
      es: "Mes siguiente (calendario)",
    },
  },
  {
    keys: ["T"],
    description: { en: "Jump to today (calendar)", pt: "Ir para hoje (calendário)", es: "Ir a hoy (calendario)" },
  },
  {
    keys: ["E"],
    description: {
      en: "Toggle Edit Dates mode (calendar)",
      pt: "Ativar modo Editar datas (calendário)",
      es: "Activar el modo Editar fechas (calendario)",
    },
  },
  {
    keys: ["Esc"],
    description: { en: "Close overlay", pt: "Fechar sobreposição", es: "Cerrar ventana" },
  },
];

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (t.isContentEditable) return true;
  return false;
}

export function KeyboardShortcuts() {
  const { locale } = useI18n();
  const t = COPY[locale];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      if (isTypingTarget(e.target)) return;
      // Use Shift+/ which produces "?" on standard layouts.
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface-raised shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">
            {t.title}
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-text-faint hover:bg-border-strong hover:text-text-primary"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="divide-y divide-[#27272b]">
          {SHORTCUTS.map((s, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-text-secondary">{s.description[locale]}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md border border-border-strong bg-surface px-2 py-0.5 font-mono text-sm text-text-primary"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
