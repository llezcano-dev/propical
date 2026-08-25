/**
 * dates.test.ts — tests del helper de fecha local.
 *
 * La regresión que protege: `todayLocalISO()` y `localDateISO()` deben
 * devolver la fecha del calendario LOCAL, no la UTC. `toISOString()`
 * devuelve UTC, que para zonas al oeste de UTC puede estar un día por
 * delante (ej. 15 Aug 22:00 -03:00 → 16 Aug en UTC).
 */
import { describe, expect, it } from "vitest";
import { localDateISO, todayLocalISO } from "./dates";

describe("localDateISO", () => {
  it("formatea YYYY-MM-DD con padding", () => {
    expect(localDateISO(new Date(2026, 7, 15))).toBe("2026-08-15"); // ago
    expect(localDateISO(new Date(2026, 0, 5))).toBe("2026-01-05"); // ene
    expect(localDateISO(new Date(2026, 11, 31))).toBe("2026-12-31"); // dic
  });

  it("usa los componentes LOCALES (getMonth/getDate), no UTC", () => {
    // 2026-08-15T23:30:00 en hora local (UTC-3) = 2026-08-16T02:30 UTC.
    // El resultado debe ser 2026-08-15 (local), nunca 2026-08-16 (UTC).
    const lateLocal = new Date(2026, 7, 15, 23, 30, 0);
    expect(localDateISO(lateLocal)).toBe("2026-08-15");
    // El mismo instante visto con getUTCDate() daría 16 — el helper
    // debe NO usar toISOString/getUTC*.
    expect(lateLocal.getUTCDate()).toBe(16); // sanity del test
  });
});

describe("todayLocalISO", () => {
  it("coincide con localDateISO(new Date())", () => {
    expect(todayLocalISO()).toBe(localDateISO(new Date()));
  });

  it("devuelve un string YYYY-MM-DD válido", () => {
    expect(todayLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
