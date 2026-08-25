"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveRefresh } from "@/lib/use-live-refresh";
import { CleaningSchedule, type CleanerAssignmentInfo } from "@/components/cleaning-schedule";
import { PropertySwitcher } from "@/components/property-switcher";
import { useIncludePotential } from "@/lib/use-include-potential";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { eyebrowVariants } from "@/components/ui/atoms/eyebrow";
import type { Locale } from "@/lib/i18n/translations";
import type { Property, CalendarLink, DateOverride } from "@/lib/types";

interface CopyShape {
  emptyState: string;
  cleaning: string;
  acrossAllProperties: (count: number) => string;
  allPropertiesLabel: (count: number) => string;
  view: string;
  potentialHelper: string;
  dataSources: string;
  dataSourcesHelper: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    emptyState: "Add a property to see the cleaning schedule.",
    cleaning: "Cleaning",
    acrossAllProperties: (count) =>
      `Across all ${count} ${count === 1 ? "property" : "properties"}`,
    allPropertiesLabel: (count) => `All properties (${count})`,
    view: "View",
    potentialHelper: "Cleanings that only matter if a gap-fill guest books.",
    dataSources: "Data sources",
    dataSourcesHelper:
      "Schedule is computed from your reservations + iCal events, deduped. Property names appear in each row when copying / printing.",
  },
  pt: {
    emptyState: "Adicione uma propriedade para ver o calendário de limpezas.",
    cleaning: "Limpeza",
    acrossAllProperties: (count) =>
      `Em todas as ${count} ${count === 1 ? "propriedade" : "propriedades"}`,
    allPropertiesLabel: (count) => `Todas as propriedades (${count})`,
    view: "Vista",
    potentialHelper:
      "Limpezas que só importam se um hóspede reservar o espaço intermediário.",
    dataSources: "Fontes de dados",
    dataSourcesHelper:
      "O calendário é calculado a partir das suas reservas + eventos iCal, deduplicados. O nome da propriedade aparece em cada linha ao copiar / imprimir.",
  },
  es: {
    emptyState: "Añada un alojamiento para ver el calendario de limpiezas.",
    cleaning: "Limpieza",
    acrossAllProperties: (count) =>
      `En todos los ${count} ${count === 1 ? "alojamiento" : "alojamientos"}`,
    allPropertiesLabel: (count) => `Todos los alojamientos (${count})`,
    view: "Vista",
    potentialHelper:
      "Limpiezas que solo importan si un huésped reserva el hueco intermedio.",
    dataSources: "Fuentes de datos",
    dataSourcesHelper:
      "El calendario se calcula a partir de sus reservas + eventos iCal, deduplicados. El nombre del alojamiento aparece en cada línea al copiar / imprimir.",
  },
};

// Sidebar carries the View toggle (include-potential) + a Data
// sources note. Copy + Print live inline in the schedule's table
// header so the host can grab the export with one tap; the toggle
// lives here so view-state stays grouped with future settings.

interface CalendarEvent {
  id: number;
  platform: string;
  summary: string;
  startDate: string;
  endDate: string;
}

interface GlobalCleaningViewProps {
  properties: Property[];
}

/**
 * Cross-property cleaning view rendered when activeView === "cleaning"
 * AND no property is selected. Schedule is fullwidth — controls
 * (Include-potential / Copy / Print) live inline in the schedule's
 * table header so the host can grab the export with one tap. The
 * per-property master toggle + Cleaners panel are intentionally not
 * here — those belong to PropertyCleaningView.
 */
