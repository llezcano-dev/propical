import fs from 'fs';
import path from 'path';

/**
 * Generador de mocks iCal para desarrollo local.
 *
 * Crea/actualiza:
 *   - public/mock/airbnb.ical
 *   - public/mock/booking.ical
 *
 * Las fechas son relativas al día de hoy, así que cada ejecución produce
 * eventos futuros que el sync de propical pueda importar.
 *
 * Uso:
 *   pnpm mock:ical
 *
 * Reglas de oro si editás los .ical a mano:
 *   1. Mantené las fechas futuras (el sync descarta endDate < hoy).
 *   2. No uses UIDs renttool-* ni SUMMARY "Blocked (...)" — el sync los filtra.
 *   3. Los bloqueos de 1 día adyacentes a otros eventos se filtran como buffer
 *      reflejado; dejalos multi-día o aislados.
 *   4. Conservá el UID para actualizar fechas; cambialo solo si querés un evento nuevo.
 */

type MockEvent = {
  uid: string;
  summary: string;
  startOffset: number; // días desde hoy (negativo = pasado)
  duration: number; // días (DTEND = DTSTART + duration)
  description?: string;
};

// ---------------------------------------------------------------------------
// Helpers de fecha
// ---------------------------------------------------------------------------

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatDtStamp(date: Date): string {
  // 20260806T192802Z
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
}

// ---------------------------------------------------------------------------
// Folding RFC 5545 (máx 75 octetos por línea física; continuación con espacio)
// ---------------------------------------------------------------------------

