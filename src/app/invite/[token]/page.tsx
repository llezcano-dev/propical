"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthSubmit } from "@/components/auth-form";

type InviteStatus =
  | { status: "loading" }
  | { status: "valid"; propertyId: number; propertyName: string; invitedBy: string; expiresAt: string }
  | { status: "already_accepted"; propertyId: number; propertyName: string; invitedBy: string }
  | { status: "not_found" }
  | { status: "revoked" }
  | { status: "expired" }
  | { status: "used" }
  | { status: "error"; message: string };

interface CopyShape {
  loading: string;
  inviteHeading: string;
  invitingYou: string;
  scopeBlurb: string;
  accepting: string;
  accept: string;
  decline: string;
  alreadyAccepted: string;
  openApp: string;
  notFound: string;
  revoked: string;
  expired: string;
  used: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    loading: "Loading invite…",
    inviteHeading: "Property invitation",
    invitingYou: "is inviting you to manage",
    scopeBlurb: "You will get full management access — calendar, reservations, sync, cleanings. You cannot delete the property or manage other managers.",
    accepting: "Accepting…",
    accept: "Accept invitation",
    decline: "Decline",
    alreadyAccepted: "You already accepted this invitation.",
    openApp: "Open app",
    notFound: "Invitation not found.",
    revoked: "This invitation was revoked.",
    expired: "This invitation has expired.",
    used: "This invitation was already used by someone else.",
  },
  pt: {
    loading: "Carregando convite…",
    inviteHeading: "Convite de gestão",
    invitingYou: "está convidando você para gerenciar",
    scopeBlurb: "Você terá acesso completo de gestão: calendário, reservas, sincronização, limpeza. Não poderá excluir a propriedade nem gerenciar outros gestores.",
    accepting: "Aceitando…",
    accept: "Aceitar convite",
    decline: "Recusar",
    alreadyAccepted: "Você já aceitou este convite.",
    openApp: "Abrir app",
    notFound: "Convite não encontrado.",
    revoked: "Este convite foi revogado.",
    expired: "Este convite expirou.",
    used: "Este convite já foi usado por outra pessoa.",
  },
  es: {
    loading: "Cargando invitación…",
    inviteHeading: "Invitación de gestión",
    invitingYou: "le invita a gestionar",
    scopeBlurb: "Tendrá acceso completo de gestión: calendario, reservas, sync, limpieza. No podrá eliminar el alojamiento ni gestionar a otros gestores.",
    accepting: "Aceptando…",
    accept: "Aceptar invitación",
    decline: "Rechazar",
    alreadyAccepted: "Ya ha aceptado esta invitación.",
    openApp: "Abrir la app",
    notFound: "Invitación no encontrada.",
    revoked: "Esta invitación se ha revocado.",
    expired: "Esta invitación ha caducado.",
    used: "Esta invitación ya ha sido usada por otra persona.",
  },
};

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { locale } = useI18n();
  const t = COPY[locale];
  const [state, setState] = useState<InviteStatus>({ status: "loading" });
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/property-manager-invites/accept?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (r.status === 401) {
          // not logged in — redirect to login with return path
          router.replace(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
          return null;
        }
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          setState({ status: "error", message: data.error || `HTTP ${r.status}` });
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setState(data);
      })
      .catch((e) => {
        setState({ status: "error", message: e?.message || "Network error" });
      });
  }, [token, router]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch("/api/property-manager-invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ status: "error", message: data.error || `HTTP ${res.status}` });
        return;
      }
      // Success — redirect to dashboard
      router.replace("/dashboard");
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Network error" });
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="editorial min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[920px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-text-primary text-surface transition-transform group-hover:rotate-6">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12l9-9 9 9" />
                <path d="M5 10v10a1 1 0 0 0 1 1h4v-7h4v7h4a1 1 0 0 0 1-1V10" />
              </svg>
            </div>
            <span className="font-mono text-xl font-semibold tracking-[-0.02em] text-text-primary">propical</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <LocaleSwitcher />
          </nav>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:py-14">
        <div className="w-full max-w-[440px] rounded-xl border border-border bg-surface-raised p-6 sm:p-7 space-y-4">
          {state.status === "loading" && (
            <p className="text-center text-[14px] text-text-muted">
              {t.loading}
            </p>
          )}

          {state.status === "valid" && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-action-primary-soft">
                <svg className="h-7 w-7 text-action-primary-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-1.25 0-2.446-.236-3.546-.668A11.97 11.97 0 0112 21c-2.305 0-4.408-.867-6-2.292M15 19.128A9.38 9.38 0 0015.75 18c0-3.183-.86-6.165-2.36-8.737M2.25 12C2.25 6.477 6.477 2.25 12 2.25S21.75 6.477 21.75 12s-4.227 9.75-9.75 9.75S2.25 17.523 2.25 12z" />
                </svg>
              </div>
              <div className="text-center space-y-1.5">
                <h1 className="display text-[20px] font-semibold tracking-tight text-text-primary">
                  {t.inviteHeading}
                </h1>
                <p className="text-[14px] text-text-secondary">
                  <span className="font-medium text-text-primary">{state.invitedBy}</span>{" "}
                  {t.invitingYou}{" "}
                  <span className="font-medium text-text-primary">{state.propertyName}</span>.
                </p>
                <p className="text-sm text-text-muted">
                  {t.scopeBlurb}
                </p>
              </div>
              <AuthSubmit type="button" loading={accepting} onClick={handleAccept}>
                {accepting ? t.accepting : t.accept}
              </AuthSubmit>
              <button
                type="button"
                onClick={() => router.replace("/dashboard")}
                className="h-11 w-full rounded-md border border-border-strong bg-surface text-[14px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                {t.decline}
              </button>
            </>
          )}

          {state.status === "already_accepted" && (
            <>
              <p className="text-center text-[14px] text-text-secondary">
                {t.alreadyAccepted}
              </p>
              <AuthSubmit type="button" onClick={() => router.replace("/dashboard")}>
                {t.openApp}
              </AuthSubmit>
            </>
          )}

          {(state.status === "not_found" || state.status === "revoked" || state.status === "expired" || state.status === "used") && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-action-primary-soft">
                <svg className="h-7 w-7 text-action-primary-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-center text-[14px] text-text-primary">
                {state.status === "not_found" && t.notFound}
                {state.status === "revoked" && t.revoked}
                {state.status === "expired" && t.expired}
                {state.status === "used" && t.used}
              </p>
              <button
                type="button"
                onClick={() => router.replace("/dashboard")}
                className="h-11 w-full rounded-md border border-border-strong bg-surface text-[14px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                {t.openApp}
              </button>
            </>
          )}

          {state.status === "error" && (
            <p className="text-center text-[14px] text-action-primary-text">{state.message}</p>
          )}
        </div>
      </main>
    </div>
  );
}
