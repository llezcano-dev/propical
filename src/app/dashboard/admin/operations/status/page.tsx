"use client";

import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

// Status page sub-route at
// /dashboard/admin/operations/status. Pulls the "Admin · System status"
// section out of admin-panel.tsx into its own deep-linkable surface.
// The two health endpoints (app + calendar sync) are the same ones the
// legacy AdminPanel surfaced; SettingsPanel still renders its copy
// until the removal sweep ships, matching ticks 4 + 5.
//
// status.propical.com.br is now a BetterStack-hosted status page (uptime +
// incident history). It's deliberately external so it stays reachable
// even when the app itself is down — these /api/* health endpoints
// below are the on-box spot-checks, the external page is the public
// one. Linked as the third card.

interface CopyShape {
  title: string;
  subtitle: string;
  appHealth: string;
  syncHealth: string;
  externalTitle: string;
  externalDesc: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    title: "System status",
    subtitle: "Internal health endpoints for this instance. Use these to spot-check when sync is misbehaving or a 5xx slipped through.",
    appHealth: "App health",
    syncHealth: "Calendar sync health",
    externalTitle: "Public status page",
    externalDesc: "Uptime and incident history, hosted off-box so it stays reachable during a deploy.",
  },
  pt: {
    title: "Status do sistema",
    subtitle: "Endpoints internos de saúde desta instância. Use-os para verificações pontuais quando a sincronização estiver com problemas ou um 5xx passar despercebido.",
    appHealth: "Saúde do app",
    syncHealth: "Saúde da sincronização de calendários",
    externalTitle: "Página de status pública",
    externalDesc: "Disponibilidade e histórico de incidentes. Hospedada fora do servidor, acessível durante um deploy.",
  },
  es: {
    title: "Estado del sistema",
    subtitle: "Endpoints internos de salud de esta instancia. Úselos para hacer comprobaciones puntuales cuando el sync se comporte mal o se cuele un 5xx.",
    appHealth: "Salud de la app",
    syncHealth: "Salud del sync de calendarios",
    externalTitle: "Página de estado pública",
    externalDesc: "Disponibilidad e historial de incidencias. Alojada fuera del servidor, accesible durante un despliegue.",
  },
};

export default function AdminStatusPage() {
  const { locale } = useI18n();
  const t = COPY[locale];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="space-y-3">
        <a
          href="/api/health"
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-xl border border-border bg-surface-raised p-4 transition-all hover:border-border-strong hover:bg-surface-hover"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">
              {t.appHealth}
            </h3>
            <svg className="h-4 w-4 text-text-faint transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </div>
          <p className="mt-1 font-mono text-xs text-text-faint">/api/health</p>
        </a>

        <a
          href="/api/calendar/health"
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-xl border border-border bg-surface-raised p-4 transition-all hover:border-border-strong hover:bg-surface-hover"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">
              {t.syncHealth}
            </h3>
            <svg className="h-4 w-4 text-text-faint transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </div>
          <p className="mt-1 font-mono text-xs text-text-faint">/api/calendar/health</p>
        </a>

        <a
          href="https://status.propical.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-xl border border-border bg-surface-raised p-4 transition-all hover:border-border-strong hover:bg-surface-hover"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">
              {t.externalTitle}
            </h3>
            <svg className="h-4 w-4 text-text-faint transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </div>
          <p className="mt-1 font-mono text-xs text-text-faint">status.propical.com.br</p>
          <p className="mt-1.5 text-xs text-text-faint">{t.externalDesc}</p>
        </a>
      </div>
    </div>
  );
}
