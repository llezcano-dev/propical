/**
 * Pure-function core of useCalendarData: given property, synced events,
 * links, and overrides, computes all the calendar's date sets and event/
 * reservation maps. The hook (useCalendarData) wraps this in a useMemo with
 * the correct dependency array; the function itself is stateless and fully
 * testable in unit tests without React or a DOM.
 */

import type { Property, CalendarLink, Reservation } from "@/lib/types";
import { bookingWindowCutoff } from "@/lib/types";
import { toUtcDateStr, addDaysStr } from "@/components/calendar/utils";
import type { CalendarEvent, CalendarBar, ConflictInfo } from "@/components/calendar/types";

export interface CalendarDataCore {
  airbnbDates: Set<string>;
  bookingDates: Set<string>;
  bufferDates: Set<string>;
  potentialDates: Set<string>;
  unbookableDates: Set<string>;
  sameDayCleaningDates: Set<string>;
  conflictDates: Set<string>;
  conflicts: ConflictInfo[];
  /** Composite-key Map: `<startDate>|<platform>` → event/bar payload. */
  dateToEvent: Map<
    string,
    {
      name: string;
      platform: string;
      startDate: string;
      endDate: string;
      reservationId?: number;
      eventUid?: string;
      linkedEventUid?: string;
    }
  >;
  /** Date → Reservation lookup (for per-cell guest-name resolution). */
  dateToReservation: Map<string, Reservation>;
}

