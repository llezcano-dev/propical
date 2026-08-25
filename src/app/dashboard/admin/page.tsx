"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { eyebrowVariants } from "@/components/ui/atoms/eyebrow";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

// admin home upgrade. Replaces the tick-1 placeholder
// with (a) a tile grid of the migrated sub-routes so the admin shell
// has a useful landing surface, and (b) a "Recent activity" strip
// pulling the last 5 entries from /api/audit so the operator notices
// what changed since they last logged in. The audit endpoint is
// per-user (not a global feed); when the cross-user admin audit-log
// endpoint exists, this strip can be swapped in place.

interface AuditEntry {
  id: number;
  action: string;
  resourceType: string;
  resourceId: number;
  createdAt: string;
}

interface AuditResponse {
  entries?: AuditEntry[];
}

interface MeResponse {
  user?: { role: string } | null;
}

interface Tile {
  href: string;
  label: Record<Locale, string>;
  desc: Record<Locale, string>;
  // match the sidebar gating in layout.tsx so the
  // admin home only surfaces tiles whose underlying API the user can
  // actually call.
  requiresSuperadmin?: boolean;
}

const TILES: ReadonlyArray<{
  group: Record<Locale, string>;
  items: ReadonlyArray<Tile>;
}> = [
  {
    group: { en: "Account", pt: "Conta", es: "Cuenta" },
    items: [
      {
        href: "/dashboard/admin/account/profile",
        label: { en: "Profile", pt: "Perfil", es: "Perfil" },
        desc: { en: "Username, password, sessions.", pt: "Usuário, senha, sessões.", es: "Usuario, contraseña, sesiones." },
      },
      {
        href: "/dashboard/admin/account/preferences",
        label: { en: "Language & theme", pt: "Idioma e tema", es: "Idioma y tema" },
        desc: { en: "Per-browser display preferences.", pt: "Preferências de exibição por navegador.", es: "Preferencias de visualización por navegador." },
      },
      {
        href: "/dashboard/admin/account/export",
        label: { en: "Data export", pt: "Exportar dados", es: "Exportar datos" },
        desc: { en: "Download a JSON backup of your data.", pt: "Baixe um backup JSON dos seus dados.", es: "Descargue una copia de seguridad JSON de sus datos." },
      },
    ],
  },
  {
    group: { en: "Workspace", pt: "Espaço de trabalho", es: "Espacio de trabajo" },
    items: [
      {
        href: "/dashboard/admin/workspace/users",
        label: { en: "Users & roles", pt: "Usuários e funções", es: "Usuarios y roles" },
        desc: { en: "Admins and managers of this instance.", pt: "Administradores e gestores desta instância.", es: "Administradores y gestores de esta instancia." },
      },
      {
        href: "/dashboard/admin/workspace/properties",
        label: { en: "Properties", pt: "Propriedades", es: "Alojamientos" },
        desc: {
          en: "Key-settings summary across every accessible property.",
          pt: "Resumo dos ajustes principais de cada propriedade acessível.",
          es: "Resumen de los ajustes clave de cada alojamiento accesible.",
        },
      },
      {
        href: "/dashboard/admin/workspace/site-settings",
        label: { en: "Site settings", pt: "Configurações do site", es: "Configuración del sitio" },
        desc: { en: "Public signup, quotas, landing announcement.", pt: "Cadastro público, cotas, aviso na página inicial.", es: "Registro público, cuotas, aviso de portada." },
        requiresSuperadmin: true,
      },
      {
        href: "/dashboard/admin/workspace/cleaners",
        label: { en: "Cleaners", pt: "Profissionais de limpeza", es: "Personal de limpieza" },
        desc: {
          en: "Account-level cleaner pool. Per-property assignment lives on each property's Cleaning tab.",
          pt: "Equipe de limpeza em nível de conta. A atribuição por propriedade é feita na aba «Limpeza» da propriedade.",
          es: "Equipo de limpieza a nivel de cuenta. La asignación por alojamiento se hace en la pestaña «Limpieza» del alojamiento.",
        },
      },
      {
        href: "/dashboard/admin/workspace/message-templates",
        label: { en: "Message templates", pt: "Modelos de mensagens", es: "Plantillas de mensajes" },
        desc: {
          en: "Cross-property overview of guest-message templates.",
          pt: "Visão geral dos modelos de mensagens para hóspedes em todas as propriedades.",
          es: "Resumen de las plantillas de mensajes para huéspedes en todos los alojamientos.",
        },
      },
      {
        href: "/dashboard/admin/workspace/audit",
        label: { en: "Audit log", pt: "Registro de auditoria", es: "Registro de auditoría" },
        desc: { en: "Recent actions tied to your session.", pt: "Ações recentes associadas à sua sessão.", es: "Acciones recientes asociadas a su sesión." },
      },
    ],
  },
  {
    group: { en: "Integrations", pt: "Integrações", es: "Integraciones" },
    items: [
      {
        href: "/dashboard/admin/integrations/ical-links",
        label: { en: "iCal links", pt: "Links iCal", es: "Enlaces iCal" },
        desc: {
          en: "All calendar feeds across your properties — status + last sync.",
          pt: "Todos os feeds de calendário das suas propriedades: status e última sincronização.",
          es: "Todos los feeds de calendario de sus alojamientos: estado y último sync.",
        },
      },
      {
        href: "/dashboard/admin/integrations/feed-tokens",
        label: { en: "Feed access tokens", pt: "Tokens de acesso ao feed", es: "Tokens de acceso al feed" },
        desc: {
          en: "Per-property: public or token-gated iCal feed URL.",
          pt: "Por propriedade: URL do feed iCal pública ou protegida por token.",
          es: "Por alojamiento: URL del feed iCal pública o protegida por token.",
        },
      },
      {
        href: "/dashboard/admin/integrations/seo",
        label: { en: "SEO overrides", pt: "Overrides de SEO", es: "Overrides SEO" },
        desc: {
          en: "Override title, description, OG image, canonical per page.",
          pt: "Substituição de title, description, imagem OG e canonical por página.",
          es: "Override de title, description, imagen OG y canonical por página.",
        },
        requiresSuperadmin: true,
      },
      {
        href: "/dashboard/admin/integrations/platforms",
        label: { en: "Calendar platforms", pt: "Plataformas (calendário)", es: "Plataformas (calendario)" },
        desc: {
          en: "Edit colors, sort order, enable/disable. Add custom platforms.",
          pt: "Edite cores, ordem e ativação. Adicione plataformas personalizadas.",
          es: "Edite colores, orden y activación. Añada plataformas personalizadas.",
        },
        requiresSuperadmin: true,
      },
    ],
  },
  {
    group: { en: "Operations", pt: "Operações", es: "Operaciones" },
    items: [
      {
        href: "/dashboard/admin/operations/sync-logs",
        label: { en: "Sync logs", pt: "Logs de sincronização", es: "Logs de sync" },
        desc: {
          en: "Chronological feed of sync events across all properties.",
          pt: "Feed cronológico de eventos de sincronização em todas as propriedades.",
          es: "Feed cronológico de eventos de sync en todos los alojamientos.",
        },
      },
      {
        href: "/dashboard/admin/operations/scheduled-jobs",
        label: { en: "Scheduled jobs", pt: "Tarefas agendadas", es: "Tareas programadas" },
        desc: {
          en: "Cron jobs running on the host — schedule + description.",
          pt: "Tarefas cron no servidor: agendamento e descrição.",
          es: "Tareas cron en el servidor: planificación y descripción.",
        },
      },
      {
        href: "/dashboard/admin/operations/status",
        label: { en: "Status page", pt: "Página de status", es: "Página de estado" },
        desc: { en: "Internal health endpoints for spot checks.", pt: "Endpoints internos de saúde para verificações pontuais.", es: "Endpoints internos de salud para comprobaciones puntuales." },
      },
    ],
  },
  {
    group: { en: "Content", pt: "Conteúdo", es: "Contenido" },
    items: [
      {
        href: "/dashboard/admin/content/guest-forms",
        label: { en: "Guest form templates", pt: "Modelos de formulários para hóspedes", es: "Plantillas de formularios para huéspedes" },
        desc: {
          en: "Pre-arrival forms across properties — field count + submission count.",
          pt: "Formulários pré-chegada em todas as propriedades: número de campos e de respostas.",
          es: "Formularios previos a la llegada en todos los alojamientos: número de campos y de respuestas.",
        },
      },
    ],
  },
];