function foldContentLine(line: string, maxBytes = 75): string[] {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let remaining = line;
  let first = true;

  while (remaining.length > 0) {
    const limit = first ? maxBytes : maxBytes - 1; // reservar 1 byte para el espacio inicial
    let cut = remaining.length;

    while (cut > 0 && encoder.encode(remaining.slice(0, cut)).length > limit) {
      cut--;
    }

    if (cut <= 0) {
      // Caso extremo: un solo carácter pesa más que el límite (no debería pasar con ASCII)
      cut = 1;
    }

    chunks.push(first ? remaining.slice(0, cut) : ' ' + remaining.slice(0, cut));
    remaining = remaining.slice(cut);
    first = false;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function buildEventLines(event: MockEvent, today: Date, dtStamp: string): string[] {
  const start = addDays(today, event.startOffset);
  const end = addDays(start, event.duration);

  const contentLines = [
    'BEGIN:VEVENT',
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${formatDate(start)}`,
    `DTEND;VALUE=DATE:${formatDate(end)}`,
    `SUMMARY:${event.summary}`,
    `UID:${event.uid}`,
  ];

  if (event.description) {
    contentLines.push(`DESCRIPTION:${event.description}`);
  }

  contentLines.push('END:VEVENT');

  return contentLines.flatMap((line) => foldContentLine(line));
}

function buildAirbnbIcal(today: Date, dtStamp: string): string {
  const events: MockEvent[] = [
    {
      uid: 'a1b2c3d4e5f6-1234567890abcdef@airbnb.com',
      summary: 'Reserved',
      startOffset: -20,
      duration: 4,
      description:
        'Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM54NPNT2P\\nPhone Number (Last 4 Digits): 6034',
    },
    {
      uid: 'b2c3d4e5f6a7-2345678901bcdef0@airbnb.com',
      summary: 'Reserved',
      startOffset: 10,
      duration: 5,
      description:
        'Reservation URL: https://www.airbnb.com/hosting/reservations/details/XK29BMQP8L\\nPhone Number (Last 4 Digits): 9876',
    },
    {
      uid: 'c3d4e5f6a7b8-3456789012cdef01@airbnb.com',
      summary: 'Reserved',
      startOffset: 30,
      duration: 3,
      description:
        'Reservation URL: https://www.airbnb.com/hosting/reservations/details/PL77VCNX3R\\nPhone Number (Last 4 Digits): 4321',
    },
    {
      uid: 'd4e5f6a7b8c9-4567890123def012@airbnb.com',
      summary: 'Reserved',
      startOffset: 45,
      duration: 7,
      description:
        'Reservation URL: https://www.airbnb.com/hosting/reservations/details/QN88DWLY9K\\nPhone Number (Last 4 Digits): 1590',
    },
    {
      uid: 'e5f6a7b8c9d0-5678901234ef0123@airbnb.com',
      summary: 'Airbnb (Not available)',
      startOffset: 60,
      duration: 4,
    },
    {
      uid: 'f6a7b8c9d0e1-6789012345f01234@airbnb.com',
      summary: 'Airbnb (Not available)',
      startOffset: 75,
      duration: 14,
    },
  ];

  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN',
    'CALSCALE:GREGORIAN',
    'VERSION:2.0',
    ...events.flatMap((event) => buildEventLines(event, today, dtStamp)),
    'END:VCALENDAR',
  ];

  return lines.join('\r\n') + '\r\n';
}

type BookingOptions = {
  /**
   * Los exports reales de Booking.com no incluyen PII (ningún nombre,
   * teléfono ni link). Activar esta opción agrega un DESCRIPTION sintético
   * con URL + últimos 4 dígitos del teléfono, útil solo para probar el
   * parsing de DESCRIPTION en el futuro.
   */
  includePiiDescription?: boolean;
};

function buildBookingIcal(today: Date, dtStamp: string, options: BookingOptions = {}): string {
  const { includePiiDescription = false } = options;

  const reservationDescription = includePiiDescription
    ? 'Reservation URL: https://admin.booking.com/finance/payout.html?reservation_id=HM54NPNT2P\\nPhone Number (Last 4 Digits): 6034'
    : undefined;

  const manualBlockStart = addDays(today, 80);
  const manualBlockUid = `blocked_${formatDate(manualBlockStart)}@booking.com`;

  const events: MockEvent[] = [
    {
      uid: 'a1b2c3d4e5f6001122334455667701@booking.com',
      summary: 'Reserved',
      startOffset: -20,
      duration: 3,
      description: reservationDescription,
    },
    {
      uid: 'reservation-101@booking.com',
      summary: 'Reserved',
      startOffset: 12,
      duration: 6,
      description: reservationDescription,
    },
    {
      uid: 'reservation-102@booking.com',
      summary: 'Reserved',
      startOffset: 33,
      duration: 4,
      description: reservationDescription,
    },
    {
      uid: 'reservation-103@booking.com',
      summary: 'Reserved',
      startOffset: 50,
      duration: 2,
      description: reservationDescription,
    },
    {
      uid: 'a1b2c3d4e5f6001122334455667705@booking.com',
      summary: 'CLOSED - Not available',
      startOffset: 62,
      duration: 5,
    },
    {
      uid: manualBlockUid,
      summary: 'Not available',
      startOffset: 80,
      duration: 1,
    },
  ];

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'X-WR-CALNAME:Booking.com Calendar for Beach House',
    'PRODID:-//admin.booking.com\\, b.v.//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((event) => buildEventLines(event, today, dtStamp)),
    'END:VCALENDAR',
  ];

  return lines.join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function printSummary(label: string, events: MockEvent[], today: Date) {
  console.log(`\n${label}:`);
  console.table(
    events.map((event) => {
      const start = addDays(today, event.startOffset);
      const end = addDays(start, event.duration);
      return {
        uid: event.uid,
        summary: event.summary,
        start: formatDate(start),
        end: formatDate(end),
        days: event.duration,
      };
    })
  );
}

function main() {
  const today = startOfToday();
  const dtStamp = formatDtStamp(new Date());
  const root = process.cwd();
  const outDir = path.join(root, 'public', 'mock');

  fs.mkdirSync(outDir, { recursive: true });

  const airbnbIcal = buildAirbnbIcal(today, dtStamp);
  const bookingIcal = buildBookingIcal(today, dtStamp);

  fs.writeFileSync(path.join(outDir, 'airbnb.ical'), airbnbIcal, 'utf8');
  fs.writeFileSync(path.join(outDir, 'booking.ical'), bookingIcal, 'utf8');

  console.log(`✓ Generated ${path.join('public', 'mock', 'airbnb.ical')}`);
  console.log(`✓ Generated ${path.join('public', 'mock', 'booking.ical')}`);

  printSummary('Airbnb events', [
    {
      uid: 'a1b2c3d4e5f6-1234567890abcdef@airbnb.com',
      summary: 'Reserved',
      startOffset: -20,
      duration: 4,
      description:
        'Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM54NPNT2P\\nPhone Number (Last 4 Digits): 6034',
    },
    {
      uid: 'b2c3d4e5f6a7-2345678901bcdef0@airbnb.com',
      summary: 'Reserved',
      startOffset: 10,
      duration: 5,
      description:
        'Reservation URL: https://www.airbnb.com/hosting/reservations/details/XK29BMQP8L\\nPhone Number (Last 4 Digits): 9876',
    },
    {
      uid: 'c3d4e5f6a7b8-3456789012cdef01@airbnb.com',
      summary: 'Reserved',
      startOffset: 30,
      duration: 3,
      description:
        'Reservation URL: https://www.airbnb.com/hosting/reservations/details/PL77VCNX3R\\nPhone Number (Last 4 Digits): 4321',
    },
    {
      uid: 'd4e5f6a7b8c9-4567890123def012@airbnb.com',
      summary: 'Reserved',
      startOffset: 45,
      duration: 7,
      description:
        'Reservation URL: https://www.airbnb.com/hosting/reservations/details/QN88DWLY9K\\nPhone Number (Last 4 Digits): 1590',
    },
    {
      uid: 'e5f6a7b8c9d0-5678901234ef0123@airbnb.com',
      summary: 'Airbnb (Not available)',
      startOffset: 60,
      duration: 4,
    },
    {
      uid: 'f6a7b8c9d0e1-6789012345f01234@airbnb.com',
      summary: 'Airbnb (Not available)',
      startOffset: 75,
      duration: 14,
    },
  ], today);

  const manualBlockStart = addDays(today, 80);
  printSummary('Booking events', [
    {
      uid: 'a1b2c3d4e5f6001122334455667701@booking.com',
      summary: 'Reserved',
      startOffset: -20,
      duration: 3,
    },
    {
      uid: 'reservation-101@booking.com',
      summary: 'Reserved',
      startOffset: 12,
      duration: 6,
    },
    {
      uid: 'reservation-102@booking.com',
      summary: 'Reserved',
      startOffset: 33,
      duration: 4,
    },
    {
      uid: 'reservation-103@booking.com',
      summary: 'Reserved',
      startOffset: 50,
      duration: 2,
    },
    {
      uid: 'a1b2c3d4e5f6001122334455667705@booking.com',
      summary: 'CLOSED - Not available',
      startOffset: 62,
      duration: 5,
    },
    {
      uid: `blocked_${formatDate(manualBlockStart)}@booking.com`,
      summary: 'Not available',
      startOffset: 80,
      duration: 1,
    },
  ], today);
}

main();
