"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, notFound } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { eyebrowVariants } from "@/components/ui/atoms/eyebrow";
import { canAccessAdmin } from "@/lib/admin-access";
import type { Locale } from "@/lib/i18n/translations";

// CMS admin shell skeleton. Sidebar + content pane.
// Sub-routes are added in subsequent ticks; for now only the admin
// home (`/dashboard/admin`) is wired. Other sidebar entries render as
// "coming soon" (muted, not clickable) so the visual structure is
// complete without 404ing out of the shell.

interface NavItem {
  label: Record<Locale, string>;
  href?: string;
  available?: boolean;
  // hide entries non-superadmins can't use. The
  // underlying API already returns 403, so previously these items
  // rendered for any logged-in user but bounced to a permission notice
  // on click. Hiding them at the sidebar level matches what the user
  // can actually do.
  requiresSuperadmin?: boolean;
}

interface NavGroup {
  label: Record<Locale, string>;
  items: NavItem[];
}

interface CopyShape {
  backToDashboard: string;
  admin: string;
  soon: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    backToDashboard: "Back to dashboard",
    admin: "Admin",
    soon: "soon",
  },
  pt: {
    backToDashboard: "Voltar ao painel",
    admin: "Administração",
    soon: "em breve",
  },
  es: {
    backToDashboard: "Volver al panel",
    admin: "Administración",
    soon: "pronto",
  },
};

const NAV: NavGroup[] = [
  {
    label: { en: "Account", pt: "Conta", es: "Cuenta" },
    items: [
      { label: { en: "Profile", pt: "Perfil", es: "Perfil" }, href: "/dashboard/admin/account/profile" },
      { label: { en: "Security & 2FA", pt: "Segurança e 2FA", es: "Seguridad y 2FA" } },
      { label: { en: "Sessions", pt: "Sessões", es: "Sesiones" } },
      { label: { en: "Language & theme", pt: "Idioma e tema", es: "Idioma y tema" }, href: "/dashboard/admin/account/preferences" },
      { label: { en: "Data export", pt: "Exportar dados", es: "Exportar datos" }, href: "/dashboard/admin/account/export" },
    ],
  },
  {
    label: { en: "Workspace", pt: "Espaço de trabalho", es: "Espacio de trabajo" },
    items: [
      { label: { en: "Users & roles", pt: "Usuários e funções", es: "Usuarios y roles" }, href: "/dashboard/admin/workspace/users" },
      { label: { en: "Site settings", pt: "Configurações do site", es: "Configuración del sitio" }, href: "/dashboard/admin/workspace/site-settings", requiresSuperadmin: true },
      { label: { en: "Properties", pt: "Propriedades", es: "Alojamientos" }, href: "/dashboard/admin/workspace/properties" },
      { label: { en: "Cleaners", pt: "Profissionais de limpeza", es: "Personal de limpieza" }, href: "/dashboard/admin/workspace/cleaners" },
      { label: { en: "Message templates", pt: "Modelos de mensagens", es: "Plantillas de mensajes" }, href: "/dashboard/admin/workspace/message-templates" },
      { label: { en: "Audit log", pt: "Auditoria", es: "Auditoría" }, href: "/dashboard/admin/workspace/audit" },
    ],
  },
  {
    label: { en: "Integrations", pt: "Integrações", es: "Integraciones" },
    items: [
      { label: { en: "Calendar platforms", pt: "Plataformas (calendário)", es: "Plataformas" }, href: "/dashboard/admin/integrations/platforms", requiresSuperadmin: true },
      { label: { en: "iCal links", pt: "Links iCal", es: "Enlaces iCal" }, href: "/dashboard/admin/integrations/ical-links" },
      { label: { en: "Feed access tokens", pt: "Tokens de acesso ao feed", es: "Tokens del feed" }, href: "/dashboard/admin/integrations/feed-tokens" },
      { label: { en: "SEO overrides", pt: "Overrides de SEO", es: "Overrides SEO" }, href: "/dashboard/admin/integrations/seo", requiresSuperadmin: true },
    ],
  },
  {
    label: { en: "Operations", pt: "Operações", es: "Operaciones" },
    items: [
      { label: { en: "Sync logs", pt: "Logs de sincronização", es: "Logs de sync" }, href: "/dashboard/admin/operations/sync-logs" },
      { label: { en: "Scheduled jobs", pt: "Tarefas agendadas", es: "Tareas" }, href: "/dashboard/admin/operations/scheduled-jobs" },
      { label: { en: "Property audit", pt: "Auditoria da propriedade", es: "Auditoría del alojamiento" }, href: "/dashboard/admin/operations/property-audit" },
      { label: { en: "Status page", pt: "Status", es: "Estado" }, href: "/dashboard/admin/operations/status" },
    ],
  },
  {
    label: { en: "Content", pt: "Conteúdo", es: "Contenido" },
    items: [
      { label: { en: "Feedback", pt: "Feedback", es: "Comentarios" }, href: "/dashboard/admin/content/feedback", requiresSuperadmin: true },
      { label: { en: "Guest form templates", pt: "Modelos de formulários para hóspedes", es: "Plantillas de formularios para huéspedes" }, href: "/dashboard/admin/content/guest-forms" },
    ],
  },
];