export function buildCalendarDataCore(
  property: Property,
  syncedEvents: CalendarEvent[],
  links: CalendarLink[],
  openOverrides: Set<string>,
  closedOverrides: Set<string>,
): CalendarDataCore {
  const airbnb = new Set<string>();
  const booking = new Set<string>();
  const buffer = new Set<string>();
  const sameDayCleaning = new Set<string>();
  const potential = new Set<string>();
  const unbookable = new Set<string>();
  const conflictSet = new Set<string>();
  const evMap = new Map<
    string,
    {
      name: string;
      platform: string;
      startDate: string;
      endDate: string;
      reservationId?: number;
      eventUid?: string;
      linkedEventUid?: string;
    }
  >();
  const resMap = new Map<string, Reservation>();
  const allBooked = new Set<string>();
  const airbnbStay = new Set<string>();
  const bookingStay = new Set<string>();

  const allBookings: {
    start: string;
    end: string;
    platform: string;
    name: string;
  }[] = [];
  const cutoff = bookingWindowCutoff(property.bookingWindow || 365);

  // ---- synced iCal events ----
  for (const ev of syncedEvents) {
    if (ev.startDate >= cutoff) continue;
    const platform = ev.platform;
    const dates = platform === "airbnb" ? airbnb : booking;
    const stayDates = platform === "airbnb" ? airbnbStay : bookingStay;
    let d = ev.startDate;
    while (d <= ev.endDate) {
      dates.add(d);
      allBooked.add(d);
      d = addDaysStr(d, 1);
    }
    d = ev.startDate;
    while (d < ev.endDate) {
      stayDates.add(d);
      d = addDaysStr(d, 1);
    }
    const evKey = `${ev.startDate}|${platform}`;
    if (!evMap.has(evKey)) {
      evMap.set(evKey, {
        name: ev.summary || "Reserved",
        platform,
        startDate: ev.startDate,
        endDate: ev.endDate,
        eventUid: ev.uid,
      });
    }
    const isAirbnbBlock =
      platform === "airbnb" &&
      (ev.summary.includes("Not available") ||
        ev.summary.includes("Blocked"));
    if (!isAirbnbBlock) {
      allBookings.push({
        start: ev.startDate,
        end: ev.endDate,
        platform,
        name: ev.summary,
      });
    }
  }

  // ---- manual reservations ----
  for (const res of property.reservations) {
    const start = toUtcDateStr(new Date(res.checkIn));
    const end = toUtcDateStr(new Date(res.checkOut));
    const platform = res.platform || "airbnb";

    let matchingEventStart: string | null = null;
    for (const [evStart, ev] of evMap) {
      if (ev.platform !== platform) continue;
      if (ev.startDate < end && ev.endDate > start) {
        matchingEventStart = evStart;
        break;
      }
    }

    if (matchingEventStart) {
      const ev = evMap.get(matchingEventStart)!;
      const matchedAirbnbBlock =
        ev.platform === "airbnb" &&
        ((ev.name || "").includes("Not available") ||
          (ev.name || "").includes("Blocked"));

      const unionStart = ev.startDate < start ? ev.startDate : start;
      const unionEnd = ev.endDate > end ? ev.endDate : end;
      evMap.set(matchingEventStart, {
        ...ev,
        name: res.name,
        reservationId: res.id,
        startDate: unionStart,
        endDate: unionEnd,
      });
      let d = unionStart;
      while (d <= unionEnd) {
        resMap.set(d, res);
        d = addDaysStr(d, 1);
      }
      const platformDates =
        ev.platform === "airbnb"
          ? airbnb
          : ev.platform === "booking"
            ? booking
            : airbnb;
      const platformStayDates =
        ev.platform === "airbnb" ? airbnbStay : bookingStay;
      let bd = unionStart;
      while (bd <= unionEnd) {
        platformDates.add(bd);
        allBooked.add(bd);
        bd = addDaysStr(bd, 1);
      }
      bd = unionStart;
      while (bd < unionEnd) {
        platformStayDates.add(bd);
        bd = addDaysStr(bd, 1);
      }
      if (matchedAirbnbBlock) {
        allBookings.push({
          start: unionStart,
          end: unionEnd,
          platform,
          name: res.name,
        });
      }
    } else {
      const dates =
        platform === "airbnb"
          ? airbnb
          : platform === "booking"
            ? booking
            : airbnb;
      const stayDates =
        platform === "airbnb" ? airbnbStay : bookingStay;
      let d = start;
      while (d <= end) {
        dates.add(d);
        allBooked.add(d);
        resMap.set(d, res);
        d = addDaysStr(d, 1);
      }
      d = start;
      while (d < end) {
        stayDates.add(d);
        d = addDaysStr(d, 1);
      }
      evMap.set(`${start}|${platform}`, {
        name: res.name,
        platform,
        startDate: start,
        endDate: end,
        reservationId: res.id,
        linkedEventUid: res.linkedEventUid ?? undefined,
      });
      allBookings.push({ start, end, platform, name: res.name });
    }
  }

  // ---- conflict detection ----
  const conflictList: ConflictInfo[] = [];
  for (const d of airbnbStay) {
    if (bookingStay.has(d)) {
      conflictSet.add(d);
    }
  }
  if (conflictSet.size > 0) {
    for (const d of conflictSet) {
      const abEvent = syncedEvents.find(
        (e) =>
          e.platform === "airbnb" && d >= e.startDate && d < e.endDate,
      );
      const bkEvent = syncedEvents.find(
        (e) =>
          e.platform === "booking" && d >= e.startDate && d < e.endDate,
      );
      conflictList.push({
        date: d,
        airbnbName: abEvent?.summary || "Airbnb booking",
        bookingName: bkEvent?.summary || "Booking reservation",
      });
    }
  }

  // cleaning disabled: skip all cleaning-derived computations.
  if (property.cleaningEnabled === false) {
    return {
      airbnbDates: airbnb,
      bookingDates: booking,
      bufferDates: buffer,
      potentialDates: potential,
      unbookableDates: unbookable,
      sameDayCleaningDates: sameDayCleaning,
      conflictDates: conflictSet,
      dateToEvent: evMap,
      dateToReservation: resMap,
      conflicts: conflictList,
    };
  }

  // ---- buffer / potential / unbookable ----
  allBookings.sort((a, b) => a.start.localeCompare(b.start));
  const dedupedBookings: typeof allBookings = [];
  for (const b of allBookings) {
    const last = dedupedBookings[dedupedBookings.length - 1];
    if (last && b.start < last.end) {
      if (b.end > last.end) last.end = b.end;
    } else {
      dedupedBookings.push({ ...b });
    }
  }

  const minStay = property.minNights || 3;
  const skipBeforeFor = new Set<number>();
  const maxBefore = Math.max(0, ...links.map((l) => l.bufferBefore));
  const maxAfter = Math.max(0, ...links.map((l) => l.bufferAfter));

  for (let bi = 0; bi < dedupedBookings.length - 1; bi++) {
    const b = dedupedBookings[bi];
    const next = dedupedBookings[bi + 1];
    const gapStart = addDaysStr(b.end, 1);
    const gapDays = Math.max(
      0,
      Math.ceil(
        (new Date(next.start + "T12:00:00Z").getTime() -
          new Date(gapStart + "T12:00:00Z").getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    const neededForBooking = maxAfter + minStay + maxBefore;
    if (gapDays < neededForBooking) {
      skipBeforeFor.add(bi + 1);
    }
  }

  for (let bi = 0; bi < dedupedBookings.length; bi++) {
    const b = dedupedBookings[bi];
    const prev: (typeof dedupedBookings)[number] | null =
      bi > 0 ? dedupedBookings[bi - 1] : null;
    const next = dedupedBookings[bi + 1];

    if (skipBeforeFor.has(bi)) {
      // gap too small
    } else if (bi === 0 || !prev) {
      for (let i = 1; i <= maxBefore; i++) {
        const d = addDaysStr(b.start, -i);
        if (!allBooked.has(d)) buffer.add(d);
      }
    } else {
      const gapStart = addDaysStr(prev.end, 1);
      let gapHasBooking = false;
      let d = addDaysStr(gapStart, maxAfter);
      while (d < addDaysStr(b.start, -maxBefore)) {
        if (allBooked.has(d)) {
          gapHasBooking = true;
          break;
        }
        d = addDaysStr(d, 1);
      }
      if (gapHasBooking) {
        for (let i = 1; i <= maxBefore; i++) {
          const dd = addDaysStr(b.start, -i);
          if (!allBooked.has(dd)) buffer.add(dd);
        }
      } else {
        for (let i = 1; i <= maxBefore; i++) {
          const dd = addDaysStr(b.start, -i);
          if (!allBooked.has(dd)) potential.add(dd);
        }
      }
    }

    for (let i = 1; i <= maxAfter; i++) {
      const d = addDaysStr(b.end, i);
      if (!allBooked.has(d)) buffer.add(d);
    }

    if (next && skipBeforeFor.has(bi + 1)) {
      const cleanEnd = addDaysStr(b.end, maxAfter + 1);
      let d = cleanEnd;
      while (d < next.start) {
        if (!allBooked.has(d) && !buffer.has(d)) unbookable.add(d);
        d = addDaysStr(d, 1);
      }
    }
  }

  // ---- linked-extension boundary dates (no cleaning chip for same guest) ----
  const linkedBoundaryDates = new Set<string>();
  for (const res of property.reservations) {
    if (!res.linkedEventUid) continue;
    const ev = syncedEvents.find((e) => e.uid === res.linkedEventUid);
    if (!ev) continue;
    const resStart = toUtcDateStr(new Date(res.checkIn));
    const resEnd = toUtcDateStr(new Date(res.checkOut));
    if (resStart < ev.endDate && resEnd > ev.startDate) continue;
    if (resEnd === ev.startDate) linkedBoundaryDates.add(resEnd);
    else if (resStart === ev.endDate) linkedBoundaryDates.add(resStart);
  }

  // ---- sameDayCleaning ----
  if (maxBefore === 0 && maxAfter === 0) {
    const datesAbuttedByAirbnbBlockEnd = new Set<string>();
    for (const ev of syncedEvents) {
      const isAirbnbBlock =
        ev.platform === "airbnb" &&
        (ev.summary.includes("Not available") ||
          ev.summary.includes("Blocked"));
      if (isAirbnbBlock) datesAbuttedByAirbnbBlockEnd.add(ev.endDate);
    }

    for (let bi = 0; bi < dedupedBookings.length; bi++) {
      const b = dedupedBookings[bi];
      const next = dedupedBookings[bi + 1];
      if (!linkedBoundaryDates.has(b.end)) {
        sameDayCleaning.add(b.end);
      }

      if (next) {
        const gapStart = addDaysStr(b.end, 1);
        const gapDays = Math.max(
          0,
          Math.ceil(
            (new Date(next.start + "T12:00:00Z").getTime() -
              new Date(gapStart + "T12:00:00Z").getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        if (
          gapDays >= 1 &&
          gapDays >= minStay &&
          !linkedBoundaryDates.has(next.start) &&
          !datesAbuttedByAirbnbBlockEnd.has(next.start)
        ) {
          sameDayCleaning.add(next.start);
          potential.add(next.start);
        }
      }
    }
  }

  // ---- overrides ----
  for (const d of openOverrides) {
    buffer.delete(d);
    potential.delete(d);
    unbookable.delete(d);
    sameDayCleaning.delete(d);
  }
  for (const d of closedOverrides) {
    if (!allBooked.has(d)) {
      buffer.add(d);
    }
  }

  return {
    airbnbDates: airbnb,
    bookingDates: booking,
    bufferDates: buffer,
    potentialDates: potential,
    unbookableDates: unbookable,
    sameDayCleaningDates: sameDayCleaning,
    conflictDates: conflictSet,
    dateToEvent: evMap,
    dateToReservation: resMap,
    conflicts: conflictList,
  };
}

// ---- bar building (extracted from useCalendarData for testability) ----

export function buildCalendarBars(
  dateToEvent: Map<
    string,
    {
      name: string;
      platform: string;
      startDate: string;
      endDate: string;
      reservationId?: number;
      eventUid?: string;
      linkedEventUid?: string;
    }
  >,
  reservations: Reservation[],
  syncedEvents: CalendarEvent[],
): CalendarBar[] {
  const result: CalendarBar[] = [];
  const processed = new Set<string>();
  const allStarts = Array.from(dateToEvent.keys()).sort();

  for (const start of allStarts) {
    if (processed.has(start)) continue;
    const ev = dateToEvent.get(start)!;
    processed.add(start);

    let label = ev.name;
    let resId = ev.reservationId;
    const matchingResForExt = resId
      ? reservations.find((r) => r.id === resId)
      : undefined;

    let isExtension = false;
    const extLinkedUid = matchingResForExt?.linkedEventUid;
    if (extLinkedUid) {
      const linkedEv = syncedEvents.find((e) => e.uid === extLinkedUid);
      if (linkedEv) {
        const rStart = toUtcDateStr(new Date(matchingResForExt!.checkIn));
        const rEnd = toUtcDateStr(new Date(matchingResForExt!.checkOut));
        const overlapsLinked =
          linkedEv.startDate < rEnd && linkedEv.endDate > rStart;
        isExtension = !overlapsLinked;
      }
    }

    // Generic-iCal-summary detection
    const labelLower = label.toLowerCase();
    const isGenericSummary =
      !label ||
      labelLower.includes("reserved") ||
      labelLower.includes("closed") ||
      labelLower.includes("not available") ||
      labelLower.includes("blocked") ||
      labelLower.includes("fully booked") ||
      labelLower.includes("roomstatus") ||
      labelLower === "booked";
    if (isGenericSummary) {
      const matchingRes = reservations.find((r) => {
        const rStart = toUtcDateStr(new Date(r.checkIn));
        const rEnd = toUtcDateStr(new Date(r.checkOut));
        return rStart < ev.endDate && rEnd > ev.startDate;
      });
      if (matchingRes) {
        label = matchingRes.name;
        resId = matchingRes.id;
      } else {
        const brandLabels: Record<string, string> = {
          airbnb: "Airbnb",
          booking: "Booking",
          vrbo: "Vrbo",
          "trip-com": "Trip.com",
          agoda: "Agoda",
          expedia: "Expedia",
          hostaway: "Hostaway",
          lodgify: "Lodgify",
        };
        label =
          brandLabels[ev.platform] ??
          (ev.platform
            ? ev.platform.charAt(0).toUpperCase() + ev.platform.slice(1)
            : "Booked");
      }
    }

    result.push({
      startDate: ev.startDate,
      endDate: ev.endDate,
      name: label,
      platform: ev.platform,
      reservationId: resId,
      eventUid: ev.eventUid,
      linkedEventUid: ev.linkedEventUid,
      isExtension,
    });
  }

  // Deduplicate same-platform overlapping bars
  const deduped: CalendarBar[] = [];
  for (const bar of result) {
    const existing = deduped.find(
      (b) =>
        b.platform === bar.platform &&
        b.startDate < bar.endDate &&
        b.endDate > bar.startDate,
    );
    if (existing) {
      if (bar.startDate < existing.startDate)
        existing.startDate = bar.startDate;
      if (bar.endDate > existing.endDate) existing.endDate = bar.endDate;
      if (bar.reservationId && !existing.reservationId) {
        existing.name = bar.name;
        existing.reservationId = bar.reservationId;
      }
      if (bar.eventUid && !existing.eventUid)
        existing.eventUid = bar.eventUid;
      if (bar.linkedEventUid && !existing.linkedEventUid)
        existing.linkedEventUid = bar.linkedEventUid;
    } else {
      deduped.push({ ...bar });
    }
  }

  // Pair linked bars (abutting linkedEventUid pairs)
  const eventUidToBar = new Map<string, CalendarBar>();
  for (const bar of deduped) {
    if (bar.eventUid) eventUidToBar.set(bar.eventUid, bar);
  }
  for (const bar of deduped) {
    if (!bar.linkedEventUid) continue;
    const partner = eventUidToBar.get(bar.linkedEventUid);
    if (!partner || partner === bar) continue;
    if (bar.endDate === partner.startDate) {
      bar.linkedAfter = true;
      partner.linkedBefore = true;
    } else if (bar.startDate === partner.endDate) {
      bar.linkedBefore = true;
      partner.linkedAfter = true;
    }
  }

  // Vertical stacking — interval-graph coloring
  const sortedForRows = [...deduped].sort((a, b) => {
    const c1 = a.startDate.localeCompare(b.startDate);
    if (c1 !== 0) return c1;
    return b.endDate.localeCompare(a.endDate);
  });
  const rowEnds: string[] = [];
  const assigned = new Map<CalendarBar, number>();
  for (const bar of sortedForRows) {
    let inheritedIdx: number | undefined;
    if (bar.linkedEventUid) {
      for (const other of sortedForRows) {
        if (other === bar) continue;
        if (
          other.eventUid &&
          other.eventUid === bar.linkedEventUid &&
          assigned.has(other)
        ) {
          inheritedIdx = assigned.get(other);
          break;
        }
      }
    }
    let idx: number;
    if (inheritedIdx !== undefined) {
      idx = inheritedIdx;
      if (rowEnds[idx] === undefined || rowEnds[idx] < bar.endDate) {
        rowEnds[idx] = bar.endDate;
      }
    } else {
      idx = rowEnds.findIndex((end) => end <= bar.startDate);
      if (idx === -1) {
        idx = rowEnds.length;
        rowEnds.push(bar.endDate);
      } else {
        rowEnds[idx] = bar.endDate;
      }
    }
    assigned.set(bar, idx);
    bar.rowIdx = idx;
  }

  return deduped;
}
