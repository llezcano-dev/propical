"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { PropertySwitcher } from "@/components/property-switcher";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { eyebrowVariants } from "@/components/ui/atoms/eyebrow";
import { Chip } from "@/components/ui/atoms/chip";
import type { Locale } from "@/lib/i18n/translations";
import type { Property } from "@/lib/types";
import { toUtcDateStr } from "@/components/calendar/utils";
import { PLATFORM_PRESETS, resolvePlatformColor, FALLBACK_PLATFORM_COLOR } from "@/lib/platform-meta";

interface CopyShape {
  reports: string;
  portfolioSubtitle: (count: number) => string;
  propertySubtitle: (name: string) => string;
  noDataYet: string;
  pastWindow: (months: number) => string;
  noProperties: string;
  pastOccupancy: string;
  upcomingNights: string;
  upcomingNightsSubtitle: (months: number) => string;
  bookings: string;
  avgNights: (n: number) => string;
  allTime: string;
  cleaningsAhead: string;
  cleaningsAheadSubtitle: string;
  topSource: string;
  presets: string;
  yAxisUnit: string;
  tooltipUnit: string;
  now: string;
  past: string;
  upcoming: string;
  noBookings: string;
  loading: string;
  byProperty: string;
  byPropertyHint: string;
  colProperty: string;
  colPastOcc: string;
  colUpcoming: string;
  colBookings: string;
  colCleanings: string;
  colTopSource: string;
  allPropertiesLabel: (count: number) => string;
  period: string;
  allPeriod: string;
  monthsLabel: (n: number) => string;
  periodHelp: string;
  exportTitle: string;
  exportingProperty: (name: string) => string;
  exportingAll: (count: number) => string;
  fromLabel: string;
  toLabel: string;
  downloadCsv: string;
  exportHelp: string;
  dataSources: string;
  dataSourcesHelp: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    reports: "Reports",
    portfolioSubtitle: (count) =>
      `Portfolio across ${count} ${count === 1 ? "property" : "properties"} — history + upcoming`,
    propertySubtitle: (name) => `${name} — history & pipeline`,
    noDataYet: "no data yet",
    pastWindow: (months) => `last ${months} ${months === 1 ? "month" : "months"}`,
    noProperties: "No properties to report on yet.",
    pastOccupancy: "Past occupancy",
    upcomingNights: "Upcoming nights",
    upcomingNightsSubtitle: (months) => `next ${months} mo.`,
    bookings: "Bookings",
    avgNights: (n) => `avg ${n} nights`,
    allTime: "all time",
    cleaningsAhead: "Cleanings ahead",
    cleaningsAheadSubtitle: "one per upcoming checkout",
    topSource: "Top source:",
    presets: "Presets",
    yAxisUnit: "d",
    tooltipUnit: "nights",
    now: "now",
    past: "past",
    upcoming: "upcoming",
    noBookings: "No bookings yet.",
    loading: "Loading…",
    byProperty: "By property",
    byPropertyHint: "Click a property to open its scoped report.",
    colProperty: "Property",
    colPastOcc: "Past occ.",
    colUpcoming: "Upcoming",
    colBookings: "Bookings",
    colCleanings: "Cleanings",
    colTopSource: "Top source",
    allPropertiesLabel: (count) => `All properties (${count})`,
    period: "Period",
    allPeriod: "All",
    monthsLabel: (n) => `${n}M`,
    periodHelp: "Presets set the past window; the future is always the next 6 months. Use From/To for a custom range.",
    exportTitle: "Export reservations",
    exportingProperty: (name) => `Exporting ${name}.`,
    exportingAll: (count) =>
      `All ${count} ${count === 1 ? "property" : "properties"}.`,
    fromLabel: "From",
    toLabel: "To",
    downloadCsv: "Download CSV",
    exportHelp: "Exports the selected range. UTF-8 BOM for Excel.",
    dataSources: "Data sources",
    dataSourcesHelp:
      "Numbers are computed from your reservations + iCal events, deduped by uid. Past stays are preserved in our DB even after platforms drop them from their feeds.",
  },
  pt: {
    reports: "Relatórios",
    portfolioSubtitle: (count) =>
      `Carteira de ${count} ${count === 1 ? "propriedade" : "propriedades"} — histórico + próximas`,
    propertySubtitle: (name) => `${name} — histórico e pipeline`,
    noDataYet: "ainda sem dados",
    pastWindow: (months) => `últimos ${months} ${months === 1 ? "mês" : "meses"}`,
    noProperties: "Ainda não há propriedades para relatar.",
    pastOccupancy: "Ocupação passada",
    upcomingNights: "Noites futuras",
    upcomingNightsSubtitle: (months) => `próximos ${months} meses`,
    bookings: "Reservas",
    avgNights: (n) => `média de ${n} noites`,
    allTime: "todo o histórico",
    cleaningsAhead: "Limpezas futuras",
    cleaningsAheadSubtitle: "uma para cada check-out futuro",
    topSource: "Fonte principal:",
    presets: "Predefinições",
    yAxisUnit: "d",
    tooltipUnit: "noites",
    now: "agora",
    past: "passado",
    upcoming: "próximo",
    noBookings: "Ainda não há reservas.",
    loading: "Carregando…",
    byProperty: "Por propriedade",
    byPropertyHint: "Clique em uma propriedade para abrir seu relatório.",
    colProperty: "Propriedade",
    colPastOcc: "Ocup. passada",
    colUpcoming: "Próximas",
    colBookings: "Reservas",
    colCleanings: "Limpezas",
    colTopSource: "Fonte principal",
    allPropertiesLabel: (count) => `Todas as propriedades (${count})`,
    period: "Período",
    allPeriod: "Tudo",
    monthsLabel: (n) => `${n}M`,
    periodHelp: "As predefinições definem a janela passada; o futuro é sempre os próximos 6 meses. Use De/Até para um período personalizado.",
    exportTitle: "Exportar reservas",
    exportingProperty: (name) => `Exportando ${name}.`,
    exportingAll: (count) =>
      `Todas as ${count} ${count === 1 ? "propriedade" : "propriedades"}.`,
    fromLabel: "De",
    toLabel: "Até",
    downloadCsv: "Baixar CSV",
    exportHelp: "Exporta o período selecionado. UTF-8 BOM para Excel.",
    dataSources: "Fontes de dados",
    dataSourcesHelp:
      "Os números são calculados a partir das suas reservas + eventos iCal, deduplicados por uid. As estadias passadas são mantidas no nosso banco mesmo que as plataformas as removam dos seus feeds.",
  },
  es: {
    reports: "Informes",
    portfolioSubtitle: (count) =>
      `Cartera de ${count} ${count === 1 ? "alojamiento" : "alojamientos"} — historial + próximas`,
    propertySubtitle: (name) => `${name} — historial y pipeline`,
    noDataYet: "aún sin datos",
    pastWindow: (months) => `últimos ${months} ${months === 1 ? "mes" : "meses"}`,
    noProperties: "Aún no hay alojamientos para informar.",
    pastOccupancy: "Ocupación pasada",
    upcomingNights: "Noches próximas",
    upcomingNightsSubtitle: (months) => `próximos ${months} meses`,
    bookings: "Reservas",
    avgNights: (n) => `media ${n} noches`,
    allTime: "histórico",
    cleaningsAhead: "Limpiezas próximas",
    cleaningsAheadSubtitle: "una por cada salida próxima",
    topSource: "Fuente principal:",
    presets: "Predefiniciones",
    yAxisUnit: "d",
    tooltipUnit: "noches",
    now: "ahora",
    past: "pasado",
    upcoming: "próximo",
    noBookings: "Aún no hay reservas.",
    loading: "Cargando…",
    byProperty: "Por alojamiento",
    byPropertyHint: "Haga clic en un alojamiento para abrir su informe.",
    colProperty: "Alojamiento",
    colPastOcc: "Ocup. pasada",
    colUpcoming: "Próximas",
    colBookings: "Reservas",
    colCleanings: "Limpiezas",
    colTopSource: "Fuente principal",
    allPropertiesLabel: (count) => `Todos los alojamientos (${count})`,
    period: "Período",
    allPeriod: "Todo",
    monthsLabel: (n) => `${n}M`,
    periodHelp: "Las predefiniciones definen la ventana pasada; el futuro son siempre los próximos 6 meses. Use Desde/Hasta para un período personalizado.",
    exportTitle: "Exportar reservas",
    exportingProperty: (name) => `Exportando ${name}.`,
    exportingAll: (count) =>
      `Los ${count} ${count === 1 ? "alojamiento" : "alojamientos"}.`,
    fromLabel: "Desde",
    toLabel: "Hasta",
    downloadCsv: "Descargar CSV",
    exportHelp: "Exporta el período seleccionado. UTF-8 BOM para Excel.",
    dataSources: "Fuentes de datos",
    dataSourcesHelp:
      "Las cifras se calculan a partir de sus reservas + eventos iCal, deduplicados por uid. Las estancias pasadas se conservan en nuestra base aunque las plataformas las retiren de sus feeds.",
  },
};