export function GlobalCleaningView({ properties }: GlobalCleaningViewProps) {
  const { t, locale } = useI18n();
  const c = COPY[locale];
  const [syncedEvents, setSyncedEvents] = useState<Record<number, CalendarEvent[]>>({});
  const [links, setLinks] = useState<Record<number, CalendarLink[]>>({});
  const [overrides, setOverrides] = useState<Record<number, DateOverride[]>>({});
  const [assignmentsByProperty, setAssignmentsByProperty] = useState<Record<number, CleanerAssignmentInfo[]>>({});
  const [includePotential, setIncludePotential] = useIncludePotential();
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (properties.length === 0) {
      setSyncedEvents({});
      setLinks({});
      setOverrides({});
      setAssignmentsByProperty({});
      return;
    }
    type AssignmentRow = {
      cleanerProfileId: number;
      cleanerName: string | null;
      priority: number;
    };
    const results = await Promise.all(
      properties.map(async (p) => {
        const [syncRes, linksRes, ovRes, asgRes] = await Promise.all([
          fetch(`/api/calendar/sync?propertyId=${p.id}&limit=200`).then((r) => r.json()),
          fetch(`/api/calendar/links?propertyId=${p.id}`).then((r) => r.json()),
          fetch(`/api/date-overrides?propertyId=${p.id}`).then((r) => r.json()),
          fetch(`/api/cleaner-assignments?propertyId=${p.id}`).then((r) => (r.ok ? r.json() : [])),
        ]);
        const list: AssignmentRow[] = Array.isArray(asgRes) ? asgRes : [];
        const assignments = list
          .map((a): CleanerAssignmentInfo | null => {
            const name = a.cleanerName;
            if (!name) return null;
            const identityKey = a.cleanerProfileId != null
              ? `p:${a.cleanerProfileId}`
              : `n:${name}`;
            return { identityKey, name, priority: a.priority ?? 0 };
          })
          .filter((x): x is CleanerAssignmentInfo => x !== null)
          .sort((a, b) => a.priority - b.priority);
        return {
          id: p.id,
          events: (syncRes.events || []) as CalendarEvent[],
          links: (linksRes || []) as CalendarLink[],
          overrides: (ovRes || []) as DateOverride[],
          assignments,
        };
      })
    ).catch(() => []);
    const evMap: Record<number, CalendarEvent[]> = {};
    const lnMap: Record<number, CalendarLink[]> = {};
    const ovMap: Record<number, DateOverride[]> = {};
    const asgMap: Record<number, CleanerAssignmentInfo[]> = {};
    for (const r of results) {
      evMap[r.id] = r.events;
      lnMap[r.id] = r.links;
      ovMap[r.id] = r.overrides;
      if (r.assignments.length > 0) asgMap[r.id] = r.assignments;
    }
    setSyncedEvents(evMap);
    setLinks(lnMap);
    setOverrides(ovMap);
    setAssignmentsByProperty(asgMap);
    setLoading(false);
  }, [properties]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate fetch-on-mount pattern; setState happens inside the async callback
    fetchData();
  }, [fetchData]);

  // Multi-manager visibility — see use-live-refresh.ts for rationale.
  useLiveRefresh(fetchData);

  if (properties.length === 0) {
    return (
      <div className="-mx-3 sm:-mx-6 lg:-mx-8">
        <div className="mx-auto max-w-[1760px] px-3 sm:px-5">
          <div className="rounded-xl border border-border bg-surface-raised p-6 text-center text-caption text-text-faint">
            {c.emptyState}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-3 sm:-mx-6 lg:-mx-8">
      <div className="mx-auto max-w-[1760px] px-3 sm:px-5 flex flex-col lg:flex-row gap-6">
        {/* Mobile-only property switcher at the top of the page — on
            mobile the sidebar (with its own switcher) sits below the
            schedule, so without this the user has to scroll past the
            whole table to change scope. lg:hidden keeps it out of the
            desktop layout where the sidebar switcher is already visible. */}
        {properties.length > 1 && (
          <div className="lg:hidden">
            <PropertySwitcher
              properties={properties}
              selectedPropertyId={null}
              view="cleaning"
              showAllOption
            />
          </div>
        )}
        <div className="min-w-0 lg:flex-1 space-y-3">
          {/* Título de vista omitido — ya está en el navbar. */}
          <CleaningSchedule
            properties={properties}
            syncedEvents={syncedEvents}
            links={links}
            overrides={overrides}
            mode="dashboard"
            onOverrideChanged={fetchData}
            includePotential={includePotential}
            onIncludePotentialChange={setIncludePotential}
            cleanerAssignments={assignmentsByProperty}
            loading={loading}
          />
        </div>

        {/* Sidebar — View options + a Data sources note. Copy + Print
            moved to the schedule's table header. Same shell + soft
            shadow as PropertyCleaningView's sidebar so the cleaning
            surface looks consistent across the two scopes. */}
        <aside className="w-full lg:w-[360px] lg:shrink-0 lg:sticky lg:top-3 lg:self-start lg:max-h-[calc(100vh-84px)] rounded-2xl bg-surface shadow-[0_1px_3px_-1px_rgba(0,0,0,0.04),0_4px_16px_-8px_rgba(0,0,0,0.06)] [overflow:clip]">
          <div className="border-b border-border px-5 py-4">
            <div className={cn("mb-2.5", eyebrowVariants({ variant: "section" }))}>
              {c.view}
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includePotential}
                onChange={(e) => setIncludePotential(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border-strong accent-action-primary cursor-pointer"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text-primary">
                  {t("cleaning.includePotential")}
                </span>
                <span className="mt-0.5 block text-caption leading-relaxed">
                  {c.potentialHelper}
                </span>
              </span>
            </label>
          </div>

          <div className="px-5 py-4">
            <div className={cn("mb-1.5", eyebrowVariants({ variant: "section" }))}>
              {c.dataSources}
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              {c.dataSourcesHelper}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
