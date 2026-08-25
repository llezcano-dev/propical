"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { translateApiError } from "@/lib/api-errors";
import { AuditPanel } from "@/components/audit-panel";
import { PageHeader } from "@/components/ui/molecules/page-header";

interface CopyShape {
  dateLocale: string;
  subtitle: string;
  setPassword: string;
  setPasswordHint: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    dateLocale: "en",
    subtitle: "Personal info, password, and activity.",
    setPassword: "Set a password",
    setPasswordHint:
      "You signed in with Google. Set a password to also sign in with your email and password.",
  },
  pt: {
    dateLocale: "pt-BR",
    subtitle: "Dados pessoais, senha e atividade.",
    setPassword: "Definir uma senha",
    setPasswordHint:
      "Você entrou com o Google. Defina uma senha para entrar também com seu e-mail e senha.",
  },
  es: {
    dateLocale: "es-ES",
    subtitle: "Datos personales, contraseña y actividad.",
    setPassword: "Establecer una contraseña",
    setPasswordHint:
      "Inició sesión con Google. Establezca una contraseña para iniciar sesión también con su correo y contraseña.",
  },
};

interface ProfileUser {
  id: number;
  username: string;
  role: string;
  createdAt: string;
  hasPassword: boolean;
}

// Renders as a routed dashboard view (no modal overlay) — was a drawer
// but felt like a popup. Lives at activeView === "profile" inside the
// dashboard shell.
export function ProfilePanel() {
  const { t: tr, locale } = useI18n();
  const c = COPY[locale];
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(translateApiError(data, tr) || "Failed");
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(c.dateLocale, {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-sm">
        <div className="mb-5">
          <PageHeader
            level="h1"
            title={tr("profile.title")}
            titleClassName="text-xl font-semibold"
            subtitle={c.subtitle}
            subtitleClassName="mt-0.5 text-text-muted"
          />
        </div>

        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-text-faint">{tr("profile.username")}</dt>
          <dd className="text-text-primary">{user?.username ?? "…"}</dd>
          <dt className="text-text-faint">{tr("profile.role")}</dt>
          <dd className="text-text-primary">{user?.role ?? "—"}</dd>
          <dt className="text-text-faint">{tr("profile.createdAt")}</dt>
          <dd className="text-text-primary">{formatDate(user?.createdAt)}</dd>
        </dl>

        <form onSubmit={submit} className="mt-6 space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-text-primary">
            {user && !user.hasPassword ? c.setPassword : tr("profile.changePassword")}
          </h3>
          {user && !user.hasPassword && (
            <p className="text-caption">{c.setPasswordHint}</p>
          )}
          {/* Current-password field — shown for accounts that already
              have a real password (and while the profile loads). A
              Google-sign-in account has none, so it's hidden and the
              API sets the first password without it. */}
          {(!user || user.hasPassword) && (
          <div className="space-y-1.5">
            <label className="text-caption" htmlFor="curpw">{tr("profile.currentPassword")}</label>
            <input
              id="curpw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-9 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-text-primary"
              required
            />
          </div>
          )}
          <div className="space-y-1.5">
            <label className="text-caption" htmlFor="newpw">{tr("profile.newPassword")}</label>
            <input
              id="newpw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-9 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-text-primary"
              minLength={8}
              required
            />
          </div>

          {error && (
            <div className="rounded-md bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-500">{error}</div>
          )}
          {success && (
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-500">{tr("profile.saved")}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="h-9 w-full rounded-md bg-action-primary text-sm font-medium text-action-primary-fg transition-colors hover:bg-action-primary-hover disabled:opacity-50"
          >
            {tr("profile.save")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setAuditOpen(true)}
          className="mt-4 h-9 w-full rounded-md border border-border-strong text-sm text-text-primary transition-colors hover:bg-border-strong"
        >
          {tr("profile.recentActivity")}
        </button>

        <button
          type="button"
          onClick={async () => {
            const res = await fetch("/api/auth/export-data");
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `propical-data-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }}
          className="mt-2 h-9 w-full rounded-md border border-border-strong text-sm text-text-primary transition-colors hover:bg-border-strong"
        >
          {tr("profile.downloadData")}
        </button>

        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-text-primary">{tr("profile.dangerZone")}</h3>
          <p className="mt-1 text-caption">
            {tr("profile.deleteAccountDesc")}
          </p>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="mt-3 h-9 w-full rounded-md border border-rose-500/40 text-sm text-rose-500 transition-colors hover:bg-rose-500/10"
          >
            {tr("profile.deleteMyAccount")}
          </button>
        </div>
      </div>

      {deleteOpen && user && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-text-primary">{tr("profile.deleteAccountTitle")}</h3>
            <p className="mt-2 text-sm text-text-muted">
              {tr("profile.deleteConfirmPrefix")}{" "}
              <span className="font-mono text-text-primary">{user.username}</span>{" "}
              {tr("profile.deleteConfirmSuffix")}
            </p>

            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-caption" htmlFor="del-confirm">
                  {tr("profile.confirmUsername")}
                </label>
                <input
                  id="del-confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="h-9 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-rose-500"
                  autoComplete="off"
                />
              </div>
              {/* Password proof — skipped for Google-sign-in accounts,
                  which have none; the username confirmation above is
                  the intent check there. */}
              {user.hasPassword && (
                <div className="space-y-1.5">
                  <label className="text-caption" htmlFor="del-pw">
                    Current password
                  </label>
                  <input
                    id="del-pw"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="h-9 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-rose-500"
                    autoComplete="current-password"
                  />
                </div>
              )}
            </div>

            {deleteError && (
              <div className="mt-3 rounded-md bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-500">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleteBusy}
                className="h-9 flex-1 rounded-md border border-border-strong text-sm text-text-primary transition-colors hover:bg-border-strong"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deleteBusy ||
                  deleteConfirm !== user.username ||
                  (user.hasPassword && deletePassword.length === 0)
                }
                onClick={async () => {
                  setDeleteBusy(true);
                  setDeleteError("");
                  try {
                    const res = await fetch("/api/auth/delete-account", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        password: deletePassword,
                        confirmUsername: deleteConfirm,
                      }),
                    });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      setDeleteError(data.error || "Failed to delete");
                      return;
                    }
                    window.location.href = "/login";
                  } finally {
                    setDeleteBusy(false);
                  }
                }}
                className="h-9 flex-1 rounded-md bg-rose-500 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
              >
                {deleteBusy ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuditPanel open={auditOpen} onClose={() => setAuditOpen(false)} />
    </div>
  );
}
