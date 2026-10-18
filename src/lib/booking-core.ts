import { resolvePlatformMeta } from "@/lib/platform-meta";
import type { Property } from "@/lib/types";
import { localMidnightFromDateStr, toLocalDateStr, reservationDateKey } from "@/lib/dates";
export interface SyncedEvent {
  id: number;
  platform: string;
  uid?: string;
  summary: string;
  startDate: string;
  endDate: string;
}
export interface UnifiedStay {
  start: Date;
  end: Date;
  name: string;
  platform: string;
  reservationId?: number;
}
/** True for iCal summaries that almost always indicate "this is a
 *  generic blocked booking, not a guest name" — Airbnb's "Reserved",
 *  Booking.com's "CLOSED - Not available", host-blocks, etc. Used to
 *  distinguish iCal twins of manually-entered Reservations (which the
 *  host hasn't claimed via the bar-claim popover) from a real second
 *  booking that just happens to overlap on the same dates. */
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
/** Display-safe name for an iCal-imported event. Falls back to the
 *  platform brand name ("Booking.com" / "Airbnb" / …) when the raw
 *  summary is generic-marker text — surfacing "CLOSED - Not available"
 *  as the upcoming-guest label on the dashboard is confusing for the
 *  host. They know it's a fetched stay; the platform name is the
 *  truthful answer until the host claims the bar and gives it a real
 *  guest name. Matches what the calendar grid already does for bar
 *  labels (use-calendar-data.ts swaps generic labels for "Airbnb"
 *  / "Booking" before rendering). */
export function friendlyIcalName(summary: string | null | undefined, platform: string): string {
  if (!summary || isGenericIcalName(summary)) return resolvePlatformMeta(platform).displayName;
  return summary;
}
/** Build a deduped list of stays for one property from Reservation rows
 *  + iCal-synced events. Three layers of dedup so the dashboard never
 *  double-counts the SAME booking represented in two places:
 *    1. iCal events whose uid matches a Reservation.linkedEventUid
 *       (the host explicitly claimed the bar) → drop the iCal side.
 *    2. iCal events with generic summaries (Reserved / Blocked / etc)
 *       whose start+end exactly match a Reservation's dates → drop
 *       the iCal side. This catches the very common case of a host
 *       creating a Reservation manually without going through the
 *       bar-claim popover, leaving the iCal twin orphaned.
 *    3. Airbnb host-blocks ("Not available" / "Blocked") are filtered
 *       out — they're not real guests.
 *  Sorted by start asc. */
