"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { OnboardingTooltip } from "@/components/onboarding-tooltip";
import { MessageTemplatesPanel } from "@/components/message-templates-panel";
import { PropertyManagersPanel } from "@/components/property-managers-panel";
import { PlatformInstructions } from "@/components/platform-instructions";
import { SettingsCard } from "@/components/settings-card";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { eyebrowVariants } from "@/components/ui/atoms/eyebrow";
import type { Locale, TranslationKey } from "@/lib/i18n/translations";
import type { CalendarLink, Property, SyncLogEntry } from "@/lib/types";
import { saveCalendarLinkAndSync } from "@/lib/calendar-link-sync";
import { renderSyncLogMessage } from "@/lib/sync-log-messages";
import { resolvePlatformMeta } from "@/lib/platform-meta";

interface CopyShape {
  save: string;
  cancel: string;
  rename: string;
  platformName: string;
  custom: string;
  remove: string;
  draftImportHint: string;
  addAnother: string;
  daysShort: (n: number) => string;
  nightsShort: (n: number) => string;
  monthsShort: string;
  feedTokenTitle: string;
  feedTokenDesc: string;
  feedTokenMore: string;
  guestFormTitle: string;
  guestFormDesc: string;
  feedTokenActiveNote: string;
  feedTokenPublicNote: string;
  makePublic: string;
  rotate: string;
  generateToken: string;
  dangerZone: string;
  dangerZoneDesc: string;
  confirmDelete: (name: string) => string;
  deleteProperty: string;
  dateLocale: string;
  hubNote: string;
  secCalendars: string;
  secStayRules: string;
  secAccess: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    save: "Save",
    cancel: "Cancel",
    rename: "Rename",
    platformName: "Platform name",
    custom: "custom",
    remove: "Remove",
    draftImportHint: "Name the platform first to get its import URL.",
    addAnother: "Add another platform",
    daysShort: (n) => (n !== 1 ? "days" : "day"),
    nightsShort: (n) => (n !== 1 ? "nights" : "night"),
    monthsShort: "mo",
    feedTokenTitle: "Feed access token",
    feedTokenDesc:
      "The feed URL lets external services that do not support iCal upload (e.g. price-management tools, channel managers, or your own scripts) read this property's combined calendar — every platform you've connected — in iCal format. Most hosts will not need this — leave the token blank to keep the feed public, or rotate the token to make the URL private.",
    feedTokenMore: "More…",
    guestFormTitle: "Pre-arrival guest form",
    guestFormDesc:
      "Build the questions guests answer before arrival — passport details, arrival time, anything you need.",
    feedTokenActiveNote:
      "Your feed URLs currently include a private token. Rotating invalidates the old URL — re-paste the new one wherever it's consumed.",
    feedTokenPublicNote:
      "Your feed URLs are currently public. Add a token to make them unguessable.",
    makePublic: "Make public",
    rotate: "Rotate",
    generateToken: "Generate token",
    dangerZone: "Danger zone",
    dangerZoneDesc:
      "Deleting this property removes all of its reservations, guests, passport documents, sync logs, and iCal links. This cannot be undone.",
    confirmDelete: (name) =>
      `Delete property "${name}"? This removes all reservations and related data. This cannot be undone.`,
    deleteProperty: "Delete property",
    dateLocale: "en-GB",
    secCalendars: "Calendars",
    secStayRules: "Stay rules",
    secAccess: "Access & sharing",
    hubNote:
      "Keep Propical as your only hub. Connect each platform here — and turn off any calendar links you set up directly between platforms (e.g. Airbnb → Booking). When every platform syncs only through Propical, each booking is counted once. If platforms also sync to each other, the same booking echoes around and can show up as a phantom double-booking.",
  },
  pt: {
    save: "Salvar",
    cancel: "Cancelar",
    rename: "Renomear",
    platformName: "Nome da plataforma",
    custom: "personalizada",
    remove: "Remover",
    draftImportHint: "Dê um nome à plataforma primeiro para obter sua URL de importação.",
    addAnother: "Adicionar outra plataforma",
    daysShort: (n) => (n !== 1 ? "dias" : "dia"),
    nightsShort: (n) => (n !== 1 ? "noites" : "noite"),
    monthsShort: "meses",
    feedTokenTitle: "Token de acesso ao feed",
    feedTokenDesc:
      "A URL do feed permite que serviços externos que não suportam upload de iCal (por exemplo, ferramentas de pricing, channel managers ou seus próprios scripts) leiam o calendário combinado desta propriedade — todas as plataformas conectadas — em formato iCal. A maioria dos anfitriões não precisa disso — deixe o token vazio para manter o feed público, ou rotacione o token para que a URL seja privada.",
    feedTokenMore: "Mais…",
    guestFormTitle: "Formulário de pré-chegada do hóspede",
    guestFormDesc:
      "Crie as perguntas que os hóspedes respondem antes de chegar — dados do passaporte, horário de chegada, o que você precisar.",
    feedTokenActiveNote:
      "Suas URLs de feed incluem atualmente um token privado. Ao rotacionar, a URL antiga é invalidada — cole novamente a nova onde ela é usada.",
    feedTokenPublicNote:
      "Suas URLs de feed são atualmente públicas. Adicione um token para que não possam ser adivinhadas.",
    makePublic: "Tornar público",
    rotate: "Rotacionar",
    generateToken: "Gerar token",
    dangerZone: "Zona de perigo",
    dangerZoneDesc:
      "Excluir esta propriedade apaga todas as suas reservas, hóspedes, documentos de passaporte, registros de sincronização e links iCal. A ação não pode ser desfeita.",
    confirmDelete: (name) =>
      `Excluir a propriedade «${name}»? Todas as reservas e dados relacionados serão apagados. A ação não pode ser desfeita.`,
    deleteProperty: "Excluir propriedade",
    dateLocale: "pt-BR",
    secCalendars: "Calendários",
    secStayRules: "Regras de estadia",
    secAccess: "Acesso e compartilhamento",
    hubNote:
      "Mantenha o Propical como seu único ponto central. Conecte cada plataforma aqui — e desative os links de calendário que você criou diretamente entre plataformas (p. ex. Airbnb → Booking). Quando todas as plataformas sincronizam apenas através do Propical, cada reserva é contada uma vez. Se as plataformas também sincronizam entre si, a mesma reserva fica em loop e pode aparecer como uma reserva dupla.",
  },
  es: {
    save: "Guardar",
    cancel: "Cancelar",
    rename: "Renombrar",
    platformName: "Nombre de la plataforma",
    custom: "personalizada",
    remove: "Quitar",
    draftImportHint: "Nombre primero la plataforma para obtener su URL de importación.",
    addAnother: "Añadir otra plataforma",
    daysShort: (n) => (n !== 1 ? "días" : "día"),
    nightsShort: (n) => (n !== 1 ? "noches" : "noche"),
    monthsShort: "meses",
    feedTokenTitle: "Token de acceso al feed",
    feedTokenDesc:
      "La URL del feed permite que servicios externos que no admiten subida de iCal (por ejemplo, herramientas de pricing, channel managers o sus propios scripts) lean el calendario combinado de este alojamiento — todas las plataformas conectadas — en formato iCal. La mayoría de los anfitriones no lo necesitan — deje el token vacío para mantener el feed público, o gire el token para que la URL sea privada.",
    feedTokenMore: "Más…",
    guestFormTitle: "Formulario de prellegada del huésped",
    guestFormDesc:
      "Cree las preguntas que los huéspedes responden antes de llegar — datos del pasaporte, hora de llegada, lo que necesite.",
    feedTokenActiveNote:
      "Sus URL de feed incluyen actualmente un token privado. Al rotarlo se invalida la URL anterior — vuelva a pegar la nueva donde la utilice.",
    feedTokenPublicNote:
      "Sus URL de feed son actualmente públicas. Añada un token para que no se puedan adivinar.",
    makePublic: "Hacer público",
    rotate: "Rotar",
    generateToken: "Generar token",
    dangerZone: "Zona peligrosa",
    dangerZoneDesc:
      "Eliminar este alojamiento borra todas sus reservas, huéspedes, documentos de pasaporte, registros de sincronización y enlaces iCal. La acción no se puede deshacer.",
    confirmDelete: (name) =>
      `¿Eliminar el alojamiento «${name}»? Se borrarán todas las reservas y datos relacionados. La acción no se puede deshacer.`,
    deleteProperty: "Eliminar alojamiento",
    dateLocale: "es-ES",
    secCalendars: "Calendarios",
    secStayRules: "Reglas de estancia",
    secAccess: "Acceso y uso compartido",
    hubNote:
      "Mantenga Propical como su único punto central. Conecte cada plataforma aquí — y desactive los enlaces de calendario que haya creado directamente entre plataformas (p. ej. Airbnb → Booking). Cuando todas las plataformas se sincronizan solo a través de Propical, cada reserva se cuenta una vez. Si las plataformas también se sincronizan entre sí, la misma reserva da vueltas en bucle y puede aparecer como una reserva doble.",
  },
};

