"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { PageHeader } from "@/components/ui/molecules/page-header";

// Properties overview at
// /dashboard/admin/workspace/properties. Read-only summary table of
// every property the user can access (own or manage), with the
// settings that drive availability + cleaning at a glance: minimum
// nights, check-in/out times, booking window, cleaning toggle, and
// reservation count. Edits stay in the per-property Sync settings;
// each row links there. Useful for hosts running 5+ properties to
// spot config drift across the portfolio (e.g. one property with a
// 1-night minimum, others 3).
//
// Reuses GET /api/properties — no API change. Cleaners get an empty
// array from that endpoint (filtered server-side), so the page
// renders the empty state for them.

interface Reservation {
  id: number;
}

interface Property {
  id: number;
  name: string;
  userId: number;
  minNights: number;
  checkInTime: string;
  checkOutTime: string;
  bookingWindow: number;
  cleaningEnabled: boolean;
  createdAt: string;
  reservations: Reservation[];
}

interface MeResponse {
  user?: { id: number } | null;
}

interface CopyShape {
  failedToLoad: string;
  title: string;
  subtitle: string;
  loading: string;
  empty: string;
  hPropery: string;
  hRole: string;
  hBookings: string;
  hMinNights: string;
  hCheckInOut: string;
  hWindow: string;
  hCleaning: string;
  owner: string;
  manager: string;
  on: string;
  off: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    failedToLoad: "Failed to load",
    title: "Properties",
    subtitle: "Key-settings summary across every accessible property. Edit each property's settings on its Sync tab.",
    loading: "Loading...",
    empty: "No accessible properties yet.",
    hPropery: "Property",
    hRole: "Role",
    hBookings: "Bookings",
    hMinNights: "Min nights",
    hCheckInOut: "Check-in / out",
    hWindow: "Window (d)",
    hCleaning: "Cleaning",
    owner: "Owner",
    manager: "Manager",
    on: "On",
    off: "Off",
  },
  pt: {
    failedToLoad: "Erro ao carregar",
    title: "Propriedades",
    subtitle: "Resumo dos ajustes principais de cada propriedade acessível. Edite os ajustes de cada propriedade na sua aba Sync.",
    loading: "Carregando...",
    empty: "Ainda não há propriedades acessíveis.",
    hPropery: "Propriedade",
    hRole: "Função",
    hBookings: "Reservas",
    hMinNights: "Mín. de noites",
    hCheckInOut: "Check-in / check-out",
    hWindow: "Janela (d)",
    hCleaning: "Limpeza",
    owner: "Proprietário",
    manager: "Gestor",
    on: "Ativada",
    off: "Desativada",
  },
  es: {
    failedToLoad: "Error al cargar",
    title: "Alojamientos",
    subtitle: "Resumen de los ajustes clave de cada alojamiento accesible. Edite los ajustes de cada alojamiento en su pestaña de Sync.",
    loading: "Cargando...",
    empty: "Aún no hay alojamientos accesibles.",
    hPropery: "Alojamiento",
    hRole: "Rol",
    hBookings: "Reservas",
    hMinNights: "Noches mín.",
    hCheckInOut: "Entrada / salida",
    hWindow: "Ventana (d)",
    hCleaning: "Limpieza",
    owner: "Propietario",
    manager: "Gestor",
    on: "Activa",
    off: "Inactiva",
  },
};

export default function AdminPropertiesPage() {
  const { locale } = useI18n();
  const t = COPY[locale];
  const [props, setProps] = useState<Property[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/properties").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/auth/me").then((r) => (r.ok ? (r.json() as Promise<MeResponse>) : null)),
    ])
      .then(([propsData, meData]) => {
        if (Array.isArray(propsData)) setProps(propsData);
        else setError(t.failedToLoad);
        setMeId(meData?.user?.id ?? null);
      })
      .catch(() => setError(t.failedToLoad))
      .finally(() => setLoaded(true));
  }, [t.failedToLoad]);

  const sorted = useMemo(
    () => [...props].sort((a, b) => a.name.localeCompare(b.name)),
    [props]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      {!loaded ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-faint">
          {t.loading}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-5 text-sm text-rose-300">
          {error}
        </div>
      ) : props.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-muted">
          {t.empty}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-hover/40 text-sm uppercase tracking-wide text-text-faint">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">
                    {t.hPropery}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t.hRole}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t.hBookings}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t.hMinNights}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t.hCheckInOut}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t.hWindow}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t.hCleaning}
                  </th>
                  <th className="w-10 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sorted.map((p) => {
                  const isOwner = meId !== null && p.userId === meId;
                  return (
                    <tr key={p.id} className="text-text-secondary">
                      <td className="px-4 py-2.5 font-medium text-text-primary">{p.name}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide ${
                            isOwner
                              ? "bg-sky-400/15 text-sky-300"
                              : "bg-surface-hover text-text-muted"
                          }`}
                        >
                          {isOwner ? t.owner : t.manager}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{p.reservations.length}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{p.minNights}</td>
                      <td className="px-3 py-2.5 tabular-nums text-text-muted">
                        {p.checkInTime} / {p.checkOutTime}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{p.bookingWindow}</td>
                      <td className="px-3 py-2.5">
                        {p.cleaningEnabled ? (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-emerald-300">
                            {t.on}
                          </span>
                        ) : (
                          <span className="rounded bg-surface-hover px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-text-faint">
                            {t.off}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/dashboard?property=${p.id}&view=sync`}
                          className="text-xs text-text-muted hover:text-text-primary hover:underline"
                        >
                          →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