export function buildUnifiedStays(p: Property, events: SyncedEvent[]): UnifiedStay[] {
  const linkedUids = new Set(
    p.reservations.map((r) => r.linkedEventUid).filter((u): u is string => !!u)
  );
  // Reservation date-range keys — used to silently merge generic-named
  // iCal events with the host's manual entry on identical dates.
  const reservationDateKeys = new Set<string>();
  for (const r of p.reservations) {
    // Keys must land on the same calendar dates as the raw iCal event
    // strings (ev.startDate / ev.endDate). reservationDateKey reads the
    // UTC-instant checkIn/checkOut with the local pairing
    // (localMidnightFromDateStr → toLocalDateStr), which round-trips the
    // calendar date exactly in any timezone — reading the instants with
    // local getters directly would drift the key one day away from the
    // iCal twin it has to match (B1 "claim +1 día" family).
    reservationDateKeys.add(reservationDateKey(r.checkIn, r.checkOut));
  }
  const stays: UnifiedStay[] = [];
  for (const r of p.reservations) {
    const start = localMidnightFromDateStr(r.checkIn);
    const end = localMidnightFromDateStr(r.checkOut);
    stays.push({
      start,
      end,
      name: r.name,
      platform: r.platform || "direct",
      reservationId: r.id,
    });
  }
  for (const ev of events) {
    if (ev.uid && linkedUids.has(ev.uid)) continue;
    // Host-blocks are NEVER real guest reservations — they're dates
    // the host blocked manually in the platform's own calendar. Each
    // platform marks them differently: Airbnb uses "Not available" /
    // "Blocked"; Booking.com / Vrbo / Trip.com use "CLOSED" or
    // "CLOSED - Not available". Without this filter, overlapping
    // host-blocks from the SAME platform (e.g. Booking fragmenting one
    // blocked range into two overlapping events with different UIDs)
    // surface as a phantom "Booking.com & Booking.com" double-booking
    // on the dashboard.
    if (ev.platform === "airbnb" && (ev.summary?.includes("Not available") || ev.summary?.includes("Blocked"))) continue;
    if (/^\s*CLOSED\b/i.test(ev.summary || "")) continue;
    // Same-dates + generic-summary heuristic: drop the iCal twin.
    const dateKey = `${ev.startDate}|${ev.endDate}`;
    if (reservationDateKeys.has(dateKey) && isGenericIcalName(ev.summary || "")) continue;
    const start = localMidnightFromDateStr(ev.startDate);
    const end = localMidnightFromDateStr(ev.endDate);
    stays.push({ start, end, name: friendlyIcalName(ev.summary, ev.platform), platform: ev.platform });
  }

  // Cross-platform echo collapse. A host who runs the normal multi-
  // platform setup syncs their master calendar (usually Airbnb) INTO
  // Booking / Trip.com / Agoda, so every confirmed booking is
  // reflected back out in EVERY platform's exported iCal. Propical
  // imports all those feeds and ends up with N copies of the same
  // booking — and detectDoubleBookings() then flags (N-1) false
  // "double booking" conflicts for every single reservation.
  //
  // Two stays with the EXACT same (start, end) date range are
  // collapsed to one. Exact-match is the safe signature: a genuine
  // independent double-booking with byte-identical check-in AND
  // check-out dates is rare, and even when it happens the calendar
  // grid still renders both bars (separate code path) so the host
  // isn't blind to it. A partial overlap (Booking 1-10 + Trip 5-7)
  // is NOT collapsed — that can't be a clean echo and still warrants
  // a conflict warning.
  //
  // When collapsing, keep the entry with the most informative name:
  // a real guest name beats a generic platform block string
  // ("RoomStatus Fully booked", "CLOSED - Not available", "Reserved").
  const collapsed: UnifiedStay[] = [];
  const byRange = new Map<string, UnifiedStay>();
  for (const s of stays) {
    const key = `${toLocalDateStr(s.start)}|${toLocalDateStr(s.end)}`;
    const existing = byRange.get(key);
    if (!existing) {
      byRange.set(key, s);
      collapsed.push(s);
      continue;
    }
    // Same date range already seen — this is an echo. Upgrade the
    // kept copy's name/platform if the echo carries a real guest
    // name and the kept copy only had a generic block string.
    if (isGenericIcalName(existing.name) && !isGenericIcalName(s.name)) {
      existing.name = s.name;
      existing.platform = s.platform;
      if (s.reservationId) existing.reservationId = s.reservationId;
    }
  }

  collapsed.sort((a, b) => a.start.getTime() - b.start.getTime());
  return collapsed;
}
/** Per-property double-booking detection. Returns the list of overlapping
 *  pairs whose overlap range still touches today-or-future, so a stale
 *  past conflict doesn't show as an active alert on the dashboard. */
export function detectDoubleBookings(stays: UnifiedStay[], today: Date): Array<{
  aName: string;
  bName: string;
  overlapStart: Date;
  overlapEnd: Date;
}> {
  const out: Array<{ aName: string; bName: string; overlapStart: Date; overlapEnd: Date }> = [];
  for (let i = 0; i < stays.length; i++) {
    for (let j = i + 1; j < stays.length; j++) {
      const a = stays[i];
      const b = stays[j];
      // Strict overlap: a.start < b.end AND b.start < a.end. Touching
      // dates (a.end === b.start) are NOT a conflict — that's a normal
      // turnover (one guest checks out, next checks in same day).
      if (a.start < b.end && b.start < a.end) {
        const overlapStart = a.start > b.start ? a.start : b.start;
        const overlapEnd = a.end < b.end ? a.end : b.end;
        if (overlapEnd > today) {
          out.push({ aName: a.name, bName: b.name, overlapStart, overlapEnd });
        }
      }
    }
  }
  return out;
}

