"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

// Site settings sub-route at
// /dashboard/admin/workspace/site-settings. Lifts the "Admin · Site
// settings" section out of admin-panel.tsx into its own deep-linkable
// surface. Reuses /api/admin/site-settings GET/PUT (superadmin-gated).
// Non-superadmin users see a permission notice instead of the form.
// SettingsPanel still renders its copy until the removal sweep ships.

interface SiteSettingsMap {
  [key: string]: { value: string; updatedAt: string | null };
}

interface MeResponse {
  user?: { role: string } | null;
}

interface FieldDef {
  key: string;
  label: Record<Locale, string>;
  hint: Record<Locale, string>;
  type: "toggle" | "number" | "text" | "email";
  defaultValue: string;
}

const FIELDS: ReadonlyArray<FieldDef> = [
  {
    key: "signup_enabled",
    label: { en: "Public signup", pt: "Registro público", es: "Registro público" },
    hint: {
      en: "Toggle whether new accounts can be created.",
      pt: "Permite ou impede a criação de novas contas.",
      es: "Permite o impide la creación de nuevas cuentas.",
    },
    type: "toggle",
    defaultValue: "true",
  },
  {
    key: "landing_announcement",
    label: { en: "Landing announcement banner", pt: "Aviso na página inicial", es: "Aviso en la portada" },
    hint: {
      en: "Short message shown at the top of the public landing page. Leave empty to hide.",
      pt: "Mensagem curta exibida no topo da página inicial pública. Deixe vazio para ocultar.",
      es: "Mensaje corto que aparece en la parte superior de la portada pública. Déjelo vacío para ocultarlo.",
    },
    type: "text",
    defaultValue: "",
  },
  {
    key: "support_email",
    label: { en: "Support email", pt: "E-mail de suporte", es: "Correo de soporte" },
    hint: {
      en: "Public contact address surfaced in landing/footer/help.",
      pt: "Endereço de contato público exibido na página inicial, rodapé e ajuda.",
      es: "Dirección de contacto pública que aparece en la portada, el pie y la ayuda.",
    },
    type: "email",
    defaultValue: "",
  },
];

interface CopyShape {
  saved: string;
  failedToSave: string;
  title: string;
  subtitle: string;
  loading: string;
  notSuperadmin: string;
  enabled: string;
  disabled: string;
  saving: string;
  save: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    saved: "Saved. Cached settings refresh within 60s.",
    failedToSave: "Failed to save",
    title: "Site settings",
    subtitle: "Instance-wide settings that affect public pages and user quotas.",
    loading: "Loading...",
    notSuperadmin: "Only superadmins can edit instance-wide site settings.",
    enabled: "Enabled",
    disabled: "Disabled",
    saving: "Saving",
    save: "Save",
  },
  pt: {
    saved: "Salvo. O cache das configurações é atualizado em até 60 s.",
    failedToSave: "Falha ao salvar",
    title: "Configurações do site",
    subtitle: "Ajustes globais da instância que afetam as páginas públicas e as cotas dos usuários.",
    loading: "Carregando...",
    notSuperadmin: "Apenas superadministradores podem editar as configurações globais do site.",
    enabled: "Ativado",
    disabled: "Desativado",
    saving: "Salvando",
    save: "Salvar",
  },
  es: {
    saved: "Guardado. La caché de los ajustes se refresca en menos de 60 s.",
    failedToSave: "No se pudo guardar",
    title: "Configuración del sitio",
    subtitle: "Ajustes globales de la instancia que afectan a las páginas públicas y a las cuotas de los usuarios.",
    loading: "Cargando...",
    notSuperadmin: "Solo los superadministradores pueden editar los ajustes globales del sitio.",
    enabled: "Activado",
    disabled: "Desactivado",
    saving: "Guardando",
    save: "Guardar",
  },
};

export default function AdminSiteSettingsPage() {
  const { locale } = useI18n();
  const t = COPY[locale];
  const [role, setRole] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [settings, setSettings] = useState<SiteSettingsMap>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ key: string; text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? (r.json() as Promise<MeResponse>) : null))
      .then((data) => setRole(data?.user?.role ?? null))
      .catch(() => setRole(null))
      .finally(() => setRoleLoaded(true));
  }, []);

  const isSuperadmin = role === "superadmin";

  const load = async () => {
    const res = await fetch("/api/admin/site-settings");
    if (!res.ok) return;
    const data = (await res.json()) as SiteSettingsMap;
    setSettings(data);
    const next: Record<string, string> = {};
    for (const f of FIELDS) {
      next[f.key] = data[f.key]?.value ?? f.defaultValue;
    }
    setDrafts(next);
  };

  useEffect(() => {
    if (!isSuperadmin) return;
    void load();
  }, [isSuperadmin]);

  const saveKey = async (key: string, value: string) => {
    setSavingKey(key);
    setMessage(null);
    const res = await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSavingKey(null);
    if (res.ok) {
      setMessage({
        key,
        text: t.saved,
        ok: true,
      });
      await load();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage({
        key,
        text: data.error ?? t.failedToSave,
        ok: false,
      });
    }
    setTimeout(() => setMessage((m) => (m && m.key === key ? null : m)), 4000);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      {!roleLoaded ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-faint">
          {t.loading}
        </div>
      ) : !isSuperadmin ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-muted">
          {t.notSuperadmin}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-border bg-surface-raised p-5">
          {FIELDS.map((f) => {
            const draft = drafts[f.key] ?? f.defaultValue;
            const saved = settings[f.key]?.value ?? f.defaultValue;
            const dirty = draft !== saved;
            const label = f.label[locale];
            const hint = f.hint[locale];
            return (
              <div
                key={f.key}
                className="grid gap-2 border-b border-border/50 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <label className="block text-sm font-medium text-text-primary" htmlFor={`ss-${f.key}`}>
                    {label}
                  </label>
                  <p className="mt-0.5 text-xs text-text-faint">{hint}</p>
                  {message?.key === f.key && (
                    <p className={`mt-1 text-xs ${message.ok ? "text-emerald-300" : "text-rose-300"}`}>
                      {message.text}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {f.type === "toggle" ? (
                    <select
                      id={`ss-${f.key}`}
                      value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))}
                      className="h-10 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary"
                    >
                      <option value="true">{t.enabled}</option>
                      <option value="false">{t.disabled}</option>
                    </select>
                  ) : (
                    <input
                      id={`ss-${f.key}`}
                      type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                      value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))}
                      className="h-10 w-64 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary placeholder-text-faint outline-none transition-colors focus:border-text-primary focus:ring-1 focus:ring-text-primary/30"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => saveKey(f.key, draft)}
                    disabled={!dirty || savingKey === f.key}
                    className="h-10 rounded-md bg-action-primary px-4 text-sm font-medium text-action-primary-fg transition-colors hover:bg-action-primary-hover disabled:opacity-60"
                  >
                    {savingKey === f.key ? t.saving : t.save}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
