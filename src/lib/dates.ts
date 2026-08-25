/**
 * dates.ts — helpers de fecha para comparaciones de calendario.
 *
 * El problema que resuelven: `new Date().toISOString().substring(0, 10)`
 * devuelve la fecha en UTC, que para zonas al oeste de UTC (América,
 * por ejemplo) puede estar UN DÍA por delante de la fecha local. Cuando
 * la app compara fechas de calendario (strings YYYY-MM-DD que representan
 * días del calendario local, como las de un .ics o la DB) contra "hoy",
 * usar UTC descarta eventos que terminan "hoy" en hora local pero ya son
 * "ayer" en UTC (y viceversa en zonas al este).
 *
 * `todayLocalISO()` devuelve la fecha de HOY en hora local, con el mismo
 * formato YYYY-MM-DD que usan los fixtures iCal y la columna startDate/
 * endDate de CalendarEvent.
 */

/** Fecha de hoy en hora local como YYYY-MM-DD. */
export function todayLocalISO(): string {
  const d = new Date();
  return localDateISO(d);
}

/** Convierte un Date a YYYY-MM-DD en hora local (no UTC). */
export function localDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
