import { describe, it, expect } from "vitest";
import { buildCalendarDataCore, buildCalendarBars } from "@/lib/calendar-data-core";
import type { Property, CalendarLink, Reservation } from "@/lib/types";
import type { CalendarEvent, CalendarBar } from "@/components/calendar/types";

// ---- minimal fixture builders ----

/** ISO date + noon UTC so new Date() → getDate() is stable across timezones. */
function iso(d: string): string {
  return `${d}T12:00:00.000Z`;
}

function makeRes(
  overrides: Partial<Reservation> & {
    id: number;
    propertyId: number;
    checkIn: string;
    checkOut: string;
  },
): Reservation {
  return {
    name: "Guest",
    platform: "airbnb",
    linkedEventUid: null,
    tgGroupUrl: null,
    waGroupUrl: null,
    groupName: null,
    phone: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEvent(
  overrides: Partial<CalendarEvent> & {
    uid: string;
    platform: string;
    startDate: string;
    endDate: string;
  },
): CalendarEvent {
  return {
    id: 1,
    summary: "Reserved",
    ...overrides,
  };
}

function makeProperty(
  overrides: Partial<Property> & { id: number },
): Property {
  return {
    userId: 1,
    name: "Test Property",
    minNights: 3,
    checkInTime: "14:00",
    checkOutTime: "12:00",
    bookingWindow: 365,
    cleaningEnabled: true,
    feedToken: null,
    createdAt: new Date().toISOString(),
    reservations: [],
    ...overrides,
  };
}

const EMPTY_SET = new Set<string>();
const NO_LINKS: CalendarLink[] = [];

// ---- tests ----

describe("buildCalendarDataCore", () => {
  it("evento sin claim → bar conserva SUMMARY y no tiene reservationId", () => {
    const ev = makeEvent({
      uid: "evt-1",
      platform: "airbnb",
      startDate: "2026-08-10",
      endDate: "2026-08-15",
      summary: "Airbnb (Reserved)",
    });
    const prop = makeProperty({ id: 1, reservations: [] });

    const data = buildCalendarDataCore(
      prop,
      [ev],
      NO_LINKS,
      EMPTY_SET,
      EMPTY_SET,
    );

    const key = `${ev.startDate}|${ev.platform}`;
    const bar = data.dateToEvent.get(key);
    expect(bar).toBeDefined();
    expect(bar!.name).toBe("Airbnb (Reserved)");
    expect(bar!.reservationId).toBeUndefined();
    expect(bar!.eventUid).toBe("evt-1");
  });

  it("evento + reserva solapada (claim) → bar usa res.name, setea reservationId", () => {
    const ev = makeEvent({
      uid: "evt-1",
      platform: "airbnb",
      startDate: "2026-08-10",
      endDate: "2026-08-15",
      summary: "Airbnb (Reserved)",
    });
    const res = makeRes({
      id: 100,
      propertyId: 1,
      checkIn: iso("2026-08-10"),
      checkOut: iso("2026-08-16"),
      platform: "airbnb",
      name: "Maria Silva",
    });
    const prop = makeProperty({ id: 1, reservations: [res] });

    const data = buildCalendarDataCore(
      prop,
      [ev],
      NO_LINKS,
      EMPTY_SET,
      EMPTY_SET,
    );

    const key = `${ev.startDate}|${ev.platform}`;
    const bar = data.dateToEvent.get(key);
    expect(bar).toBeDefined();
    // Claimed → bar name = reservation name, not the iCal SUMMARY
    expect(bar!.name).toBe("Maria Silva");
    expect(bar!.reservationId).toBe(100);
    expect(bar!.eventUid).toBe("evt-1");
  });

  it("reserva direct (sin evento) → platform 'direct' se preserva en dateToEvent", () => {
    const res = makeRes({
      id: 200,
      propertyId: 1,
      checkIn: iso("2026-09-01"),
      checkOut: iso("2026-09-05"),
      platform: "direct",
      name: "Walk-in Guest",
    });
    const prop = makeProperty({ id: 1, reservations: [res] });

    const data = buildCalendarDataCore(
      prop,
      [],
      NO_LINKS,
      EMPTY_SET,
      EMPTY_SET,
    );

    const key = "2026-09-01|direct";
    const bar = data.dateToEvent.get(key);
    expect(bar).toBeDefined();
    expect(bar!.platform).toBe("direct");
    expect(bar!.name).toBe("Walk-in Guest");
  });

  it("dos eventos mismo startDay distinta plataforma → ambos en dateToEvent (clave compuesta)", () => {
    const ev1 = makeEvent({
      uid: "airbnb-1",
      platform: "airbnb",
      startDate: "2026-10-01",
      endDate: "2026-10-10",
      summary: "Airbnb Guest",
    });
    const ev2 = makeEvent({
      uid: "booking-1",
      platform: "booking",
      startDate: "2026-10-01",
      endDate: "2026-10-05",
      summary: "Booking Guest",
    });
    const prop = makeProperty({ id: 1, reservations: [] });

    const data = buildCalendarDataCore(
      prop,
      [ev1, ev2],
      NO_LINKS,
      EMPTY_SET,
      EMPTY_SET,
    );

    const abKey = "2026-10-01|airbnb";
    const bkKey = "2026-10-01|booking";
    expect(data.dateToEvent.has(abKey)).toBe(true);
    expect(data.dateToEvent.has(bkKey)).toBe(true);
    expect(data.dateToEvent.get(abKey)!.platform).toBe("airbnb");
    expect(data.dateToEvent.get(bkKey)!.platform).toBe("booking");
  });

  it("claim con nombre nuevo pisa el SUMMARY (regresión B1)", () => {
    const ev = makeEvent({
      uid: "evt-b1",
      platform: "airbnb",
      startDate: "2026-11-01",
      endDate: "2026-11-05",
      summary: "Reserved",
    });
    const res = makeRes({
      id: 300,
      propertyId: 1,
      checkIn: iso("2026-11-01"),
      checkOut: iso("2026-11-06"),
      platform: "airbnb",
      name: "Claimed Name",
    });
    const prop = makeProperty({ id: 1, reservations: [res] });

    const data = buildCalendarDataCore(
      prop,
      [ev],
      NO_LINKS,
      EMPTY_SET,
      EMPTY_SET,
    );

    const key = `${ev.startDate}|${ev.platform}`;
    const bar = data.dateToEvent.get(key);
    expect(bar).toBeDefined();
    expect(bar!.name).toBe("Claimed Name");
    expect(bar!.reservationId).toBe(300);
  });

  it("reserva manual platform 'direct' no se etiqueta como airbnb en el merge", () => {
    const res = makeRes({
      id: 400,
      propertyId: 1,
      checkIn: iso("2026-12-01"),
      checkOut: iso("2026-12-04"),
      platform: "direct",
      name: "Direct Booking",
    });
    const prop = makeProperty({ id: 1, reservations: [res] });

    const data = buildCalendarDataCore(
      prop,
      [],
      NO_LINKS,
      EMPTY_SET,
      EMPTY_SET,
    );

    const key = "2026-12-01|direct";
    const bar = data.dateToEvent.get(key);
    expect(bar).toBeDefined();
    expect(bar!.platform).toBe("direct");
    expect(bar!.name).toBe("Direct Booking");
    // No debe existir entrada con plataforma airbnb para esta reserva
    const abKey = "2026-12-01|airbnb";
    expect(data.dateToEvent.has(abKey)).toBe(false);
  });

  it("extensión que ABUTA evento → reservation con linkedEventUid coexiste con el evento", () => {
    // iCal event 10-15 Aug, manual extension 15-18 Aug (abuts at end==start)
    const ev = makeEvent({
      uid: "evt-ext",
      platform: "booking",
      startDate: "2026-08-10",
      endDate: "2026-08-15",
      summary: "Booking Guest",
    });
    const res = makeRes({
      id: 500,
      propertyId: 1,
      checkIn: iso("2026-08-15"),
      checkOut: iso("2026-08-18"),
      platform: "booking",
      name: "Booking Guest",
      linkedEventUid: "evt-ext",
    });
    const prop = makeProperty({ id: 1, reservations: [res] });

    const data = buildCalendarDataCore(
      prop,
      [ev],
      NO_LINKS,
      EMPTY_SET,
      EMPTY_SET,
    );

    // Event bar exists
    const evKey = `${ev.startDate}|${ev.platform}`;
    expect(data.dateToEvent.has(evKey)).toBe(true);
    expect(data.dateToEvent.get(evKey)!.eventUid).toBe("evt-ext");

    // Extension reservation bar exists (separate key — abuts, not overlaps)
    const extKey = "2026-08-15|booking";
    expect(data.dateToEvent.has(extKey)).toBe(true);
    const extBar = data.dateToEvent.get(extKey)!;
    expect(extBar.reservationId).toBe(500);
    expect(extBar.linkedEventUid).toBe("evt-ext");
    expect(extBar.eventUid).toBeUndefined();
  });
});

// ---- buildCalendarBars regression tests (exercises toDateStr) ----

describe("buildCalendarBars", () => {
  /** Minimal dateToEvent entry builder. */
  function ev(args: {
    key: string;
    name: string;
    platform: string;
    startDate: string;
    endDate: string;
    reservationId?: number;
    eventUid?: string;
    linkedEventUid?: string;
  }): Map<string, CalendarBar> {
    const m = new Map<string, CalendarBar>();
    m.set(args.key, {
      name: args.name,
      platform: args.platform,
      startDate: args.startDate,
      endDate: args.endDate,
      reservationId: args.reservationId,
      eventUid: args.eventUid,
      linkedEventUid: args.linkedEventUid,
    });
    return m;
  }

  it("regression: builds bars from dateToEvent without crashing (toDateStr is exercised)", () => {
    const dte = ev({
      key: "2026-08-10|airbnb",
      name: "Reserved",
      platform: "airbnb",
      startDate: "2026-08-10",
      endDate: "2026-08-15",
      eventUid: "evt-1",
    });

    // No reservations, no synced events — generic summary should fall back
    // to brand label. The toDateStr calls inside isGenericSummary path
    // are not hit here because there are no matching reservations, but
    // the function must not throw.
    const bars = buildCalendarBars(dte, [], []);
    expect(bars.length).toBe(1);
    expect(bars[0].name).toBe("Airbnb"); // "Reserved" → generic → brand fallback
    expect(bars[0].platform).toBe("airbnb");
    expect(bars[0].reservationId).toBeUndefined();
  });

  it("regression: generic summary 'Reserved' is replaced by matching reservation name", () => {
    const dte = ev({
      key: "2026-08-10|airbnb",
      name: "Reserved",
      platform: "airbnb",
      startDate: "2026-08-10",
      endDate: "2026-08-15",
      eventUid: "evt-1",
    });

    const res = makeRes({
      id: 100,
      propertyId: 1,
      checkIn: iso("2026-08-10"),
      checkOut: iso("2026-08-16"),
      platform: "airbnb",
      name: "Maria Silva",
    });

    const bars = buildCalendarBars(dte, [res], []);
    expect(bars.length).toBe(1);
    // The generic "Reserved" label must be replaced by the reservation name
    expect(bars[0].name).toBe("Maria Silva");
    expect(bars[0].reservationId).toBe(100);
  });

  it("regression: isExtension detection uses toDateStr and does not throw", () => {
    const dte = ev({
      key: "2026-08-15|booking",
      name: "Booking Guest",
      platform: "booking",
      startDate: "2026-08-15",
      endDate: "2026-08-18",
      reservationId: 500,
      linkedEventUid: "evt-ext",
    });

    const res = makeRes({
      id: 500,
      propertyId: 1,
      checkIn: iso("2026-08-15"),
      checkOut: iso("2026-08-18"),
      platform: "booking",
      name: "Booking Guest",
      linkedEventUid: "evt-ext",
    });

    const syncedEv = makeEvent({
      uid: "evt-ext",
      platform: "booking",
      startDate: "2026-08-10",
      endDate: "2026-08-15",
      summary: "Booking Guest",
    });

    const bars = buildCalendarBars(dte, [res], [syncedEv]);
    expect(bars.length).toBe(1);
    // Extension: reservation abuts the iCal event → isExtension = true
    expect(bars[0].isExtension).toBe(true);
    expect(bars[0].linkedEventUid).toBe("evt-ext");
  });

  it("bar deduplication merges same-platform overlapping bars", () => {
    const dte = new Map([
      [
        "2026-08-10|airbnb",
        {
          name: "Guest A",
          platform: "airbnb",
          startDate: "2026-08-10",
          endDate: "2026-08-14",
        },
      ],
      [
        "2026-08-12|airbnb",
        {
          name: "Guest A ext",
          platform: "airbnb",
          startDate: "2026-08-12",
          endDate: "2026-08-18",
          reservationId: 1,
        },
      ],
    ]);

    const bars = buildCalendarBars(dte, [], []);
    // Should be deduped to 1 bar with extended range
    expect(bars.length).toBe(1);
    expect(bars[0].startDate).toBe("2026-08-10");
    expect(bars[0].endDate).toBe("2026-08-18");
    expect(bars[0].reservationId).toBe(1);
  });
});
