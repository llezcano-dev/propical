/**
 * booking-core.test.ts — tests del dominio booking/iCal (renombrado desde
 * dashboard-core.ts en Fase 3).
 *
 * Propósito: fijar el comportamiento PÚBLICO actual ANTES del dedup de
 * predicados duplicados (isGenericIcalName en reports-panel; isAirbnbBlock
 * inline en cleaning-schedule / reports-panel / calendar-data-core). Si un
 * paso de dedup posterior cambia algo, estos tests deben seguir en verde.
 *
 * Sólo se fija comportamiento con datos VÁLIDOS (slugs de plataforma en
 * lowercase — SLUG_RE en platform-meta — y markers con la capitalización
 * real que emite cada plataforma). Los bordes frágiles (case-sensitivity del
 * filtro host-block, null-summary) se dejan FUERA a propósito: son
 * exactamente lo que el dedup va a normalizar hacia la variante robusta.
 */
import { describe, expect, it } from "vitest";
import {
  buildUnifiedStays,
  detectDoubleBookings,
  friendlyIcalName,
  type SyncedEvent,
  type UnifiedStay,
} from "./booking-core";
import type { Property, Reservation } from "./types";

// --- fixtures ----------------------------------------------------------

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 1,
    name: "John Doe",
    checkIn: "2026-08-14T00:00:00.000Z",
    checkOut: "2026-08-16T00:00:00.000Z",
    platform: "airbnb",
    propertyId: 1,
    createdAt: "2026-01-01",
    ...overrides,
  };
}

function makeEvent(overrides: Partial<SyncedEvent> = {}): SyncedEvent {
  return {
    id: 1,
    platform: "airbnb",
    summary: "John Doe",
    startDate: "2026-08-14",
    endDate: "2026-08-16",
    ...overrides,
  };
}

function makeProperty(reservations: Reservation[]): Property {
  return {
    id: 1,
    userId: 1,
    name: "Casa Test",
    minNights: 1,
    checkInTime: "14:00",
    checkOutTime: "12:00",
    bookingWindow: 365,
    cleaningEnabled: false,
    feedToken: null,
    createdAt: "2026-01-01",
    reservations,
  };
}

// --- friendlyIcalName --------------------------------------------------

describe("friendlyIcalName", () => {
  it("mapea markers genéricos reales al displayName de plataforma", () => {
    expect(friendlyIcalName("Reserved", "airbnb")).toBe("Airbnb");
    expect(friendlyIcalName("CLOSED - Not available", "booking")).toBe("Booking.com");
    expect(friendlyIcalName("Not available", "airbnb")).toBe("Airbnb");
    expect(friendlyIcalName("Airbnb (Not available)", "airbnb")).toBe("Airbnb");
    expect(friendlyIcalName("Blocked", "airbnb")).toBe("Airbnb");
  });

  it("conserva un nombre de huésped real", () => {
    expect(friendlyIcalName("John Doe", "airbnb")).toBe("John Doe");
    expect(friendlyIcalName("María García", "booking")).toBe("María García");
  });

  it("trata null/undefined/'' como genérico", () => {
    expect(friendlyIcalName(null, "airbnb")).toBe("Airbnb");
    expect(friendlyIcalName(undefined, "booking")).toBe("Booking.com");
    expect(friendlyIcalName("", "airbnb")).toBe("Airbnb");
  });

  it("es case-insensitive para marcadores genéricos", () => {
    expect(friendlyIcalName("reserved", "airbnb")).toBe("Airbnb");
    expect(friendlyIcalName("NOT AVAILABLE", "booking")).toBe("Booking.com");
  });

  it("usa fallback capitalizado para plataformas desconocidas", () => {
    expect(friendlyIcalName("Reserved", "foobar")).toBe("Foobar");
  });
});

// --- buildUnifiedStays -------------------------------------------------

