/**
 * /api/test-fixtures/airbnb-sample — fixture iCal DINÁMICO para e2e.
 *
 * El fixture estático `public/test-fixtures/airbnb-sample.ics` tenía
 * fechas fijas (10-15 Aug 2026) que vencieron con el tiempo, rompiendo
 * los tests de calendar/navbar/reports que dependen de un evento
 * "futuro". Esta ruta genera el mismo contenido pero con fechas
 * RELATIVAS a hoy, para que la suite e2e pase en cualquier fecha.
 *
 * Eventos (offsets desde hoy):
 *   airbnb-res-001@e2e  +2 → +7   (el que usan los tests de claim)
 *   airbnb-res-002@e2e  +10 → +14
 *   airbnb-block-001@e2e +20 → +22  (Not available)
 *   airbnb-res-003@e2e  +30 → +36
 */
export const dynamic = "force-dynamic";

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export async function GET() {
  const events = [
    { uid: "airbnb-res-001@e2e", summary: "Reserved", start: 2, end: 7 },
    { uid: "airbnb-res-002@e2e", summary: "Reserved", start: 10, end: 14 },
    { uid: "airbnb-block-001@e2e", summary: "Not available", start: 20, end: 22 },
    { uid: "airbnb-res-003@e2e", summary: "Reserved", start: 30, end: 36 },
  ];

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Propical E2E//Airbnb Sample//EN",
    "X-WR-CALNAME:Airbnb Sample (E2E)",
  ];

  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `SUMMARY:${ev.summary}`,
      `DTSTART;VALUE=DATE:${isoDate(ev.start)}`,
      `DTEND;VALUE=DATE:${isoDate(ev.end)}`,
      `DTSTAMP:${isoDate(-15)}T000000Z`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
