"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";

type Platform = "airbnb" | "booking";
type Mode = "export" | "import";

interface PlatformInstructionsProps {
  platform: Platform;
  mode: Mode;
  defaultOpen?: boolean;
}

interface InstructionData {
  title: string;
  steps: string[];
}

const DATA: Record<Locale, Record<Platform, Record<Mode, InstructionData>>> = {
  en: {
    airbnb: {
      export: {
        title: "How to find the Airbnb iCal export URL",
        steps: [
          "Open airbnb.com and go to your listing.",
          "Click \"Calendar\" in the top menu.",
          "Click the gear icon (Availability settings) on the right.",
          "Scroll to the \"Sync calendars\" section.",
          "Click \"Export Calendar\".",
          "Copy the URL (it starts with https://www.airbnb.com/calendar/ical/…).",
        ],
      },
      import: {
        title: "How to import Propical into Airbnb",
        steps: [
          "Back in Airbnb → Calendar → Availability settings.",
          "Find the \"Sync calendars\" section.",
          "If Booking.com is already linked there, remove it — replace with our URL.",
          "Click \"Import calendar\".",
          "Paste the URL above into the \"Calendar address (URL)\" field.",
          "Name it \"Propical Sync\" and click Import.",
        ],
      },
    },
    booking: {
      export: {
        title: "How to find the Booking.com iCal export URL",
        steps: [
          "Open admin.booking.com (Booking.com Extranet).",
          "Open Rates & Availability in the left menu.",
          "Click \"Sync calendars\" (sometimes \"Calendar Sync\").",
          "Find the \"Export\" section.",
          "Click \"Copy Link\" next to your iCal export URL.",
          "The URL looks like https://admin.booking.com/hotel/hoteladmin/ical.html?…",
        ],
      },
      import: {
        title: "How to import Propical into Booking.com",
        steps: [
          "Back in admin.booking.com → Rates & Availability → Sync calendars.",
          "If Airbnb is already linked there, remove it — replace with our URL.",
          "Find the \"Import\" section (or \"Add connection\").",
          "Paste the URL above into the iCal URL field.",
          "Name it \"Propical Sync\" and click Save.",
        ],
      },
    },
  },
  pt: {
    airbnb: {
      export: {
        title: "Como encontrar a URL de exportação iCal do Airbnb",
        steps: [
          "Abra o airbnb.com e vá até seu anúncio.",
          "Clique em \"Calendário\" no menu superior.",
          "Clique no ícone de engrenagem (Configurações de disponibilidade) à direita.",
          "Role até a seção \"Sincronizar calendários\".",
          "Clique em \"Exportar calendário\".",
          "Copie a URL (ela começa com https://www.airbnb.com/calendar/ical/…).",
        ],
      },
      import: {
        title: "Como importar o Propical no Airbnb",
        steps: [
          "De volta ao Airbnb → Calendário → Configurações de disponibilidade.",
          "Encontre a seção \"Sincronizar calendários\".",
          "Se o Booking.com já estiver vinculado lá, remova-o — substitua pela nossa URL.",
          "Clique em \"Importar calendário\".",
          "Cole a URL acima no campo \"Endereço do calendário (URL)\".",
          "Dê o nome \"Propical Sync\" e clique em Importar.",
        ],
      },
    },
    booking: {
      export: {
        title: "Como encontrar a URL de exportação iCal do Booking.com",
        steps: [
          "Abra o admin.booking.com (Extranet do Booking.com).",
          "Abra Tarifas e Disponibilidade no menu à esquerda.",
          "Clique em \"Sincronizar calendários\" (às vezes \"Calendar Sync\").",
          "Encontre a seção \"Exportar\".",
          "Clique em \"Copiar link\" ao lado da sua URL de exportação iCal.",
          "A URL se parece com https://admin.booking.com/hotel/hoteladmin/ical.html?…",
        ],
      },
      import: {
        title: "Como importar o Propical no Booking.com",
        steps: [
          "De volta ao admin.booking.com → Tarifas e Disponibilidade → Sincronizar calendários.",
          "Se o Airbnb já estiver vinculado lá, remova-o — substitua pela nossa URL.",
          "Encontre a seção \"Importar\" (ou \"Adicionar conexão\").",
          "Cole a URL acima no campo de URL iCal.",
          "Dê o nome \"Propical Sync\" e clique em Salvar.",
        ],
      },
    },
  },
  es: {
    airbnb: {
      export: {
        title: "Cómo encontrar la URL de exportación iCal de Airbnb",
        steps: [
          "Abra airbnb.com y vaya a su anuncio.",
          "Haga clic en \"Calendario\" en el menú superior.",
          "Haga clic en el icono de engranaje (Configuración de disponibilidad) a la derecha.",
          "Desplácese hasta la sección \"Sincronizar calendarios\".",
          "Haga clic en \"Exportar calendario\".",
          "Copie la URL (comienza con https://www.airbnb.com/calendar/ical/…).",
        ],
      },
      import: {
        title: "Cómo importar Propical en Airbnb",
        steps: [
          "De vuelta en Airbnb → Calendario → Configuración de disponibilidad.",
          "Busque la sección \"Sincronizar calendarios\".",
          "Si Booking.com ya está vinculado allí, elimínelo — reemplácelo con nuestra URL.",
          "Haga clic en \"Importar calendario\".",
          "Pegue la URL anterior en el campo \"Dirección del calendario (URL)\".",
          "Asígnele el nombre \"Propical Sync\" y haga clic en Importar.",
        ],
      },
    },
    booking: {
      export: {
        title: "Cómo encontrar la URL de exportación iCal de Booking.com",
        steps: [
          "Abra admin.booking.com (Extranet de Booking.com).",
          "Abra Tarifas y disponibilidad en el menú izquierdo.",
          "Haga clic en \"Sincronizar calendarios\" (a veces \"Calendar Sync\").",
          "Busque la sección \"Exportar\".",
          "Haga clic en \"Copiar enlace\" junto a su URL de exportación iCal.",
          "La URL se parece a https://admin.booking.com/hotel/hoteladmin/ical.html?…",
        ],
      },
      import: {
        title: "Cómo importar Propical en Booking.com",
        steps: [
          "De vuelta en admin.booking.com → Tarifas y disponibilidad → Sincronizar calendarios.",
          "Si Airbnb ya está vinculado allí, elimínelo — reemplácelo con nuestra URL.",
          "Busque la sección \"Importar\" (o \"Añadir conexión\").",
          "Pegue la URL anterior en el campo de URL iCal.",
          "Asígnele el nombre \"Propical Sync\" y haga clic en Guardar.",
        ],
      },
    },
  },
};

export function PlatformInstructions({ platform, mode, defaultOpen = false }: PlatformInstructionsProps) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  const data = DATA[locale][platform][mode];

  return (
    <div className="rounded-md border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <span>{data.title}</span>
        <svg
          className={`h-3.5 w-3.5 text-text-faint transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-border p-3">
          <ol className="space-y-1.5 text-sm text-text-muted">
            {data.steps.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-px shrink-0 rounded bg-surface-hover px-1.5 text-center font-mono text-sm text-text-muted">
                  {i + 1}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