function AdminShell({ role, children }: { role: string; children: React.ReactNode }) {
  const { locale } = useI18n();
  const t = COPY[locale];
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSuperadmin = role === "superadmin";
  // Filter out superadmin-only entries; drop a group entirely if it has
  // nothing visible left (currently no group is fully gated, but this
  // future-proofs the shell for content-only-superadmin sections).
  const visibleNav = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => isSuperadmin || !item.requiresSuperadmin),
  })).filter((group) => group.items.length > 0);

  // Close drawer on route change (mobile UX).
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="editorial flex h-screen flex-col overflow-hidden bg-surface">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-raised px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary lg:hidden"
            aria-label="Toggle sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="hidden sm:inline">{t.backToDashboard}</span>
          </Link>
        </div>
        <h1 className="text-base font-semibold text-text-primary">
          {t.admin}
        </h1>
        <div className="w-[40px] sm:w-[150px]" />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — drawer on <lg, persistent on lg+ */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 top-14 z-30 bg-black/40 lg:hidden"
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 top-14 z-40 w-64 shrink-0 overflow-y-auto border-r border-border bg-surface-raised transition-transform lg:static lg:top-0 lg:z-auto lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="space-y-5 p-4">
            {visibleNav.map((group) => (
              <div key={group.label.en}>
                <div className={cn("mb-1.5 px-2", eyebrowVariants({ variant: "section" }))}>
                  {group.label[locale]}
                </div>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const label = item.label[locale];
                    const active = item.href && pathname === item.href;
                    if (!item.href) {
                      return (
                        <li key={label}>
                          <span className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-text-faint">
                            <span>{label}</span>
                            <span className="text-sm uppercase tracking-wide text-text-faint/70">
                              {t.soon}
                            </span>
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={label}>
                        <Link
                          href={item.href}
                          className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                            active
                              ? "bg-surface-hover text-text-primary"
                              : "text-text-secondary hover:bg-surface-hover/60 hover:text-text-primary"
                          }`}
                        >
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content pane */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 scrollbar-gutter-stable">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {(user) => {
        // Defense in depth. The middleware gates /api/admin/* at the
        // boundary, but these page routes under /dashboard/admin/* would
        // otherwise render for any signed-in user (the sidebar only *hides*
        // superadmin entries — the content pane still renders). 404 instead
        // of redirect so non-superadmins can't even probe the surface.
        if (!canAccessAdmin(user.role)) notFound();
        return <AdminShell role={user.role}>{children}</AdminShell>;
      }}
    </AuthGuard>
  );
}
