import { describe, it, expect } from "vitest";
import { getExtendableBookings } from "./extendable-bookings";
import type { CalendarEvent } from "./types";
import type { Reservation, Property } from "@/lib/types";

/** Reservation fixtures use full UTC instants (DB serialization), the
 *  same shape the API returns — NOT date-only strings. */
function reservation(overrides: Partial<Reservation>): Reservation {
  return {
    id: 1,
    name: "Guest",
    checkIn: "2026-08-14T00:00:00.000Z",
    checkOut: "2026-08-16T00:00:00.000Z",
    platform: "direct",
    propertyId: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 1,
    platform: "airbnb",
    uid: "evt-1",
    summary: "Iain",
    startDate: "2026-08-14",
    endDate: "2026-08-16",
    ...overrides,
  };
}

describe("getExtendableBookings", () => {
  it("before-rule: offers a reservation whose startDate is the day after the selection", () => {
    // Selection covers Aug 13; reservation starts Aug 14 (UTC instant).
    const result = getExtendableBookings(
      "2026-08-13",
      "2026-08-13",
      [],
      [reservation({})]
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      reservationId: 1,
      side: "before",
      bookingStart: "2026-08-14",
      bookingEnd: "2026-08-16",
    });
  });

  it("after-rule: offers a reservation whose checkOut + 1 equals the selection start", () => {
    // Reservation ends Aug 16 (exclusive) → dayAfterReservation is Aug 17.
    const result = getExtendableBookings(
      "2026-08-17",
      "2026-08-17",
      [],
      [reservation({})]
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ reservationId: 1, side: "after" });
  });

  it("matches iCal events by their raw date strings (before-rule)", () => {
    const result = getExtendableBookings(
      "2026-08-13",
      "2026-08-13",
      [event({ uid: "evt-1" })],
      []
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ eventUid: "evt-1", side: "before" });
  });

  it("filters out platform host-blocks (Blocked / CLOSED / Not available)", () => {
    const result = getExtendableBookings(
      "2026-08-13",
      "2026-08-13",
      [
        event({ uid: "blocked", summary: "Not available" }),
        event({ uid: "closed", summary: "CLOSED - Not available" }),
        event({ uid: "real", summary: "Iain" }),
      ],
      []
    );
    expect(result.map((b) => b.eventUid)).toEqual(["real"]);
  });

  it("locks claims: linked reservation overlapping its event is NOT offered as a PATCH", () => {
    // The claim-lock suppresses the RESERVATION entry (whose handler
    // would PATCH the row and diverge from the iCal event). The iCal
    // event entry (POST + linkedEventUid) is still a valid extension
    // offer, so exactly one entry — the event one — must come back.
    const result = getExtendableBookings(
      "2026-08-13",
      "2026-08-13",
      [event({ uid: "evt-1" })],
      [reservation({ linkedEventUid: "evt-1" })]
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ eventUid: "evt-1", side: "before" });
    expect(result[0].reservationId).toBeUndefined();
  });

  it("allows extensions: linked reservation ABUTTING its event (not overlapping)", () => {
    // Reservation runs Aug 14-16, event Aug 16-18 — they abut but never
    // overlap. Clicking Aug 13 (before the reservation) is a valid
    // extension of the manual segment.
    const result = getExtendableBookings(
      "2026-08-13",
      "2026-08-13",
      [event({ uid: "evt-1", startDate: "2026-08-16", endDate: "2026-08-18" })],
      [reservation({ linkedEventUid: "evt-1" })]
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ reservationId: 1, side: "before" });
  });

  it("B1 regression: UTC-instant reservation lands on its true calendar date", () => {
    // In a non-UTC timezone, reading the instant with local getters
    // would yield Aug 13 — the before-rule would miss and the offer
    // would silently not appear. toUtcDateStr keeps it Aug 14.
    const result = getExtendableBookings(
      "2026-08-13",
      "2026-08-13",
      [],
      [reservation({ checkIn: "2026-08-14T00:00:00.000Z", checkOut: "2026-08-16T00:00:00.000Z" })]
    );
    expect(result[0]?.bookingStart).toBe("2026-08-14");
  });

  it("returns no offers when nothing abuts the selection", () => {
    const result = getExtendableBookings(
      "2026-09-01",
      "2026-09-02",
      [event({})],
      [reservation({})]
    );
    expect(result).toEqual([]);
  });

  it("survives a property-shaped input (full Property reservations array)", () => {
    const p: Pick<Property, "reservations"> = {
      reservations: [reservation({ id: 7 })],
    };
    const result = getExtendableBookings("2026-08-13", "2026-08-13", [], p.reservations);
    expect(result[0]?.reservationId).toBe(7);
  });
});