interface ReportsPanelProps {
  property: Property | null;
  properties: Property[];
}

interface CalendarEventRow {
  id: number;
  propertyId: number;
  uid: string;
  platform: string;
  summary: string;
  startDate: string;
  endDate: string;
}

interface MonthBucket {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  totalDays: number;
  isPast: boolean;
  isCurrent: boolean;
  /** Per-platform occupancy: platform slug -> nights occupied in this month. */
  perPlatform: Record<string, number>;
}

type PeriodChoice = 3 | 6 | 12 | 24 | "all";
const DEFAULT_PERIOD: PeriodChoice = 6;
const FUTURE_MONTHS = 6; // forward window for upcoming nights

function ymKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

interface NormalizedStay {
  start: string; // YYYY-MM-DD inclusive
  end: string;   // YYYY-MM-DD exclusive (checkout day not occupied)
  platform: string;
  propertyId: number;
}

/** First day of the month containing `d`, as YYYY-MM-DD (local calendar). */
function monthStartStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Last day of the month containing `d`, as YYYY-MM-DD (local calendar). */
function monthEndStr(d: Date): string {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

/**
 * The [from, to] date range a period preset maps to. Presets define the
 * PAST window; the future edge is always exactly FUTURE_MONTHS ahead
 * (deterministic — it never stretches to a far-future booking). "all"
 * extends the past edge back to the earliest stay (no cap).
 */
export function presetRange(
  p: PeriodChoice,
  allStays: NormalizedStay[],
  today: Date,
): { from: string; to: string } {
  let from: string;
  if (p === "all") {
    let earliest = new Date(today.getFullYear(), today.getMonth(), 1);
    for (const s of allStays) {
      const d = new Date(s.start + "T00:00:00");
      if (d < earliest) earliest = new Date(d.getFullYear(), d.getMonth(), 1);
    }
    from = monthStartStr(earliest);
  } else {
    from = monthStartStr(new Date(today.getFullYear(), today.getMonth() - p, 1));
  }
  const toDate = new Date(today.getFullYear(), today.getMonth() + FUTURE_MONTHS, 1);
  return { from, to: monthEndStr(toDate) };
}

/**
 * Build the month buckets covering the explicit [from, to] date range.
 * Every month between the two edges is rendered — empty months included —
 * so a wide preset stays visibly wide even when the older months hold no
 * reservations. The data fill (fillBuckets) clips stays to this range.
 */
export function buildMonthRange(from: string, to: string): MonthBucket[] {
  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T00:00:00");
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const buckets: MonthBucket[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const year = cursor.getFullYear();
    const monthIndex = cursor.getMonth();
    const monthEnd = new Date(year, monthIndex + 1, 0); // last day of month
    const totalDays = monthEnd.getDate();
    const isPast = monthEnd < today;
    const isCurrent =
      year === currentMonthStart.getFullYear() && monthIndex === currentMonthStart.getMonth();
    buckets.push({
      key: ymKey(year, monthIndex),
      label: cursor.toLocaleDateString("en-GB", {
        month: "short",
        // Show year on Jan and on the very first bucket so cross-year context is visible.
        year: monthIndex === 0 || buckets.length === 0 ? "2-digit" : undefined,
      }),
      year,
      monthIndex,
      totalDays,
      isPast,
      isCurrent,
      perPlatform: {},
    });
    cursor.setMonth(monthIndex + 1, 1);
  }
  return buckets;
}

/** Distribute each stay's occupied days across the month buckets. */
function fillBuckets(buckets: MonthBucket[], stays: NormalizedStay[]): void {
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  const firstBucket = buckets[0];
  if (!firstBucket) return;
  const horizonStart = new Date(firstBucket.year, firstBucket.monthIndex, 1);
  const lastBucket = buckets[buckets.length - 1];
  const horizonEnd = new Date(lastBucket.year, lastBucket.monthIndex + 1, 1);

  for (const s of stays) {
    const stayStart = new Date(s.start + "T00:00:00");
    const stayEndExclusive = new Date(s.end + "T00:00:00");
    if (stayEndExclusive <= horizonStart) continue;
    if (stayStart >= horizonEnd) continue;

    const cur = new Date(Math.max(stayStart.getTime(), horizonStart.getTime()));
    const stop = new Date(Math.min(stayEndExclusive.getTime(), horizonEnd.getTime()));
    while (cur < stop) {
      const key = ymKey(cur.getFullYear(), cur.getMonth());
      const bucket = byKey.get(key);
      if (bucket) {
        bucket.perPlatform[s.platform] = (bucket.perPlatform[s.platform] ?? 0) + 1;
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
}

interface PlatformMeta {
  slug: string;
  label: string;
  color: string;
}

function platformMeta(slug: string): PlatformMeta {
  const preset = PLATFORM_PRESETS.find((p) => p.slug === slug);
  if (preset) return { slug, label: preset.displayName, color: resolvePlatformColor(preset.color) };
  return { slug, label: slug.charAt(0).toUpperCase() + slug.slice(1), color: FALLBACK_PLATFORM_COLOR };
}

/** True for iCal summaries that indicate a generic blocked entry
 *  rather than a guest name (Airbnb's "Reserved", Booking's "CLOSED",
 *  host-blocks, etc.). Used to merge iCal twins of manually-entered
 *  Reservations on identical dates when the host hasn't gone through
 *  the bar-claim popover. */
function isGenericIcalName(summary: string): boolean {
  if (!summary) return true;
  const s = summary.toLowerCase().trim();
  return (
    s === "reserved" ||
    s === "closed" ||
    s.includes("not available") ||
    s.includes("blocked") ||
    s.includes("closed - not available")
  );
}

/** Build the deduped list of stays for one property. Three layers of
 *  dedup so the same real-world booking is never counted twice:
 *    1. linkedEventUid match (explicit claim) → drop the iCal twin.
 *    2. Same start+end + generic iCal summary → drop the iCal twin
 *       (catches manually-entered Reservations whose iCal feed is
 *       still emitting an unclaimed twin).
 *    3. Airbnb host-blocks → filtered out (not real guests). */
function buildStaysForProperty(prop: Property, events: CalendarEventRow[]): NormalizedStay[] {
  const linkedUids = new Set(
    prop.reservations.map((r) => r.linkedEventUid).filter((u): u is string => !!u)
  );
  const reservationDateKeys = new Set<string>();
  for (const r of prop.reservations) {
    // Reservation checkIn/checkOut are UTC instants; UTC read keeps the
    // calendar date aligned with the raw iCal date strings they must
    // match (B1 class). Local getters here drift a day in non-UTC
    // timezones and the reservation/event dedup silently breaks.
    reservationDateKeys.add(`${toUtcDateStr(new Date(r.checkIn))}|${toUtcDateStr(new Date(r.checkOut))}`);
  }
  const stays: NormalizedStay[] = [];
  for (const ev of events) {
    if (ev.propertyId !== prop.id) continue;
    const platform = (ev.platform || "").toLowerCase();
    const isAirbnbBlock =
      platform === "airbnb" &&
      (ev.summary?.includes("Not available") || ev.summary?.includes("Blocked"));
    if (isAirbnbBlock) continue;
    if (ev.uid && linkedUids.has(ev.uid)) continue;
    const dateKey = `${ev.startDate}|${ev.endDate}`;
    if (reservationDateKeys.has(dateKey) && isGenericIcalName(ev.summary || "")) continue;
    stays.push({ start: ev.startDate, end: ev.endDate, platform, propertyId: prop.id });
  }
  for (const r of prop.reservations) {
    stays.push({
      start: toUtcDateStr(new Date(r.checkIn)),
      end: toUtcDateStr(new Date(r.checkOut)),
      platform: (r.platform || "direct").toLowerCase(),
      propertyId: prop.id,
    });
  }
  return stays;
}

/**
 * Per-property KPIs split into past + upcoming. Past occupancy is the
 * only honest "occupancy %" because future months still have bookable
 * days — counting those toward occupancy makes it look artificially
 * low for properties that get last-minute bookings.
 */
interface PropertyKpis {
  property: Property;
  pastNights: number;
  pastDays: number;
  pastOccupancy: number;     // % of completed past months that were occupied
  upcomingNights: number;    // raw nights booked in next FUTURE_MONTHS months
  totalBookings: number;     // count of stays touching the displayed window
  pastBookings: number;      // count of stays that ended in the past window
  avgStayNights: number;
  topPlatform: PlatformMeta | null;
  cleaningsUpcoming: number;
}

function computePropertyKpis(
  prop: Property,
  stays: NormalizedStay[],
  buckets: MonthBucket[],
  futureEndDate: Date,
): PropertyKpis {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  // The range's future edge (exclusive) — upcoming nights / cleanings
  // count stays inside (today, futureEndDate). Follows the active range
  // instead of a hardcoded lookahead.
  const futureEndCap = futureEndDate;

  // Past horizon = first past bucket → end of the month before this one.
  const pastBuckets = buckets.filter((b) => b.isPast && stays.some((s) => s.propertyId === prop.id));
  // Past day total = sum of days in past months that are fully done.
  const pastStart = pastBuckets[0]
    ? new Date(pastBuckets[0].year, pastBuckets[0].monthIndex, 1)
    : currentMonthStart;
  const pastEnd = currentMonthStart; // exclusive (today's month is "current", not past)
  const pastDays = Math.round((pastEnd.getTime() - pastStart.getTime()) / 86_400_000);

  let pastNights = 0;
  let upcomingNights = 0;
  let totalBookings = 0;
  let pastBookings = 0;
  let totalNightsAllTime = 0;
  let cleaningsUpcoming = 0;
  const perPlatform = new Map<string, number>();

  for (const s of stays) {
    if (s.propertyId !== prop.id) continue;
    const sStart = new Date(s.start + "T00:00:00");
    const sEnd = new Date(s.end + "T00:00:00");

    // Past portion of stay: clipped to [pastStart, pastEnd)
    const pStart = new Date(Math.max(sStart.getTime(), pastStart.getTime()));
    const pStop = new Date(Math.min(sEnd.getTime(), pastEnd.getTime()));
    if (pStop > pStart) {
      pastNights += Math.round((pStop.getTime() - pStart.getTime()) / 86_400_000);
    }

    // Upcoming portion: clipped to [today, futureEndCap)
    const uStart = new Date(Math.max(sStart.getTime(), today.getTime()));
    const uStop = new Date(Math.min(sEnd.getTime(), futureEndCap.getTime()));
    if (uStop > uStart) {
      upcomingNights += Math.round((uStop.getTime() - uStart.getTime()) / 86_400_000);
    }

    // Total stay length toward avg-stay calculation (uses the WHOLE stay,
    // not just the part that fits the report window — a stay either is
    // a stay or it isn't).
    const stayNights = Math.max(0, Math.round((sEnd.getTime() - sStart.getTime()) / 86_400_000));
    if (stayNights > 0) {
      totalBookings += 1;
      totalNightsAllTime += stayNights;
      perPlatform.set(s.platform, (perPlatform.get(s.platform) ?? 0) + stayNights);
      if (sEnd <= today) pastBookings += 1;
      // Cleanings upcoming = stays whose checkout falls inside the
      // forward window. One cleaning per checkout.
      if (sEnd > today && sEnd <= futureEndCap) cleaningsUpcoming += 1;
    }
  }

  const pastOccupancy = pastDays > 0 ? Math.round((100 * pastNights) / pastDays) : 0;
  const avgStayNights =
    totalBookings > 0 ? Math.round((totalNightsAllTime / totalBookings) * 10) / 10 : 0;

  let topPlatform: PlatformMeta | null = null;
  let topNights = 0;
  for (const [slug, n] of perPlatform) {
    if (n > topNights) {
      topNights = n;
      topPlatform = platformMeta(slug);
    }
  }

  return {
    property: prop,
    pastNights,
    pastDays,
    pastOccupancy,
    upcomingNights,
    totalBookings,
    pastBookings,
    avgStayNights,
    topPlatform,
    cleaningsUpcoming,
  };
}

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: boolean;
}
function KpiCard({ label, value, subtitle, accent }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised px-4 py-3.5">
      <div className={eyebrowVariants({ variant: "field" })}>{label}</div>
      <div className={`mt-1 text-2xl font-bold tracking-tight ${accent ? "text-action-primary-text" : "text-text-primary"}`}>
        {value}
      </div>
      {subtitle && (
        <div className="mt-0.5 text-sm text-text-muted leading-snug">{subtitle}</div>
      )}
    </div>
  );
}

export function ReportsPanel({ property, properties }: ReportsPanelProps) {
  const { locale } = useI18n();
  const c = COPY[locale];

  // Stable "today" for preset ranges — never drifts mid-session.
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Single source of truth for the report window: [rangeFrom, rangeTo]
  // drives the chart, the per-property table, the KPIs AND the CSV export,
  // so the exported dates always match what's on screen. Presets are
  // shortcuts that set this range; the De/Até inputs override it. Initial
  // range comes from the default preset (lazy init — no effect needed).
  const [rangeFrom, setRangeFrom] = useState(() => presetRange(DEFAULT_PERIOD, [], today).from);
  const [rangeTo, setRangeTo] = useState(() => presetRange(DEFAULT_PERIOD, [], today).to);
  // The preset currently highlighted. Tracked by click, NOT by comparing
  // ranges: when the earliest stay sits exactly N months back, "all" and
  // "6M" map to the identical range and a range-equality check would
  // highlight both at once. Custom De/Até edits clear it (custom range).
  const [periodChoice, setPeriodChoice] = useState<PeriodChoice | null>(DEFAULT_PERIOD);
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const targetProperties = useMemo(
    () => (property ? [property] : properties),
    [property, properties],
  );
  const isMulti = !property;
  const targetIdsKey = useMemo(
    () => targetProperties.map((p) => p.id).sort((a, b) => a - b).join(","),
    [targetProperties],
  );

  useEffect(() => {
    if (targetProperties.length === 0) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate fetch-on-prop-change pattern; loading state must flip on the same render that kicks off the request
    setLoading(true);
    const url = property
      ? `/api/calendar/sync?propertyId=${property.id}&limit=2000`
      : `/api/calendar/sync?limit=5000`;
    fetch(url, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setEvents(Array.isArray(data.events) ? data.events : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [property, targetIdsKey, targetProperties.length]);

  const allStays: NormalizedStay[] = useMemo(() => {
    const out: NormalizedStay[] = [];
    for (const p of targetProperties) {
      out.push(...buildStaysForProperty(p, events));
    }
    return out;
  }, [targetProperties, events]);

  const buckets = useMemo(() => {
    if (!rangeFrom || !rangeTo) return [];
    const b = buildMonthRange(rangeFrom, rangeTo);
    fillBuckets(b, allStays);
    return b;
  }, [allStays, rangeFrom, rangeTo]);

  // Exclusive end of the range's future portion — the "upcoming nights"
  // and "cleanings ahead" KPIs count stays inside (today, futureEndDate).
  const futureEndDate = useMemo(() => {
    const d = new Date(rangeTo + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d;
  }, [rangeTo]);

  const applyPreset = (p: PeriodChoice) => {
    const r = presetRange(p, allStays, today);
    setRangeFrom(r.from);
    setRangeTo(r.to);
    setPeriodChoice(p);
  };

  // The visible range, shown in the chart header so a period change is
  // obvious even when the extended months are empty.
  const rangeLabel = useMemo(() => {
    if (!rangeFrom || !rangeTo) return "";
    const f = new Date(rangeFrom + "T00:00:00");
    const t = new Date(rangeTo + "T00:00:00");
    const fmt = new Intl.DateTimeFormat(
      locale === "en" ? "en-US" : locale === "pt" ? "pt-BR" : "es-ES",
      { month: "short", year: "numeric" },
    );
    return `${fmt.format(f)} – ${fmt.format(t)}`;
  }, [rangeFrom, rangeTo, locale]);

  // Months between today and the range's `to` — the KPI subtitle for
  // "upcoming nights" follows the active range instead of a hardcoded 6.
  const futureMonthsInRange = useMemo(() => {
    if (!rangeTo) return FUTURE_MONTHS;
    const t = new Date(rangeTo + "T00:00:00");
    const d = new Date();
    return Math.max(0, (t.getFullYear() - d.getFullYear()) * 12 + (t.getMonth() - d.getMonth()));
  }, [rangeTo]);

  const propertyKpis: PropertyKpis[] = useMemo(() => {
    return targetProperties.map((p) => computePropertyKpis(p, allStays, buckets, futureEndDate));
  }, [targetProperties, allStays, buckets, futureEndDate]);

  const aggregate = useMemo(() => {
    let pastNights = 0;
    let pastDays = 0;
    let upcomingNights = 0;
    let totalBookings = 0;
    let pastBookings = 0;
    let cleaningsUpcoming = 0;
    let totalNightsAllTime = 0;
    const perPlatform = new Map<string, number>();
    for (const k of propertyKpis) {
      pastNights += k.pastNights;
      pastDays += k.pastDays;
      upcomingNights += k.upcomingNights;
      totalBookings += k.totalBookings;
      pastBookings += k.pastBookings;
      cleaningsUpcoming += k.cleaningsUpcoming;
      totalNightsAllTime += k.avgStayNights * k.totalBookings;
    }
    // Per-platform totals derived from the VISIBLE buckets only. This
    // keeps the "Top source" pill consistent with what the user is
    // looking at — if the window is "Last 3 months" the source pill
    // reflects the 3-month winner, not all-time. Earlier the aggregate
    // used `allStays` (all-time) and the pill said "Booking" while the
    // chart only showed Airbnb because the user's Booking history fell
    // outside the visible window.
    for (const b of buckets) {
      for (const [slug, n] of Object.entries(b.perPlatform)) {
        perPlatform.set(slug, (perPlatform.get(slug) ?? 0) + n);
      }
    }
    const pastOccupancy = pastDays > 0 ? Math.round((100 * pastNights) / pastDays) : 0;
    const avgStayNights =
      totalBookings > 0 ? Math.round((totalNightsAllTime / totalBookings) * 10) / 10 : 0;
    let topPlatform: PlatformMeta | null = null;
    let topNights = 0;
    for (const [slug, n] of perPlatform) {
      if (n > topNights) {
        topNights = n;
        topPlatform = platformMeta(slug);
      }
    }
    return {
      pastNights,
      pastDays,
      pastOccupancy,
      upcomingNights,
      totalBookings,
      pastBookings,
      cleaningsUpcoming,
      avgStayNights,
      topPlatform,
    };
  }, [propertyKpis, buckets]);

  const activePlatforms = useMemo(() => {
    const totals = new Map<string, number>();
    for (const b of buckets) {
      for (const [slug, nights] of Object.entries(b.perPlatform)) {
        totals.set(slug, (totals.get(slug) ?? 0) + nights);
      }
    }
    const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    return entries.map(([slug]) => platformMeta(slug));
  }, [buckets]);

  const chartData = useMemo(
    () =>
      buckets.map((b) => {
        const row: Record<string, string | number | boolean> = {
          label: b.label,
          isPast: b.isPast,
          isCurrent: b.isCurrent,
          totalDays: b.totalDays,
        };
        for (const platform of activePlatforms) {
          row[platform.slug] = b.perPlatform[platform.slug] ?? 0;
        }
        return row;
      }),
    [buckets, activePlatforms],
  );

  // Auto y-axis: round up to next multiple of 5 above the busiest month
  // OR cap at typical max-month-days for visual stability.
  const yAxisMax = useMemo(() => {
    let maxNights = 0;
    for (const b of buckets) {
      const sum = Object.values(b.perPlatform).reduce((a, n) => a + n, 0);
      if (sum > maxNights) maxNights = sum;
    }
    const baseline = isMulti ? targetProperties.length * 31 : 31;
    // Don't shrink below the natural single-property month length so
    // the visual scale stays comparable across months. Round up to the
    // nearest 5 above the actual peak so labels read cleanly.
    return Math.max(baseline, Math.ceil((maxNights + 2) / 5) * 5);
  }, [buckets, isMulti, targetProperties.length]);

  const downloadCsv = () => {
    const params = new URLSearchParams();
    // Always send the active range so the CSV matches the table/chart —
    // the export and the on-screen report can never drift apart.
    if (rangeFrom) params.set("from", rangeFrom);
    if (rangeTo) params.set("to", rangeTo);
    if (property) params.set("propertyId", String(property.id));
    const qs = params.toString();
    window.location.href = `/api/reservations/export${qs ? `?${qs}` : ""}`;
  };

  // Today's column — used by ReferenceLine to show the "now" boundary.
  const currentBucketLabel = useMemo(() => {
    const now = new Date();
    const key = ymKey(now.getFullYear(), now.getMonth());
    return buckets.find((b) => b.key === key)?.label ?? null;
  }, [buckets]);

  const headerSubtitle = isMulti
    ? c.portfolioSubtitle(properties.length)
    : c.propertySubtitle(property!.name);

  const pastWindowLabel = useMemo(() => {
    const pastBuckets = buckets.filter((b) => b.isPast);
    if (pastBuckets.length === 0) return c.noDataYet;
    return c.pastWindow(pastBuckets.length);
  }, [buckets, c]);

  const noData = !loading && targetProperties.length > 0 && aggregate.totalBookings === 0;

  return (
    /* Calendar / cleaning-style two-column shell. Negative side margins
       escape the dashboard's <main> padding so the content lines up
       1:1 with the header; the inner max-w-[1760px] mx-auto matches
       the calendar exactly. */
    <div className="-mx-3 sm:-mx-6 lg:-mx-8">
      <div className="mx-auto max-w-[1760px] px-3 sm:px-5 flex flex-col lg:flex-row gap-6">
        {/* Mobile-only property switcher at the top of the page — on
            mobile the sidebar (with its own switcher) sits below the
            report, so without this the user has to scroll past the
            whole report to change scope. lg:hidden keeps it out of the
            desktop layout where the sidebar switcher is already visible. */}
        {properties.length > 1 && (
          <div className="lg:hidden">
            <PropertySwitcher
              properties={properties}
              selectedPropertyId={property?.id ?? null}
              view="reports"
              showAllOption
            />
          </div>
        )}
        <div className="min-w-0 lg:flex-1 space-y-4">
          {/* Título de vista omitido — ya está en el navbar. */}
          {targetProperties.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface-raised p-6 text-center text-caption text-text-faint">
              {c.noProperties}
            </div>
          ) : (
            <>
              {/* KPI strip — past-based occupancy is the only honest %;
                  upcoming is shown as raw nights so it doesn't get
                  conflated with "we're 30% full forever" anxiety. */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  label={c.pastOccupancy}
                  value={`${aggregate.pastOccupancy}%`}
                  subtitle={pastWindowLabel}
                  accent
                />
                <KpiCard
                  label={c.upcomingNights}
                  value={aggregate.upcomingNights}
                  subtitle={c.upcomingNightsSubtitle(futureMonthsInRange)}
                />
                <KpiCard
                  label={c.bookings}
                  value={aggregate.totalBookings}
                  subtitle={
                    aggregate.avgStayNights > 0
                      ? c.avgNights(aggregate.avgStayNights)
                      : c.allTime
                  }
                />
                <KpiCard
                  label={c.cleaningsAhead}
                  value={aggregate.cleaningsUpcoming}
                  subtitle={c.cleaningsAheadSubtitle}
                />
              </div>

              {/* Top-platform readout — colored pill matches calendar bars. */}
              {aggregate.topPlatform && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <span>{c.topSource}</span>
                  <Chip
                    tone="brand"
                    size="lg"
                    className="font-semibold"
                    style={{ backgroundColor: aggregate.topPlatform.color }}
                  >
                    {aggregate.topPlatform.label}
                  </Chip>
                </div>
              )}

              {/* Chart — past months muted via opacity so the eye lands
                  on the actionable upcoming window. ReferenceLine marks
                  "now". Custom legend renders colored pills (the default
                  Recharts legend's "Booking #003580" text was illegible
                  on dark theme). */}
              <div className="min-w-0 rounded-xl border border-border bg-surface-raised p-4 text-text-muted">
                <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-text-muted font-medium">
                    {rangeLabel}
                  </span>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                      <CartesianGrid stroke="currentColor" strokeOpacity={0.16} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "currentColor", fontSize: 13 }}
                        axisLine={{ stroke: "currentColor", strokeOpacity: 0.18 }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "currentColor", fontSize: 13 }}
                        axisLine={{ stroke: "currentColor", strokeOpacity: 0.18 }}
                        tickLine={false}
                        domain={[0, yAxisMax]}
                        unit={c.yAxisUnit}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--m-accent)", fillOpacity: 0.06 }}
                        contentStyle={{
                          background: "var(--bg)",
                          border: "1px solid var(--line-2)",
                          borderRadius: 10,
                          color: "var(--ink)",
                          fontSize: 14,
                          boxShadow: "0 4px 16px -8px rgba(0,0,0,0.18)",
                        }}
                        itemStyle={{ color: "var(--ink)" }}
                        labelStyle={{ color: "var(--ink-3)", fontWeight: 500 }}
                        formatter={(value, name) => {
                          const meta = activePlatforms.find((p) => p.slug === name);
                          const label = meta?.label ?? String(name);
                          return [`${value} ${c.tooltipUnit}`, label];
                        }}
                      />
                      {currentBucketLabel && (
                        <ReferenceLine
                          x={currentBucketLabel}
                          stroke="var(--m-accent)"
                          strokeOpacity={0.5}
                          strokeDasharray="4 4"
                          label={{
                            value: c.now,
                            // insideTop (not "top") so the label sits inside
                            // the plot area instead of getting clipped at
                            // the chart's top edge (B6).
                            position: "insideTop",
                            offset: 4,
                            fill: "var(--m-accent)",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        />
                      )}
                      {activePlatforms.map((p, idx) => (
                        <Bar
                          key={p.slug}
                          dataKey={p.slug}
                          stackId="src"
                          fill={p.color}
                          radius={idx === activePlatforms.length - 1 ? [4, 4, 0, 0] : 0}
                        >
                          {chartData.map((row, i) => (
                            <Cell
                              key={`c-${i}-${p.slug}`}
                              fillOpacity={row.isPast ? 0.55 : 1}
                            />
                          ))}
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Custom legend — colored pills with white text, padded
                    enough to read against any theme. Replaces Recharts'
                    default tiny-square + neutral-text legend that hid
                    Booking's #003580 against dark backgrounds. */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activePlatforms.map((p) => (
                    <Chip
                      key={p.slug}
                      tone="brand"
                      size="lg"
                      className="py-0.5 font-semibold"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.label}
                    </Chip>
                  ))}
                  {/* Past/upcoming legend swatch */}
                  {buckets.some((b) => b.isPast) && (
                    <>
                      <Chip tone="neutral" size="md" className="ml-2" leading={<span className="inline-block h-2 w-3 rounded-sm bg-text-muted/55" />}>
                        {c.past}
                      </Chip>
                      <Chip tone="neutral" size="md" leading={<span className="inline-block h-2 w-3 rounded-sm bg-text-muted" />}>
                        {c.upcoming}
                      </Chip>
                    </>
                  )}
                </div>

                {noData && (
                  <p className="mt-3 text-center text-caption text-text-faint">
                    {c.noBookings}
                  </p>
                )}
                {loading && (
                  <p className="mt-3 text-center text-caption text-text-faint">
                    {c.loading}
                  </p>
                )}
              </div>

              {/* Per-property summary — only meaningful in multi-property
                  mode. Sorted by past occupancy desc so the busiest
                  property surfaces first; click-through scopes to that
                  property's report. */}
              {isMulti && propertyKpis.length > 0 && (
                <div className="rounded-xl border border-border bg-surface-raised overflow-hidden">
                  <div className="border-b border-border px-4 py-3">
                    <h2 className="text-sm font-semibold text-text-primary">
                      {c.byProperty}
                    </h2>
                    <p className="mt-0.5 text-sm text-text-faint">
                      {c.byPropertyHint}
                    </p>
                  </div>
                  {/* overflow-x-auto wrapper so the 6-column table can
                      horizontally scroll on phones rather than being
                      clipped by the rounded panel's overflow-hidden.
                      Property + Past Occ % + Upcoming nights are
                      enough to scan a property at a glance, and the
                      remaining columns are reachable by swiping the
                      table left. */}
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={cn("border-b border-border", eyebrowVariants({ variant: "tag" }))}>
                      <tr>
                        <th className="px-3 py-2 text-left font-medium sm:px-4">{c.colProperty}</th>
                        <th className="px-3 py-2 text-right font-medium sm:px-4">{c.colPastOcc}</th>
                        <th className="px-3 py-2 text-right font-medium sm:px-4">{c.colUpcoming}</th>
                        <th className="px-3 py-2 text-right font-medium sm:px-4">{c.colBookings}</th>
                        <th className="px-3 py-2 text-right font-medium sm:px-4">{c.colCleanings}</th>
                        <th className="px-3 py-2 text-left font-medium hidden sm:table-cell sm:px-4">{c.colTopSource}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...propertyKpis]
                        .sort((a, b) => b.pastOccupancy - a.pastOccupancy)
                        .map((k) => (
                          <tr key={k.property.id} className="border-b border-border/50 last:border-0 hover:bg-surface-hover">
                            <td className="px-3 py-2.5 text-text-primary font-medium sm:px-4">
                              <Link href={`/dashboard?property=${k.property.id}&view=reports`} className="hover:underline">
                                {k.property.name}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 text-right text-text-secondary tabular-nums sm:px-4">{k.pastOccupancy}%</td>
                            <td className="px-3 py-2.5 text-right text-text-secondary tabular-nums sm:px-4">{k.upcomingNights}</td>
                            <td className="px-3 py-2.5 text-right text-text-secondary tabular-nums sm:px-4">{k.totalBookings}</td>
                            <td className="px-3 py-2.5 text-right text-text-secondary tabular-nums sm:px-4">{k.cleaningsUpcoming}</td>
                            <td className="px-3 py-2.5 hidden sm:table-cell sm:px-4">
                              {k.topPlatform ? (
                                <Chip
                                  tone="brand"
                                  size="md"
                                  className="font-semibold"
                                  style={{ backgroundColor: k.topPlatform.color }}
                                >
                                  {k.topPlatform.label}
                                </Chip>
                              ) : (
                                <span className="text-sm text-text-faint">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar — same shape as the calendar / cleaning sidebars.
            Borderless rounded panel with a soft shadow; lg:top-3 for
            breathing room from the global header. */}
        <aside className="w-full lg:w-[360px] lg:shrink-0 lg:sticky lg:top-3 lg:self-start lg:max-h-[calc(100vh-84px)] rounded-2xl bg-surface shadow-[0_1px_3px_-1px_rgba(0,0,0,0.04),0_4px_16px_-8px_rgba(0,0,0,0.06)] [overflow:clip]">
          {/* Period selector — controls the past-window of the chart
              and every KPI that depends on it. Default 6 months back +
              6 forward (the original window). "All" stretches back to
              the earliest stay in the DB so historical-only data
              becomes visible — needed because past stays in iCal feeds
              age out, and once they do, the only way to see them is to
              widen the past window of our own DB snapshot. */}
          {/* Period — the range [De, Até] is the single source of truth
              for chart + table + KPIs + CSV. The presets (Predefinições)
              are shortcuts that set the range; editing De/Até overrides
              them (and clears the active-preset highlight). */}
          <div className="border-b border-border px-5 py-4 space-y-3">
            <div className="text-eyebrow">
              {c.period}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="report-range-from" className="text-caption">
                  {c.fromLabel}
                </label>
                <input
                  id="report-range-from"
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => { setRangeFrom(e.target.value); setPeriodChoice(null); }}
                  className="h-9 rounded-md border border-border-strong bg-surface-raised px-2 text-sm text-text-primary outline-none focus:border-text-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="report-range-to" className="text-caption">
                  {c.toLabel}
                </label>
                <input
                  id="report-range-to"
                  type="date"
                  value={rangeTo}
                  onChange={(e) => { setRangeTo(e.target.value); setPeriodChoice(null); }}
                  className="h-9 rounded-md border border-border-strong bg-surface-raised px-2 text-sm text-text-primary outline-none focus:border-text-primary"
                />
              </div>
            </div>
            <div className="text-caption">
              {c.presets}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {([3, 6, 12, 24, "all"] as PeriodChoice[]).map((p) => {
                const active = periodChoice === p;
                const label = p === "all" ? c.allPeriod : c.monthsLabel(p);
                return (
                  <button
                    key={String(p)}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`h-8 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-action-primary text-action-primary-fg"
                        : "bg-surface-raised text-text-secondary hover:bg-surface-hover"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-text-faint leading-relaxed">
              {c.periodHelp}
            </p>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="text-eyebrow">
              {c.exportTitle}
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              {property ? c.exportingProperty(property.name) : c.exportingAll(properties.length)}
            </p>
            <button
              onClick={downloadCsv}
              disabled={targetProperties.length === 0}
              className="h-9 w-full rounded-md bg-action-primary px-3 text-sm font-medium text-action-primary-fg hover:bg-action-primary-hover disabled:opacity-40 transition-colors"
            >
              {c.downloadCsv}
            </button>
            <p className="text-caption leading-relaxed">
              {c.exportHelp}
            </p>
          </div>

          {/* Notes about data sources — surfaces the reality that iCal
              feeds prune past stays, so historical numbers improve over
              time as the DB accumulates its own snapshot. */}
          <div className="border-t border-border px-5 py-4">
            <div className={cn("mb-1.5", eyebrowVariants({ variant: "section" }))}>
              {c.dataSources}
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              {c.dataSourcesHelp}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
