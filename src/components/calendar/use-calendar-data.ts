import { useMemo } from "react";
import type { Property, CalendarLink, DateOverride, Reservation } from "@/lib/types";
import { buildCalendarDataCore, buildCalendarBars } from "@/lib/calendar-data-core";
import type { CalendarEvent, CalendarBar, ConflictInfo } from "./types";

export interface CalendarData {
  airbnbDates: Set<string>;
  bookingDates: Set<string>;
  bufferDates: Set<string>;
  potentialDates: Set<string>;
  unbookableDates: Set<string>;
  sameDayCleaningDates: Set<string>;
  conflictDates: Set<string>;
  conflicts: ConflictInfo[];
  bars: CalendarBar[];
  openOverrides: Set<string>;
  closedOverrides: Set<string>;
  /** Dates where the host has manually scheduled a cleaning. Behaves
   *  like a closed override (no bookings) but renders a distinct
   *  "Manual cleaning" chip so the host can tell their own scheduled
   *  cleanings apart from generic blocks or auto-detected buffers. */
  cleaningOverrides: Set<string>;
  dateToReservation: Map<string, Reservation>;
}

export function useCalendarData(
  property: Property,
  syncedEvents: CalendarEvent[],
  links: CalendarLink[],
  overrides: DateOverride[]
): CalendarData {
  const { openOverrides, closedOverrides, cleaningOverrides } = useMemo(() => {
    const open = new Set<string>();
    const closed = new Set<string>();
    const cleaning = new Set<string>();
    for (const o of overrides) {
      if (o.type === "open") open.add(o.date);
      else if (o.type === "closed") closed.add(o.date);
      else if (o.type === "cleaning") cleaning.add(o.date);
    }
    return { openOverrides: open, closedOverrides: closed, cleaningOverrides: cleaning };
  }, [overrides]);

  const computed = useMemo(
    () =>
      buildCalendarDataCore(
        property,
        syncedEvents,
        links,
        openOverrides,
        closedOverrides,
      ),
    [
      syncedEvents,
      property.reservations,
      links,
      property.minNights,
      property.bookingWindow,
      property.cleaningEnabled,
      openOverrides,
      closedOverrides,
    ],
  );

  const bars = useMemo(
    () => buildCalendarBars(computed.dateToEvent, property.reservations, syncedEvents),
    [computed.dateToEvent, property.reservations, syncedEvents],
  );

  // when the toggle is off, suppress manual cleaning chips
  // too so the calendar reads as "bookings only". Data is preserved
  // (cleaningOverrides survive in the date-overrides table); the chips
  // come back when the toggle is flipped on.
  const visibleCleaningOverrides =
    property.cleaningEnabled === false ? new Set<string>() : cleaningOverrides;

  return {
    airbnbDates: computed.airbnbDates,
    bookingDates: computed.bookingDates,
    bufferDates: computed.bufferDates,
    potentialDates: computed.potentialDates,
    unbookableDates: computed.unbookableDates,
    sameDayCleaningDates: computed.sameDayCleaningDates,
    cleaningOverrides: visibleCleaningOverrides,
    conflictDates: computed.conflictDates,
    conflicts: computed.conflicts,
    bars,
    openOverrides,
    closedOverrides,
    dateToReservation: computed.dateToReservation,
  };
}