interface CopyShape {
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  daysAgo: (n: number) => string;
  dateLocale: string;
  title: string;
  subtitle: string;
  recentActivity: string;
  loading: string;
  noActivity: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    justNow: "just now",
    minutesAgo: (n) => `${n}m ago`,
    hoursAgo: (n) => `${n}h ago`,
    daysAgo: (n) => `${n}d ago`,
    dateLocale: "en-GB",
    title: "Admin",
    subtitle: "Consolidated settings home. More sections light up as they migrate from the legacy long-scroll settings page.",
    recentActivity: "Recent activity",
    loading: "Loading...",
    noActivity: "No activity yet.",
  },
  pt: {
    justNow: "agora mesmo",
    minutesAgo: (n) => `há ${n} min`,
    hoursAgo: (n) => `há ${n} h`,
    daysAgo: (n) => `há ${n} d`,
    dateLocale: "pt-BR",
    title: "Administração",
    subtitle: "Todos os ajustes em um só lugar. Mais seções serão adicionadas conforme migradas da antiga página de configurações.",
    recentActivity: "Atividade recente",
    loading: "Carregando...",
    noActivity: "Nenhuma atividade ainda.",
  },
  es: {
    justNow: "ahora mismo",
    minutesAgo: (n) => `hace ${n} min`,
    hoursAgo: (n) => `hace ${n} h`,
    daysAgo: (n) => `hace ${n} d`,
    dateLocale: "es-ES",
    title: "Administración",
    subtitle: "Todos los ajustes en un solo sitio. Se irán añadiendo más secciones a medida que se migren desde la antigua página de configuración.",
    recentActivity: "Actividad reciente",
    loading: "Cargando...",
    noActivity: "Aún no hay actividad.",
  },
};

