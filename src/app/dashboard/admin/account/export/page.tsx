"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

// Data export sub-route at
// /dashboard/admin/account/export. Lifts the "Admin · Data export"
// section out of admin-panel.tsx (lines ~2451-2464) into its own
// deep-linkable surface. Uses the existing /api/admin/export-my-data
// endpoint, no API changes. SettingsPanel still keeps its copy until
// the removal sweep ships, matching ticks 4, 5, 9.

interface CopyShape {
  failedToPrepare: string;
  title: string;
  subtitle: string;
  preparing: string;
  download: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    failedToPrepare: "Could not prepare export",
    title: "Data export",
    subtitle: "Download a JSON dump of your own properties, reservations, guests, calendar links, message templates, and cleaning records. Useful as a personal backup.",
    preparing: "Preparing...",
    download: "Download JSON",
  },
  pt: {
    failedToPrepare: "Não foi possível preparar a exportação",
    title: "Exportação de dados",
    subtitle: "Baixe um dump JSON das suas propriedades, reservas, hóspedes, links de calendário, modelos de mensagens e registros de limpeza. Útil como backup pessoal.",
    preparing: "Preparando...",
    download: "Baixar JSON",
  },
  es: {
    failedToPrepare: "No se pudo preparar la exportación",
    title: "Exportar datos",
    subtitle: "Descargue un volcado JSON de sus alojamientos, reservas, huéspedes, enlaces iCal, plantillas de mensajes y registros de limpieza. Útil como copia de seguridad personal.",
    preparing: "Preparando...",
    download: "Descargar JSON",
  },
};

export default function AdminExportPage() {
  const { locale } = useI18n();
  const t = COPY[locale];
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const exportData = async () => {
    setExporting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/export-my-data");
      if (!res.ok) {
        setError(t.failedToPrepare);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `propical-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="rounded-xl border border-border bg-surface-raised p-5">
        <button
          type="button"
          onClick={exportData}
          disabled={exporting}
          className="h-10 rounded-md bg-action-primary px-5 text-sm font-medium text-action-primary-fg transition-colors hover:bg-action-primary-hover disabled:opacity-60"
        >
          {exporting ? t.preparing : t.download}
        </button>
        {error && (
          <p className="mt-3 text-xs text-rose-300">{error}</p>
        )}
      </div>
    </div>
  );
}
