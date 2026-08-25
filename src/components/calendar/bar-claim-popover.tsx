"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { eyebrowVariants } from "@/components/ui/atoms/eyebrow";
import { resolvePlatformMeta } from "@/lib/platform-meta";
import { toBcp47 } from "@/lib/i18n/locale-tags";
import type { Locale } from "@/lib/i18n/translations";

interface CopyShape {
  heading: string;
  body: string;
  guestNameLabel: string;
  guestNamePlaceholder: string;
  defaultGuestFallback: string;
  cancel: string;
  save: string;
  saving: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    heading: "Name this booking",
    body: "This booking came in from iCal. Give it a guest name so it shows up in your list.",
    guestNameLabel: "Guest name",
    guestNamePlaceholder: "Jane Doe",
    defaultGuestFallback: "Guest",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
  },
  pt: {
    heading: "Nomear esta reserva",
    body: "Esta reserva veio pelo iCal. Dê um nome de hóspede para que ela apareça na sua lista.",
    guestNameLabel: "Nome do hóspede",
    guestNamePlaceholder: "Maria Silva",
    defaultGuestFallback: "Hóspede",
    cancel: "Cancelar",
    save: "Salvar",
    saving: "Salvando…",
  },
  es: {
    heading: "Nombrar esta reserva",
    body: "Esta reserva entró por iCal. Asígnele un nombre de huésped para que aparezca en su lista.",
    guestNameLabel: "Nombre del huésped",
    guestNamePlaceholder: "Juan García",
    defaultGuestFallback: "Huésped",
    cancel: "Cancelar",
    save: "Guardar",
    saving: "Guardando…",
  },
};

export interface ClaimableBar {
  eventUid: string;
  startDate: string;
  endDate: string;
  platform: string;
  /** Existing iCal SUMMARY (e.g. "Reserved" / a Booking confirmation
   *  number). Used as the placeholder so the user knows what the feed
   *  currently calls this stay. */
  defaultName: string;
}

interface BarClaimPopoverProps {
  bar: ClaimableBar;
  anchorRect: DOMRect;
  onClose: () => void;
  onSave: (name: string) => Promise<{ ok: boolean; error?: string }>;
}

// Companion to DateActionsPopover for synced bookings that haven't been
// claimed yet (no Reservation row exists, just an iCal event). Lets the
// user attach a guest name without first having to click the empty cell
// area and use "Add reservation".
export function BarClaimPopover({ bar, anchorRect, onClose, onSave }: BarClaimPopoverProps) {
  const { t, locale } = useI18n();
  const c = COPY[locale];
  const popRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [onClose]);

  const popWidth = 300;
  const margin = 8;
  let left = anchorRect.left;
  if (left + popWidth + margin > window.innerWidth) {
    left = window.innerWidth - popWidth - margin;
  }
  if (left < margin) left = margin;
  let top = anchorRect.bottom + 6;
  if (top + 220 > window.innerHeight && anchorRect.top - 6 - 220 > 0) {
    top = anchorRect.top - 6 - 220;
  }

  const platformMeta = resolvePlatformMeta(bar.platform);
  const platformLabel = platformMeta.shortLabel;
  const platformColor = platformMeta.color;

  const formatRange = (a: string, b: string) => {
    const fmt = (s: string) =>
      new Date(s + "T12:00:00").toLocaleDateString(toBcp47(locale as Locale), {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    return `${fmt(a)} → ${fmt(b)}`;
  };

  const handleSave = async () => {
    const finalName = name.trim() || bar.defaultName || c.defaultGuestFallback;
    setError(null);
    setSaving(true);
    try {
      const result = await onSave(finalName);
      if (!result.ok) {
        setError(result.error || "Save failed");
      }
      // On success the parent calls onClose; on error we keep the
      // popover open so the host can correct the name and retry.
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      ref={popRef}
      className="editorial fixed z-[100] w-[300px] rounded-xl border border-border-strong bg-surface shadow-2xl shadow-black/30"
      style={{ top, left }}
    >
      <div className="border-b border-border px-4 py-3">
        <div className="text-eyebrow">
          {c.heading}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className="rounded-md px-2 py-0.5 text-sm font-semibold tracking-wide text-white"
            style={{ backgroundColor: platformColor }}
          >
            {platformLabel}
          </span>
          <span className="text-caption">{formatRange(bar.startDate, bar.endDate)}</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-caption leading-snug">
          {c.body}
        </p>
        <div>
          <label className={cn("block mb-1.5", eyebrowVariants({ variant: "section" }))}>
            {c.guestNameLabel}
          </label>
          <input
            ref={inputRef}
            data-testid="claim-guest-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={bar.defaultName || c.guestNamePlaceholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
            className="h-9 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-text-primary placeholder-text-faint outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary/20"
          />
          {error && (
            <p className="mt-1 text-sm font-medium text-rose-500" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2.5">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-50"
        >
          {t("common.cancel") || c.cancel}
        </button>
        <button
          data-testid="claim-save"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-action-primary px-3.5 py-1.5 text-sm font-medium text-action-primary-fg hover:bg-action-primary-hover transition-colors disabled:opacity-50"
        >
          {saving ? c.saving : c.save}
        </button>
      </div>
    </div>,
    document.body
  );
}