export default function AdminHomePage() {
  const { locale } = useI18n();
  const t = COPY[locale];
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? (r.json() as Promise<MeResponse>) : null))
      .then((data) => setRole(data?.user?.role ?? null))
      .catch(() => setRole(null));
  }, []);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => (r.ok ? (r.json() as Promise<AuditResponse>) : null))
      .then((data) => {
        const rows = Array.isArray(data?.entries) ? data!.entries! : [];
        setEntries(rows.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setAuditLoaded(true));
  }, []);

  const isSuperadmin = role === "superadmin";
  const visibleTiles = TILES.map((group) => ({
    ...group,
    items: group.items.filter((tile) => isSuperadmin || !tile.requiresSuperadmin),
  })).filter((group) => group.items.length > 0);

  const formatRelative = (iso: string): string => {
    const then = new Date(iso).getTime();
    const diffMin = Math.floor((now - then) / 60000);
    if (diffMin < 1) return t.justNow;
    if (diffMin < 60) return t.minutesAgo(diffMin);
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return t.hoursAgo(diffHr);
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return t.daysAgo(diffDay);
    return new Date(iso).toLocaleDateString(t.dateLocale, {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      {/* Tile grid */}
      {visibleTiles.map((group) => (
        <section key={group.group.en} className="space-y-3">
          <h3 className={eyebrowVariants({ variant: "section" })}>
            {group.group[locale]}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-xl border border-border bg-surface-raised p-4 transition-all hover:border-border-strong hover:bg-surface-hover"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-text-primary">
                    {item.label[locale]}
                  </h4>
                  <svg className="h-4 w-4 text-text-faint transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
                <p className="mt-1.5 text-xs text-text-faint">
                  {item.desc[locale]}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* Recent activity strip */}
      <section className="space-y-3">
        <h3 className={eyebrowVariants({ variant: "section" })}>
          {t.recentActivity}
        </h3>
        <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
          {!auditLoaded ? (
            <div className="px-4 py-5 text-sm text-text-faint">
              {t.loading}
            </div>
          ) : entries.length === 0 ? (
            <div className="px-4 py-5 text-sm text-text-faint">
              {t.noActivity}
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="inline-flex shrink-0 rounded bg-surface-hover px-1.5 py-0.5 font-mono text-sm uppercase tracking-wide text-text-muted">
                    {e.action}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-text-secondary">
                    {e.resourceType}
                    <span className="text-text-faint"> #{e.resourceId}</span>
                  </span>
                  <span className="shrink-0 text-xs text-text-faint">
                    {formatRelative(e.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
