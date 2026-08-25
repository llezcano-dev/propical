"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

// Scheduled jobs sub-route at
// /dashboard/admin/operations/scheduled-jobs. Read-only reference of
// the cron jobs that run for this Propical instance.
// Calendar sync runs via Vercel Cron (vercel.json) every 10 minutes;
// its history is surfaced per-event as SyncLog rows at
// /admin/operations/sync-logs. The list below mirrors vercel.json —
// keep in sync when cron config changes.

interface ScheduledJob {
  id: string;
  name: Record<Locale, string>;
  schedule: string;
  schedulePretty: Record<Locale, string>;
  description: Record<Locale, string>;
  link?: { href: string; label: Record<Locale, string> };
}

const JOBS: ReadonlyArray<ScheduledJob> = [
  {
    id: "calendar-sync",
    name: { en: "Calendar sync", pt: "Sincronização de calendários", es: "Sync de calendarios" },
    schedule: "*/10 * * * *",
    schedulePretty: { en: "Every 10 minutes", pt: "A cada 10 minutos", es: "Cada 10 minutos" },
    description: {
      en: "Pulls every CalendarLink's iCal feed, writes events into CalendarEvent, records the result into SyncLog. Runs via Vercel Cron.",
      pt: "Baixa o feed iCal de cada CalendarLink, grava os eventos em CalendarEvent e registra o resultado no SyncLog. Executado via Vercel Cron.",
      es: "Descarga el feed iCal de cada CalendarLink, escribe los eventos en CalendarEvent y registra el resultado en SyncLog. Se ejecuta via Vercel Cron.",
    },
    link: {
      href: "/dashboard/admin/operations/sync-logs",
      label: { en: "View sync logs", pt: "Ver logs de sincronização", es: "Ver logs de sync" },
    },
  },
];

interface CopyShape {
  title: string;
  subtitle: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    title: "Scheduled jobs",
    subtitle: "Cron jobs for this instance. Calendar sync runs via Vercel Cron (vercel.json) every 10 minutes — this page is reference only. Sync history is available on its own page.",
  },
  pt: {
    title: "Tarefas agendadas",
    subtitle: "Tarefas cron desta instância. A sincronização de calendários é executada via Vercel Cron (vercel.json) a cada 10 minutos — esta página é apenas de referência. O histórico de sincronização está disponível em sua própria página.",
  },
  es: {
    title: "Tareas programadas",
    subtitle: "Tareas cron de esta instancia. La sincronización de calendarios se ejecuta via Vercel Cron (vercel.json) cada 10 minutos: esta página es solo de referencia. El historial de sync está disponible en su propia página.",
  },
};

export default function AdminScheduledJobsPage() {
  const { locale } = useI18n();
  const t = COPY[locale];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="space-y-3">
        {JOBS.map((job) => (
          <div
            key={job.id}
            className="rounded-xl border border-border bg-surface-raised p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-text-primary">
                {job.name[locale]}
              </h3>
              <span className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-sm uppercase tracking-wide text-text-muted">
                {job.schedule}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-faint">
              {job.schedulePretty[locale]}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {job.description[locale]}
            </p>
            {job.link && (
              <div className="mt-2">
                <Link
                  href={job.link.href}
                  className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
                >
                  {job.link.label[locale]}
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