describe("buildUnifiedStays", () => {
  it("incluye cada reservation como stay", () => {
    const p = makeProperty([makeReservation()]);
    const stays = buildUnifiedStays(p, []);
    expect(stays).toHaveLength(1);
    expect(stays[0].name).toBe("John Doe");
    expect(stays[0].platform).toBe("airbnb");
    expect(stays[0].reservationId).toBe(1);
  });

  it("usa platform 'direct' como fallback para reservations sin plataforma", () => {
    const p = makeProperty([makeReservation({ platform: "" })]);
    expect(buildUnifiedStays(p, [])[0].platform).toBe("direct");
  });

  it("droppea el lado iCal cuando el uid coincide con linkedEventUid (claim)", () => {
    const p = makeProperty([makeReservation({ linkedEventUid: "uid-123" })]);
    const ev = makeEvent({ uid: "uid-123" });
    const stays = buildUnifiedStays(p, [ev]);
    expect(stays).toHaveLength(1);
    expect(stays[0].reservationId).toBe(1);
  });

  it("filtra host-blocks de Airbnb (markers reales)", () => {
    const p = makeProperty([]);
    const stays = buildUnifiedStays(p, [
      makeEvent({ id: 1, summary: "Airbnb (Not available)" }),
      makeEvent({ id: 2, summary: "Blocked" }),
      makeEvent({ id: 3, summary: "Not available" }),
    ]);
    expect(stays).toHaveLength(0);
  });

  it("filtra eventos CLOSED de Booking.com", () => {
    const p = makeProperty([]);
    const stays = buildUnifiedStays(p, [
      makeEvent({ platform: "booking", summary: "CLOSED - Not available" }),
    ]);
    expect(stays).toHaveLength(0);
  });

  it("droppea el iCal twin genérico en fechas idénticas a una reservation", () => {
    const p = makeProperty([makeReservation()]);
    const ev = makeEvent({ summary: "Reserved", startDate: "2026-08-14", endDate: "2026-08-16" });
    const stays = buildUnifiedStays(p, [ev]);
    expect(stays).toHaveLength(1);
    expect(stays[0].reservationId).toBe(1);
  });

  it("conserva un evento iCal real que no coincide en fechas con la reservation", () => {
    const p = makeProperty([makeReservation()]);
    const ev = makeEvent({ summary: "Jane Smith", startDate: "2026-08-20", endDate: "2026-08-22" });
    const stays = buildUnifiedStays(p, [ev]);
    expect(stays).toHaveLength(2);
    expect(stays.map((s) => s.name).sort()).toEqual(["Jane Smith", "John Doe"]);
  });

  it("colapsa el echo cross-platform y conserva el nombre real", () => {
    const p = makeProperty([makeReservation({ name: "Reserved" })]);
    const ev = makeEvent({ summary: "John Doe", startDate: "2026-08-14", endDate: "2026-08-16" });
    const stays = buildUnifiedStays(p, [ev]);
    expect(stays).toHaveLength(1);
    expect(stays[0].name).toBe("John Doe");
  });

  it("ordena por start ascendente", () => {
    const p = makeProperty([]);
    const stays = buildUnifiedStays(p, [
      makeEvent({ id: 2, summary: "Late", startDate: "2026-08-20", endDate: "2026-08-22" }),
      makeEvent({ id: 1, summary: "Early", startDate: "2026-08-10", endDate: "2026-08-12" }),
    ]);
    expect(stays.map((s) => s.name)).toEqual(["Early", "Late"]);
  });
});

// --- detectDoubleBookings ----------------------------------------------

describe("detectDoubleBookings", () => {
  function stay(start: string, end: string, name: string): UnifiedStay {
    return { start: new Date(start), end: new Date(end), name, platform: "airbnb" };
  }

  const today = new Date("2026-08-15T00:00:00Z");

  it("detecta solapamiento estricto y calcula el rango de solape", () => {
    const conflicts = detectDoubleBookings(
      [stay("2026-08-14", "2026-08-18", "A"), stay("2026-08-16", "2026-08-20", "B")],
      today,
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].aName).toBe("A");
    expect(conflicts[0].bName).toBe("B");
    expect(conflicts[0].overlapStart).toEqual(new Date("2026-08-16"));
    expect(conflicts[0].overlapEnd).toEqual(new Date("2026-08-18"));
  });

  it("NO marca fechas que sólo se tocan (a.end === b.start)", () => {
    const conflicts = detectDoubleBookings(
      [stay("2026-08-14", "2026-08-16", "A"), stay("2026-08-16", "2026-08-18", "B")],
      today,
    );
    expect(conflicts).toHaveLength(0);
  });

  it("excluye conflictos cuyo solape ya terminó antes de hoy", () => {
    const conflicts = detectDoubleBookings(
      [stay("2026-08-10", "2026-08-12", "A"), stay("2026-08-11", "2026-08-13", "B")],
      today,
    );
    expect(conflicts).toHaveLength(0);
  });

  it("excluye el borde overlapEnd === today (corte estricto > today)", () => {
    const conflicts = detectDoubleBookings(
      [stay("2026-08-13", "2026-08-15", "A"), stay("2026-08-14", "2026-08-16", "B")],
      today,
    );
    expect(conflicts).toHaveLength(0);
  });

  it("no produce conflictos entre stays no solapados", () => {
    const conflicts = detectDoubleBookings(
      [stay("2026-08-14", "2026-08-16", "A"), stay("2026-08-18", "2026-08-20", "B")],
      today,
    );
    expect(conflicts).toHaveLength(0);
  });
});