interface TestResult {
  success: boolean;
  error?: string;
  futureEvents?: number;
  pastEvents?: number;
  totalEvents?: number;
  events?: { startDate: string; endDate: string; summary: string }[];
}

interface SyncSettingsProps {
  propertyId: number;
  propertyName: string;
  /** All properties the user can access — drives the
   *  PropertySwitcher pills above the property settings. Not required;
   *  the switcher hides itself when only one property exists. */
  properties?: Property[];
  minNights: number;
  checkInTime: string;
  checkOutTime: string;
  bookingWindow: number;
  ownerUserId: number;
  onUpdateProperty: (id: number, data: { name?: string; minNights?: number; checkInTime?: string; checkOutTime?: string; bookingWindow?: number }) => void;
  onDeleteProperty: (id: number) => void | Promise<void>;
}

export function SyncSettings({ propertyId, propertyName, properties, minNights, checkInTime, checkOutTime, bookingWindow, ownerUserId, onUpdateProperty, onDeleteProperty }: SyncSettingsProps) {
  const { t, locale } = useI18n();
  const c = COPY[locale];
  const [links, setLinks] = useState<CalendarLink[]>([]);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  // First-load gate. Without this the page renders the empty-state for
  // the first paint (links=[] before fetch), then snaps back when the
  // links arrive — visible CLS. We hold the conditional sections off
  // until the first fetchData resolves so the layout settles in one
  // step, not two.
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  // Rename + delete are scoped here so the entire property settings
  // page doesn't have to remount when the user toggles edit mode.
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Per-platform local URL input states. Replaces the hard-coded
  // airbnbUrl/bookingUrl pair so the UI can host every preset platform
  // (airbnb, booking, vrbo, …) plus any custom ones the user adds.
  // Hydrated from `links` on every fetchData.
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);

  // Custom platform rows the user has added but not yet saved. Stored as
  // a draft list (same shape as the onboarding wizard) so the user can
  // pick a name + URL before the row exists in `links`. Saving promotes
  // the row into a real CalendarLink and the draft entry is dropped.
  const [customDrafts, setCustomDrafts] = useState<Array<{
    rowId: string;
    platform: string;
    displayName: string;
    color: string;
  }>>([]);

  // Per-platform save errors (B7). The old code swallowed a failed POST
  // silently and the draft save button dropped the draft row even when the
  // link was never persisted — so a new feed card vanished with no
  // feedback. Now a failure keeps the card and surfaces the error inline.
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  // Public feed token (null = public feed; non-null = ?token=… required)
  const [feedToken, setFeedToken] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  // Mobile-only collapse state for the always-on configuration cards
  // (buffer days, min nights, check-in/out times, booking window). They
  // dominate the scroll on a 375px screen but get set once and forgotten.
  // SSR renders them open; on mount we collapse them on <sm only.
  const [advancedOpen, setAdvancedOpen] = useState({
    buffer: true,
    minNights: true,
    times: true,
    window: true,
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 639px)").matches) {
      setAdvancedOpen({ buffer: false, minNights: false, times: false, window: false });
    }
  }, []);
  const toggleAdvanced = (key: keyof typeof advancedOpen) =>
    setAdvancedOpen((s) => ({ ...s, [key]: !s[key] }));

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  const fetchData = async () => {
    const [linksRes, syncRes, tokenRes] = await Promise.all([
      fetch(`/api/calendar/links?propertyId=${propertyId}`),
      fetch(`/api/calendar/sync?propertyId=${propertyId}&limit=50`),
      fetch(`/api/properties/${propertyId}/rotate-feed-token`),
    ]);
    if (linksRes.ok) {
      const data: CalendarLink[] = await linksRes.json();
      setLinks(data);
      // Populate URL inputs from EVERY existing link, not just airbnb/booking.
      // The user might have a Vrbo or custom-platform link from the
      // onboarding wizard that wouldn't otherwise hydrate.
      setUrlInputs((prev) => {
        const next = { ...prev };
        for (const l of data) next[l.platform] = l.icalExportUrl;
        return next;
      });
    }
    if (syncRes.ok) {
      const data = await syncRes.json();
      setLogs(data.logs || []);
    }
    if (tokenRes.ok) {
      const data = await tokenRes.json();
      setFeedToken(typeof data.feedToken === "string" ? data.feedToken : null);
    }
    setLoading(false);
  };

  const handleRotateToken = async () => {
    setRotating(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/rotate-feed-token`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.feedToken === "string") setFeedToken(data.feedToken);
      }
    } finally {
      setRotating(false);
    }
  };

  const handleClearToken = async () => {
    setRotating(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/rotate-feed-token`, { method: "DELETE" });
      if (res.ok) setFeedToken(null);
    } finally {
      setRotating(false);
    }
  };

  const getLink = (platform: string) => links.find((l) => l.platform === platform);

  const handleSave = async (platform: string, url: string): Promise<boolean> => {
    if (!url.trim()) return false;
    const link = getLink(platform);
    const result = await saveCalendarLinkAndSync({
      propertyId,
      platform,
      icalExportUrl: url.trim(),
      bufferBefore: link?.bufferBefore ?? 0,
      bufferAfter: link?.bufferAfter ?? 0,
    });
    if (!result.ok) {
      // B7: surface the failure instead of returning silently — the old
      // code swallowed it, and draft cards vanished without feedback.
      setSaveErrors((prev) => ({
        ...prev,
        [platform]: result.error ?? "Save failed",
      }));
      return false;
    }
    setSaveErrors((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
    setEditingPlatform(null);
    await fetchData();
    return true;
  };

  const handleDelete = async (platform: string) => {
    const link = getLink(platform);
    if (!link) return;
    await fetch(`/api/calendar/links/${link.id}`, { method: "DELETE" });
    setUrlInputs((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
    await fetchData();
  };

  const handleTest = async (platform: string, url: string) => {
    if (!url.trim()) return;
    setTesting(platform);
    setTestResults((prev) => { const next = { ...prev }; delete next[platform]; return next; });
    try {
      const res = await fetch("/api/calendar/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const result = await res.json();
      setTestResults((prev) => ({ ...prev, [platform]: result }));
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [platform]: { success: false, error: String(err) } }));
    } finally {
      setTesting(null);
    }
  };

  const handleUpdateBuffer = async (platform: string, field: "bufferBefore" | "bufferAfter", value: number) => {
    const link = getLink(platform);
    if (!link) return;
    await fetch(`/api/calendar/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    await fetchData();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/calendar/sync", { method: "POST" });
      await fetchData();
    } finally {
      setSyncing(false);
    }
  };

  const feedUrl = (forPlatform: string) => {
    if (typeof window === "undefined") return "";
    const base = `${window.location.origin}/api/calendar/feed/${propertyId}/for-${forPlatform}.ics`;
    return feedToken ? `${base}?token=${feedToken}` : base;
  };

  const copyUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // Preset platforms — same set as the onboarding wizard so a host who
  // started there sees a consistent shelf in property settings.
  // `hasInstructions` flags the two presets we ship a step-by-step
  // tutorial for (PlatformInstructions component); other presets just
  // get the URL input + outbound feed URL.
  const PRESETS = [
    { platform: "airbnb", label: "Airbnb", color: resolvePlatformMeta("airbnb").color, placeholder: "https://www.airbnb.com/calendar/ical/…", hasInstructions: true as const },
    { platform: "booking", label: "Booking.com", color: resolvePlatformMeta("booking").color, placeholder: "https://admin.booking.com/…/ical.html?…", hasInstructions: true as const },
    { platform: "vrbo", label: "Vrbo", color: resolvePlatformMeta("vrbo").color, placeholder: "https://www.vrbo.com/icalendar/…", hasInstructions: false as const },
  ];
  const CUSTOM_PALETTE = ["#7c3aed", "#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#6366f1"];

  // Build the row list rendered in the platform grid. Order:
  //   1. Presets (airbnb, booking, vrbo) — always shown so the host
  //      knows what we support out of the box, even before connecting.
  //   2. Already-saved non-preset links (custom platforms saved earlier
  //      via onboarding or this same UI).
  //   3. Draft custom rows the user has just clicked "Add another platform"
  //      to create — not yet persisted as a CalendarLink row.
  type PlatformRow = {
    rowId: string;
    platform: string;
    label: string;
    color: string;
    placeholder: string;
    isPreset: boolean;
    isCustom: boolean;
    isDraft: boolean;
    hasInstructions: boolean;
  };
  const presetSlugs = new Set(PRESETS.map((p) => p.platform));
  const customLinks = links.filter((l) => !presetSlugs.has(l.platform));
  const platformRows: PlatformRow[] = [
    ...PRESETS.map((p) => ({
      rowId: `preset:${p.platform}`,
      platform: p.platform,
      label: p.label,
      color: p.color,
      placeholder: p.placeholder,
      isPreset: true,
      isCustom: false,
      isDraft: false,
      hasInstructions: p.hasInstructions,
    })),
    ...customLinks.map((l, i) => ({
      rowId: `link:${l.id}`,
      platform: l.platform,
      // Display name for a saved custom link: humanise the slug.
      // The onboarding wizard persists customName in the OnboardingDraft,
      // but once saved into CalendarLink we only have the slug — the
      // CalendarPlatform table on the server has the canonical
      // displayName, but we don't fetch that here. Title-casing the slug
      // is good enough for the read-back display.
      label: l.platform.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      color: CUSTOM_PALETTE[i % CUSTOM_PALETTE.length],
      placeholder: "https://…",
      isPreset: false,
      isCustom: true,
      isDraft: false,
      hasInstructions: false,
    })),
    ...customDrafts.map((d) => ({
      rowId: d.rowId,
      platform: d.platform,
      label: d.displayName || "Custom platform",
      color: d.color,
      placeholder: "https://…",
      isPreset: false,
      isCustom: true,
      isDraft: true,
      hasInstructions: false,
    })),
  ];

  // Slugify a custom-platform display name for the URL slug. Mirrors the
  // onboarding wizard's clientSlug — kept inline so this file is
  // self-contained.
  const clientSlug = (raw: string): string => {
    if (!raw) return "custom";
    const cyr: Record<string, string> = {
      а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
      з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
      п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
      ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
      я: "ya", є: "ye", і: "i", ї: "yi", ґ: "g", ў: "u",
    };
    let out = "";
    for (const ch of raw) {
      const lower = ch.toLowerCase();
      out += cyr[lower] !== undefined ? cyr[lower] : lower.normalize("NFD").replace(/[̀-ͯ]/g, "");
    }
    return (
      out
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24) || "custom"
    );
  };

  const addCustomDraft = () => {
    const rowId = `draft:${Math.random().toString(36).slice(2, 8)}`;
    setCustomDrafts((prev) => [
      ...prev,
      {
        rowId,
        platform: rowId, // placeholder — replaced when the user types a name
        displayName: "",
        color: CUSTOM_PALETTE[(customLinks.length + prev.length) % CUSTOM_PALETTE.length],
      },
    ]);
  };

  const updateCustomDraftName = (rowId: string, displayName: string) => {
    setCustomDrafts((prev) =>
      prev.map((d) => {
        if (d.rowId !== rowId) return d;
        const slug = clientSlug(displayName);
        const finalSlug = presetSlugs.has(slug) ? `${slug}-custom` : slug;
        return { ...d, displayName, platform: finalSlug };
      }),
    );
  };

  const removeCustomDraft = (rowId: string) => {
    setCustomDrafts((prev) => prev.filter((d) => d.rowId !== rowId));
  };

  const platforms = platformRows.map((row) => ({
    key: row.platform,
    label: row.label,
    color: row.color,
    url: urlInputs[row.platform] ?? "",
    setUrl: (v: string) => {
      setUrlInputs((prev) => ({ ...prev, [row.platform]: v }));
      // B7: a fresh keystroke after a failed save clears the inline error.
      setSaveErrors((prev) => {
        const next = { ...prev };
        delete next[row.platform];
        return next;
      });
    },
    placeholder: row.placeholder,
    isPreset: row.isPreset,
    isCustom: row.isCustom,
    isDraft: row.isDraft,
    hasInstructions: row.hasInstructions,
    rowId: row.rowId,
  }));

  return (
    <div className="-mx-3 sm:-mx-6 lg:-mx-8">
    <div className="cls-isolate mx-auto max-w-[1760px] space-y-8 px-3 sm:px-5">
      {/* Property switcher removido — el selector del navbar (top-bar)
          ya cubre el cambio de propiedad; duplicarlo llenaba la vista
          de badges cuando hay muchas propiedades. */}

      {/* Header — property name is the page title (e.g. "Casa
          Copacabana") with an inline rename affordance. */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const next = renameValue.trim();
                if (next && next !== propertyName) {
                  onUpdateProperty(propertyId, { name: next });
                }
                setRenaming(false);
              }}
              className="mt-1 flex items-center gap-2"
            >
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setRenaming(false); setRenameValue(propertyName); } }}
                className="h-9 flex-1 rounded-md border border-border-strong bg-surface px-2 text-base text-text-primary outline-none focus:border-action-primary"
              />
              <button type="submit" className="rounded-md bg-action-primary px-3 py-1.5 text-sm font-medium text-action-primary-fg hover:bg-action-primary-hover">
                {c.save}
              </button>
              <button type="button" onClick={() => { setRenaming(false); setRenameValue(propertyName); }} className="rounded-md px-3 py-1.5 text-sm text-text-muted hover:text-text-primary">
                {c.cancel}
              </button>
            </form>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary truncate">{propertyName}</h1>
              <button
                onClick={() => { setRenameValue(propertyName); setRenaming(true); }}
                title={c.rename}
                aria-label={c.rename}
                className="rounded p-1 text-text-faint hover:bg-surface-hover hover:text-text-primary transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {!loading && links.length === 0 && (
        <EmptyState
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          }
          title={t("empty.sync.title")}
          description={t("empty.sync.desc")}
        />
      )}

      {/* Hub-and-spoke guidance. Shown once the host has at least one
          calendar connected — that's the point they're wiring sync and
          most at risk of also cross-linking platforms directly, which
          causes the same booking to echo around and surface as a
          phantom double-booking. Friendly tip tone, not a warning. */}
      {/* Hub-and-spoke tip — static guidance, always rendered so it
          can't flash in after the calendar links finish loading
          (the layout shift that caused). */}
      <div className="flex items-start gap-2 rounded-lg border border-action-primary/20 bg-action-primary/[0.04] px-3 py-2.5">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-action-primary-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-sm leading-relaxed text-text-muted">
          {c.hubNote}
        </p>
      </div>

      {/* ── Calendars ── platform connections + the sync log. */}
      <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-eyebrow">
          {c.secCalendars}
        </h2>
        <button
          onClick={handleSync}
          disabled={syncing}
          title={t("sync.syncNow")}
          aria-label={t("sync.syncNow")}
          className="flex items-center gap-1.5 rounded-md bg-action-primary px-3 py-1.5 text-sm font-medium text-action-primary-fg transition-colors hover:bg-action-primary-hover disabled:opacity-50"
        >
          <svg className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span className="hidden sm:inline">{syncing ? t("sync.syncing") : t("sync.syncNow")}</span>
        </button>
      </div>
      {/* Platform Cards — now dynamic. Renders every preset (airbnb,
          booking, vrbo) plus any saved custom platforms plus any draft
          custom rows the user is composing. The outbound "import this
          back into the platform" feed URL is always visible alongside
          each row so the host can copy it BEFORE connecting too. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {platforms.map(({ key: platform, label, color, url, setUrl, placeholder, isPreset, isCustom, isDraft, hasInstructions, rowId }) => {
          const link = getLink(platform);
          const isConnected = !!link;
          const isEditing = editingPlatform === platform || !isConnected;
          const result = testResults[platform];
          const draftRow = isDraft ? customDrafts.find((d) => d.rowId === rowId) : null;

          return (
            <SettingsCard
              key={rowId}
              title={isDraft ? (draftRow?.displayName || c.platformName) : label}
              leading={<span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
              action={
                <div className="flex shrink-0 items-center gap-2">
                  {isCustom && !isDraft && !isPreset && (
                    <span className={cn("rounded-md bg-surface-hover px-1.5 py-0.5", eyebrowVariants({ variant: "tag" }))}>
                      {c.custom}
                    </span>
                  )}
                  {isConnected && (
                    <span className={`flex shrink-0 items-center gap-1 text-sm ${link?.lastError ? "text-rose-400" : "text-emerald-500"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${link?.lastError ? "bg-rose-400" : "bg-emerald-500"}`} />
                      {link?.lastError ? t("sync.feedError") : t("sync.connected")}
                    </span>
                  )}
                  {isDraft && (
                    <button
                      type="button"
                      onClick={() => removeCustomDraft(rowId)}
                      className="rounded p-0.5 text-text-faint hover:bg-surface-hover hover:text-rose-400"
                      aria-label={c.remove}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              }
            >
              {isDraft && (
                <input
                  autoFocus
                  value={draftRow?.displayName ?? ""}
                  onChange={(e) => updateCustomDraftName(rowId, e.target.value)}
                  placeholder={c.platformName}
                  className="mb-4 h-8 w-full rounded border border-border-strong bg-surface px-2 text-sm font-semibold text-text-primary outline-none focus:border-text-primary"
                />
              )}

              {/* Step 1: Export URL from platform */}
              <div className="space-y-2">
                {/* The "paste your iCal URL" onboarding tooltip is only
                    for a genuinely fresh property — gated on !loading so
                    it can't flash before the saved links arrive, and on
                    links.length === 0 so a host who already connected
                    some other platform (Booking, Vrbo…) isn't nagged. */}
                {platform === "airbnb" && !loading && links.length === 0 ? (
                  <OnboardingTooltip id={`ical-url:${propertyId}`} text={t("tooltip.icalUrl")}>
                    <label className="text-caption">
                      {t("sync.icalLabel")} {label}
                    </label>
                  </OnboardingTooltip>
                ) : (
                  <label className="text-caption">
                    {t("sync.icalLabel")} {label}
                  </label>
                )}
                <div className="flex gap-1.5">
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={placeholder || t("sync.pastePlaceholder", { platform: label })}
                    className="h-9 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-2.5 text-sm text-text-primary placeholder-text-faint outline-none focus:border-text-primary"
                    disabled={isConnected && !isEditing}
                  />
                  {isConnected && !isEditing ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingPlatform(platform)}
                        className="rounded-md bg-border-strong px-2 py-1 text-sm text-text-secondary hover:bg-border-strong"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={() => handleDelete(platform)}
                        className="rounded-md px-2 py-1 text-sm text-rose-500 hover:bg-rose-500/10"
                      >
                        {t("common.remove")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleTest(platform, url)}
                        disabled={!url.trim() || testing === platform || (isDraft && !draftRow?.displayName.trim())}
                        className="rounded-md bg-border-strong px-2.5 py-1 text-sm text-text-secondary hover:bg-border-strong disabled:opacity-40"
                      >
                        {testing === platform ? "..." : t("common.test")}
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await handleSave(platform, url);
                          // B7: only drop the draft row once the link is
                          // actually persisted. On failure the card stays
                          // and the inline error explains why.
                          if (ok && isDraft) removeCustomDraft(rowId);
                        }}
                        disabled={!url.trim() || (isDraft && !draftRow?.displayName.trim())}
                        className="rounded-md bg-action-primary px-2.5 py-1 text-sm font-medium text-action-primary-fg hover:bg-action-primary-hover disabled:opacity-40"
                      >
                        {t("common.save")}
                      </button>
                    </div>
                  )}
                </div>

                {/* Test result */}
                {result && (
                  <div className={`rounded-md px-3 py-2 text-sm ${result.success ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                    {result.success ? (
                      <span>{t("sync.testResult", { future: result.futureEvents ?? 0, total: result.totalEvents ?? 0 })}</span>
                    ) : (
                      <span>{result.error}</span>
                    )}
                  </div>
                )}

                {/* Save error (B7) — a failed POST used to vanish the card
                    with no feedback; now it stays and explains itself. */}
                {saveErrors[platform] && (
                  <div className="flex items-start gap-2 rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{saveErrors[platform]}</span>
                  </div>
                )}

                {/* Last sync info */}
                {link?.lastFetchedAt && (
                  <p className="text-caption">
                    {t("sync.lastSynced")} {new Date(link.lastFetchedAt).toLocaleString(c.dateLocale)}
                  </p>
                )}

                {/* Feed error warning */}
                {link?.lastError && (
                  <div className="flex items-start gap-2 rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="space-y-1">
                      <p className="font-medium">{t("sync.feedError")}</p>
                      <p className="text-rose-400/80">{link.lastError}</p>
                      {link.failureCount > 1 && (
                        <p className="text-rose-400/60">
                          {t("sync.consecutiveFailures", { count: link.failureCount })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step-by-step instructions for the two presets we have
                    tutorial copy for. Hidden until expanded so the card
                    stays compact when the user already knows the steps. */}
                {hasInstructions && !isConnected && (platform === "airbnb" || platform === "booking") && (
                  <div className="pt-1">
                    <PlatformInstructions platform={platform} mode="export" />
                  </div>
                )}
              </div>

              {/* Step 2: Import URL — always rendered, not just when
                  connected. Showing the URL pre-connect lets the user
                  copy it into the OTHER platform's import field before
                  they've finished pasting their export URL — which is
                  the actual workflow when wiring two platforms. */}
              <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                <label className="text-caption">
                  {t("sync.importLabel")} {label}
                </label>
                {isDraft && !draftRow?.displayName.trim() ? (
                  <p className="text-sm italic text-text-faint">
                    {c.draftImportHint}
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <code className="min-w-0 flex-1 truncate rounded-md bg-surface border border-border-strong px-2.5 py-1.5 text-data text-text-secondary">
                      {feedUrl(platform)}
                    </code>
                    <button
                      onClick={() => copyUrl(feedUrl(platform), `feed-${platform}`)}
                      className="shrink-0 rounded-md bg-border-strong px-2.5 py-1.5 text-sm text-text-secondary hover:bg-border-strong"
                    >
                      {copied === `feed-${platform}` ? t("common.copied") : t("common.copy")}
                    </button>
                  </div>
                )}
                {hasInstructions && (platform === "airbnb" || platform === "booking") && (
                  <div className="pt-1">
                    <PlatformInstructions platform={platform} mode="import" />
                  </div>
                )}
              </div>
            </SettingsCard>
          );
        })}
      </div>

      {/* Add custom platform — matches the onboarding wizard CTA so a
          host who originally added a Hostaway or Plum Guide row in
          onboarding can do the same here. The row appears as a draft;
          fill in the name + URL, hit Save, and it's persisted. */}
      <button
        type="button"
        onClick={addCustomDraft}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border-strong px-3 py-2 text-sm text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {c.addAnother}
      </button>
      </section>

      {/* ── Stay rules ── booking constraints, in a card grid. */}
      <section className="space-y-3">
      <h2 className="text-eyebrow">
        {c.secStayRules}
      </h2>
      {/* Masonry columns — these cards have very different heights, so
          a grid left ragged gaps. Columns pack them tightly; one
          column on mobile. */}
      <div className="gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">

      {/* Buffer Settings — gated on `!loading` so it doesn't pop in
          after the first paint. Pre-load links is empty, so without
          the gate the section vanishes for a beat then appears. */}
      {!loading && links.length > 0 && (
        <SettingsCard
          title={t("sync.bufferDays")}
          collapsible
          open={advancedOpen.buffer}
          onToggle={() => toggleAdvanced("buffer")}
        >
          <p className="text-caption">
            {t("sync.bufferDesc")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {platforms.map(({ key: platform, label, color }) => {
              const link = getLink(platform);
              if (!link) return null;
              return (
                <div key={platform} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-medium text-text-primary">{label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-caption">{t("sync.before")}</span>
                      <div className="relative">
                        <select
                          value={link.bufferBefore}
                          onChange={(e) => handleUpdateBuffer(platform, "bufferBefore", Number(e.target.value))}
                          className="h-8 appearance-none rounded-md border border-border-strong bg-surface pl-2.5 pr-7 text-sm text-text-primary outline-none focus:border-text-primary"
                        >
                          {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n} {c.daysShort(n)}</option>)}
                        </select>
                        <svg className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-caption">{t("sync.after")}</span>
                      <div className="relative">
                        <select
                          value={link.bufferAfter}
                          onChange={(e) => handleUpdateBuffer(platform, "bufferAfter", Number(e.target.value))}
                          className="h-8 appearance-none rounded-md border border-border-strong bg-surface pl-2.5 pr-7 text-sm text-text-primary outline-none focus:border-text-primary"
                        >
                          {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n} {c.daysShort(n)}</option>)}
                        </select>
                        <svg className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SettingsCard>
      )}

      {/* Minimum Nights */}
      <SettingsCard
        title={t("sync.minStay")}
        collapsible
        open={advancedOpen.minNights}
        onToggle={() => toggleAdvanced("minNights")}
      >
        <p className="text-caption">
          {t("sync.minStayDesc")}
        </p>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">{t("sync.minNights")}</span>
            <div className="relative">
              <select
                value={minNights}
                onChange={(e) => onUpdateProperty(propertyId, { minNights: Number(e.target.value) })}
                className="h-8 appearance-none rounded-md border border-border-strong bg-surface pl-3 pr-8 text-sm text-text-primary outline-none focus:border-text-primary"
              >
                {[1, 2, 3, 4, 5, 7, 10, 14].map((n) => <option key={n} value={n}>{n} {c.nightsShort(n)}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </div>
          </div>
        </SettingsCard>

      {/* Check-in / Check-out times */}
      <SettingsCard
        title={t("sync.checkInOutTimes")}
        collapsible
        open={advancedOpen.times}
        onToggle={() => toggleAdvanced("times")}
      >
        <p className="text-caption">{t("sync.checkInOutDesc")}</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">{t("sync.checkInTime")}</span>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => onUpdateProperty(propertyId, { checkInTime: e.target.value })}
                className="h-8 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-text-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">{t("sync.checkOutTime")}</span>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => onUpdateProperty(propertyId, { checkOutTime: e.target.value })}
                className="h-8 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-text-primary"
              />
            </div>
          </div>
        </SettingsCard>

      {/* Booking Window */}
      <SettingsCard
        title={t("sync.bookingWindow")}
        collapsible
        open={advancedOpen.window}
        onToggle={() => toggleAdvanced("window")}
      >
        <p className="text-caption">{t("sync.bookingWindowDesc")}</p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={bookingWindow}
                onChange={(e) => onUpdateProperty(propertyId, { bookingWindow: Number(e.target.value) })}
                className="h-8 appearance-none rounded-md border border-border-strong bg-surface pl-3 pr-8 text-sm text-text-primary outline-none focus:border-text-primary"
              >
                {[90, 180, 270, 365, 548, 730].map((n) => (
                  <option key={n} value={n}>{n} {t("sync.bookingWindowDays")} ({Math.round(n / 30)} {c.monthsShort})</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </div>
          </div>
        </SettingsCard>

      </div>
      </section>

      {/* ── Access & sharing ── managers, templates, guest form, feed. */}
      <section className="space-y-3">
      <h2 className="text-eyebrow">
        {c.secAccess}
      </h2>
      {/* Masonry columns — see Stay rules above. One column on mobile. */}
      <div className="gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">

      {/* Property Managers */}
      <PropertyManagersPanel propertyId={propertyId} ownerUserId={ownerUserId} />

      {/* Sync Log — `!loading` gate prevents the section from popping
          in after the first fetchData resolves. */}
      {!loading && logs.length > 0 && (
        <SettingsCard
          title={`${t("sync.log.title")} (${logs.length})`}
          collapsible
          open={showLogs}
          onToggle={() => setShowLogs(!showLogs)}
        >
          <div className="max-h-[200px] overflow-y-auto font-mono text-sm leading-snug space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="shrink-0 text-text-faint">
                  {new Date(log.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className={
                  log.level === "error" ? "text-rose-500"
                  : log.level === "success" ? "text-emerald-500"
                  : log.level === "warn" ? "text-amber-400"
                  : "text-text-muted"
                }>
                  {renderSyncLogMessage(log.message, (key, params) =>
                    t(key as TranslationKey, params),
                  )}
                </span>
              </div>
            ))}
          </div>
        </SettingsCard>
      )}

      {/* CleanerAssignmentSection moved to the
          PropertyCleaningView sidebar. The cleaning tab is the sole
          assignment UI now. */}
      <MessageTemplatesPanel propertyId={propertyId} />

      {/* Pre-arrival guest form — the builder is its own full-page
          surface now; this card just links across to it. */}
      <SettingsCard title={c.guestFormTitle}>
        <Link
          href={`/dashboard?property=${propertyId}&view=guest-form`}
          className="group flex items-center gap-3 rounded-md transition-colors hover:bg-surface-hover"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-action-primary/10 text-action-primary-text">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-caption">
              {c.guestFormDesc}
            </p>
          </div>
          <svg className="h-4 w-4 shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </SettingsCard>

      {/* Feed access token — relocated to the bottom of the
          page. The card explains what the feed URL is for and lets the
          user opt into a private token. Rendered last so first-time
          users see the iCal export / cleaner / message pieces before
          the advanced opt-in. Gated on `!loading` so the card doesn't
          flash after first paint. */}
      {!loading && links.length > 0 && (
        <SettingsCard
          title={c.feedTokenTitle}
          action={
            <div className="flex shrink-0 items-center gap-2">
              {feedToken && (
                <button
                  onClick={handleClearToken}
                  disabled={rotating}
                  className="rounded-md px-2.5 py-1 text-sm text-text-muted hover:text-text-primary disabled:opacity-40"
                >
                  {c.makePublic}
                </button>
              )}
              <button
                onClick={handleRotateToken}
                disabled={rotating}
                className="rounded-md bg-action-primary px-2.5 py-1 text-sm font-medium text-action-primary-fg hover:bg-action-primary-hover disabled:opacity-40"
              >
                {rotating ? "..." : feedToken ? c.rotate : c.generateToken}
              </button>
            </div>
          }
        >
          <p className="text-caption leading-relaxed line-clamp-2">
            {c.feedTokenDesc}
          </p>
          <details className="mt-0.5">
            <summary className="cursor-pointer select-none text-sm text-text-faint transition-colors hover:text-text-secondary">
              {c.feedTokenMore}
            </summary>
            <p className="mt-1 text-caption leading-relaxed">
              {c.feedTokenDesc}
            </p>
          </details>
          <p className="mt-1.5 text-caption">
            {feedToken ? c.feedTokenActiveNote : c.feedTokenPublicNote}
          </p>
          {feedToken && (
            <code className="mt-3 block truncate rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-data text-text-secondary">
              ?token={feedToken}
            </code>
          )}
        </SettingsCard>
      )}

      </div>
      </section>

      {/* Danger zone — delete this property. Only the owner can hit
          DELETE /api/properties/:id; the dashboard's handler also
          handles the "navigate away" piece (clears selection, calls
          fetchProperties, etc.). */}
      <section className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-5">
        <h2 className="text-base font-semibold text-text-primary">
          {c.dangerZone}
        </h2>
        <p className="mt-1 text-caption leading-relaxed">
          {c.dangerZoneDesc}
        </p>
        <button
          type="button"
          onClick={() => {
            const ok = window.confirm(c.confirmDelete(propertyName));
            if (ok) onDeleteProperty(propertyId);
          }}
          className="mt-3 rounded-md border border-rose-500/40 px-3 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
        >
          {c.deleteProperty}
        </button>
      </section>
    </div>
    </div>
  );
}
