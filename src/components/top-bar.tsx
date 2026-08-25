"use client";

import { Fragment, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { SUPPORTED_LOCALES } from "@/lib/i18n/alternates";
import type { Property } from "@/lib/types";
import {
  allPropertiesDestination,
  requiresProperty,
  type AppView,
} from "@/lib/navigation";

interface CopyShape {
  tabDashboard: string;
  tabCalendar: string;
  tabCleaning: string;
  tabReports: string;
  tabConfig: string;
  allProperties: string;
  selectPropertyFirst: string;
  navMenu: string;
  countLabel: (resCount: number, guestCount: number) => string;
  addProperty: string;
  userMenu: string;
  personalAccount: string;
  theme: string;
  language: string;
  admin: string;
  syncTasks: string;
  refreshAll: string;
  refreshingAll: string;
  refreshAllDone: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    tabDashboard: "Dashboard",
    tabCalendar: "Calendar",
    tabCleaning: "Cleaning",
    tabReports: "Reports",
    tabConfig: "Settings",
    allProperties: "All properties",
    selectPropertyFirst: "Select a property first",
    navMenu: "Menu",
    countLabel: (resCount, guestCount) =>
      `${resCount} ${resCount === 1 ? "reservation" : "reservations"}, ${guestCount} ${guestCount === 1 ? "guest" : "guests"}`,
    addProperty: "Add property",
    userMenu: "User menu",
    personalAccount: "Personal account",
    theme: "Theme",
    language: "Language",
    admin: "Admin",
    syncTasks: "Sync tasks",
    refreshAll: "Refresh calendars",
    refreshingAll: "Refreshing…",
    refreshAllDone: "Calendars updated",
  },
  pt: {
    tabDashboard: "Painel",
    tabCalendar: "Calendário",
    tabCleaning: "Limpeza",
    tabReports: "Relatórios",
    tabConfig: "Configurações",
    allProperties: "Todas as propriedades",
    selectPropertyFirst: "Selecione uma propriedade primeiro",
    navMenu: "Menu",
    countLabel: (resCount, guestCount) =>
      `${resCount} ${resCount === 1 ? "reserva" : "reservas"}, ${guestCount} ${guestCount === 1 ? "hóspede" : "hóspedes"}`,
    addProperty: "Adicionar propriedade",
    userMenu: "Menu do usuário",
    personalAccount: "Conta pessoal",
    theme: "Tema",
    language: "Idioma",
    admin: "Admin",
    syncTasks: "Tarefas de sincronização",
    refreshAll: "Atualizar calendários",
    refreshingAll: "Atualizando…",
    refreshAllDone: "Calendários atualizados",
  },
  es: {
    tabDashboard: "Panel",
    tabCalendar: "Calendario",
    tabCleaning: "Limpieza",
    tabReports: "Informes",
    tabConfig: "Configuración",
    allProperties: "Todas las propiedades",
    selectPropertyFirst: "Selecciona una propiedad primero",
    navMenu: "Menú",
    countLabel: (resCount, guestCount) =>
      `${resCount} ${resCount === 1 ? "reserva" : "reservas"}, ${guestCount} ${guestCount === 1 ? "huésped" : "huéspedes"}`,
    addProperty: "Añadir alojamiento",
    userMenu: "Menú de usuario",
    personalAccount: "Cuenta personal",
    theme: "Tema",
    language: "Idioma",
    admin: "Admin",
    syncTasks: "Tareas de sincronización",
    refreshAll: "Actualizar calendarios",
    refreshingAll: "Actualizando…",
    refreshAllDone: "Calendarios actualizados",
  },
};

interface TopBarProps {
  properties: Property[];
  selectedPropertyId: number | null;
  activeView: AppView;
  onSelectProperty: (id: number | null) => void;
  onChangeView: (view: AppView) => void;
  // Atomic navigate that can change property + view together. Needed for
  // tab clicks like "Calendar" / "Cleaning" / "Settings" that require a
  // property — when none is selected we want to auto-pick the first one
  // AND land on the requested tab in a single nav, not two.
  onNavigate: (params: { property?: number | null; reservation?: number | null; view?: AppView }) => void;
  username: string;
  userRole: string;
  onLogout: () => void;
}

export function TopBar({
  properties,
  selectedPropertyId,
  activeView,
  onSelectProperty,
  onChangeView,
  onNavigate,
  username,
  userRole,
  onLogout,
}: TopBarProps) {
  const isSuperAdmin = userRole === "superadmin";
  const { t, locale, setLocale } = useI18n();
  const c = COPY[locale];
  const [propDropdown, setPropDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  // Mobile hamburger nav (replaces the scrollable tab row below lg).
  const [navOpen, setNavOpen] = useState(false);
  // Hide-on-scroll for the mobile header: the header slides away when the
  // user scrolls down the page and returns when they scroll up, so the
  // narrow viewport keeps as much usable screen as possible (Airbnb-style).
  // Desktop (lg+) never hides — the header is the primary nav there.
  const [headerHidden, setHeaderHidden] = useState(false);
  // "Refresh all calendars" — syncs every property the current user can
  // access (never other hosts'). idle → running → done (auto-resets).
  const [refreshState, setRefreshState] = useState<"idle" | "running" | "done">("idle");
  const propRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (propRef.current && !propRef.current.contains(e.target as Node)) setPropDropdown(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserDropdown(false);
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Hide-on-scroll: the dashboard scrolls inside <main>, so we listen to
  // that element (it is the only <main> on the page). Show when scrolling
  // up or when near the top; hide once scrolled past 64px while going down.
  // The menu being open pins the header visible.
  useEffect(() => {
    const scroller = document.querySelector("main");
    if (!scroller) return;
    let lastY = scroller.scrollTop;
    const onScroll = () => {
      if (navOpen) return;
      const y = scroller.scrollTop;
      const diff = y - lastY;
      lastY = y;
      if (diff > 2 && y > 64) setHeaderHidden(true);
      else if (diff < -2 || y <= 64) setHeaderHidden(false);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [navOpen]);

  // Tab clicks: the navbar mirrors the scope hierarchy from
  // src/lib/navigation.ts. Dashboard is the portfolio home and always drops
  // the property scope. Property-scoped tabs (Calendar, Config) are never
  // auto-picked anymore: with no property selected they navigate to their
  // `?view=` URL, where the page renders the "Selecione uma propriedade"
  // selector instead. Portfolio-capable tabs (Cleaning, Reports) just switch
  // the view within the current scope.
  const goToTab = (view: AppView) => {
    setNavOpen(false);
    if (view === "dashboard") {
      onNavigate({ property: null, reservation: null, view: "dashboard" });
      return;
    }
    if (requiresProperty(view) && !selectedPropertyId) {
      onNavigate({ property: null, reservation: null, view });
      return;
    }
    onChangeView(view);
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  // Refresh all of the current user's calendars. POST with no body —
  // the sync route scopes it to the caller's accessible properties.
  const handleRefreshAll = async () => {
    if (refreshState === "running") return;
    setRefreshState("running");
    try {
      await fetch("/api/calendar/sync", { method: "POST" });
      setRefreshState("done");
      setTimeout(() => setRefreshState("idle"), 3000);
    } catch {
      setRefreshState("idle");
    }
  };

  // Two scope groups, matching NAVBAR_TAB_GROUPS in lib/navigation:
  // group 0 works at portfolio level, group 1 is property-scoped. The
  // separator rendered between them communicates "to the right you need a
  // property" — the grouping is by scope, not by importance.
  const tabGroups: { key: AppView; label: string }[][] = [
    [
      { key: "dashboard", label: c.tabDashboard },
      { key: "cleaning", label: c.tabCleaning },
      { key: "reports", label: c.tabReports },
    ],
    [
      { key: "calendar", label: c.tabCalendar },
      { key: "sync", label: c.tabConfig },
    ],
  ];

  // Hover hint for property-scoped tabs rendered without a selected
  // property. The tab itself stays clickable — it lands on the view, whose
  // "Selecione uma propriedade" selector is the touch-friendly fallback for
  // the missing hover on mobile.
  const tabHint = (view: AppView) =>
    requiresProperty(view) && !selectedPropertyId
      ? c.selectPropertyFirst
      : undefined;

  return (
    <header
      className={`relative z-40 border-b border-border bg-surface-raised transition-all duration-300 ease-out ${
        headerHidden ? "h-0 overflow-hidden border-b-0 opacity-0" : "h-[72px] opacity-100"
      } lg:h-[72px] lg:overflow-visible lg:border-b lg:opacity-100`}
    >
      {/* Inner wrapper caps content width on ultra-wide screens (Airbnb
          pattern). The border-b + bg above stays full-width so the
          chrome still touches both edges of the viewport, but the
          actual logo / tabs / avatar stop spreading after ~1760px so
          they don't fly to the corners on a 4K monitor. */}
      <div className="mx-auto max-w-[1760px]">
      {/* Main bar — h-[72px] roughly matches Airbnb's host header, gives
          enough breathing room around the logo + nav cluster. */}
      <div className="relative flex h-[72px] items-center justify-between gap-3 px-3 sm:px-5">
        {/* LEFT: Mobile nav + Logo + Property selector */}
        <div className="flex items-center gap-3 min-w-0 z-10 max-w-[60%] sm:max-w-none">
          {/* Mobile hamburger nav — replaces the scrollable tab row below
              lg. Sits on the left (classic app pattern) so it doesn't sit
              next to the user menu's bars icon. Opens the same two scope
              groups (portfolio ║ property) in a dropdown, reusing goToTab
              so behaviour matches the desktop tabs exactly. Property-scoped
              tabs with no selected property show the inline hint instead of
              a hover tooltip (no hover on touch). */}
          <div className="relative lg:hidden shrink-0" ref={navRef}>
            <button
              onClick={() => setNavOpen(!navOpen)}
              aria-label={c.navMenu}
              aria-expanded={navOpen}
              className={`flex h-8 w-8 items-center justify-center rounded-lg bg-action-primary/10 text-action-primary-text transition-colors hover:bg-action-primary/15 ${
                navOpen ? "bg-action-primary/15" : ""
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                {navOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>

            {navOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-border-strong bg-surface-raised shadow-xl shadow-black/20 z-50 p-1.5">
                {tabGroups.map((group, gi) => (
                  <Fragment key={gi}>
                    {gi > 0 && <div className="my-1 h-px bg-border" />}
                    {group.map(tab => {
                      const active = activeView === tab.key;
                      const needsProperty = requiresProperty(tab.key) && !selectedPropertyId;
                      return (
                        <div key={tab.key}>
                          <button
                            onClick={() => goToTab(tab.key)}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                              active ? "bg-surface-hover text-text-primary font-medium" : "text-text-secondary hover:bg-surface-hover"
                            }`}
                          >
                            <span className="flex-1 text-left">{tab.label}</span>
                            {active && (
                              <svg className="h-4 w-4 shrink-0 text-action-primary-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                          {needsProperty && !active && (
                            <p className="px-3 pb-1.5 text-sm text-text-faint">{c.selectPropertyFirst}</p>
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onNavigate({ property: null, reservation: null, view: "dashboard" })}
            className="group flex items-center gap-2 shrink-0 rounded-xl text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-action-primary/50"
            aria-label="Dashboard home"
          >
            <BrandMark />
            <span className="hidden sm:block font-mono text-xl font-semibold tracking-[-0.02em]">propical</span>
          </button>

          {/* Property selector */}
          <div className="relative min-w-0" ref={propRef}>
            <button
              onClick={() => setPropDropdown(!propDropdown)}
              className="flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-sm text-text-primary hover:border-text-primary/40 transition-colors min-w-0 max-w-[180px] sm:max-w-[220px]"
            >
              <span className="flex-1 text-left truncate">
                {selectedProperty ? selectedProperty.name : c.allProperties}
              </span>
              <svg className={`h-4 w-4 shrink-0 text-text-faint transition-transform ${propDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {propDropdown && (
              <div className="absolute top-full left-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border-strong bg-surface-raised shadow-xl shadow-black/20 z-50">
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      // Neutral "Todas as propriedades" entry with a
                      // contextual destination (lib/navigation): dual
                      // views (Cleaning/Reports) keep the current view in
                      // its global form; property-scoped views land on the
                      // Panel. Same rule as the PropertySwitcher pills.
                      onNavigate({
                        property: null,
                        reservation: null,
                        view: allPropertiesDestination(activeView),
                      });
                      setPropDropdown(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      !selectedPropertyId ? "bg-surface-hover text-text-primary font-medium" : "text-text-secondary hover:bg-surface-hover"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                    {c.allProperties}
                  </button>

                  <div className="my-1 h-px bg-border-strong" />

                  {properties.map(p => {
                    const resCount = p.reservations.length;
                    const guestCount = p.reservations.reduce(
                      (sum, r) => sum + (r._count?.guests ?? 0),
                      0
                    );
                    const countLabel = c.countLabel(resCount, guestCount);
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          // Single atomic URL commit. Previously this
                          // ran onSelectProperty(p.id) and then a
                          // separate onChangeView("calendar"); the
                          // second navigate read selectedPropertyId
                          // from closure (still the OLD value) and
                          // overwrote the new property selection,
                          // which is why a fresh selection from the
                          // dashboard view used to need two clicks.
                          onNavigate({
                            property: p.id,
                            reservation: null,
                            view: activeView === "dashboard" ? "calendar" : activeView,
                          });
                          setPropDropdown(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                          p.id === selectedPropertyId ? "bg-surface-hover text-text-primary" : "text-text-secondary hover:bg-surface-hover"
                        }`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-action-primary/10 text-action-primary-text">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12L12 3l9.75 9M4.5 9.75v9.75A1.5 1.5 0 006 21h3.75v-6h4.5v6H18a1.5 1.5 0 001.5-1.5V9.75" />
                          </svg>
                        </span>
                        <span className="flex-1 min-w-0 text-left">
                          <span className={`block truncate ${p.id === selectedPropertyId ? "font-medium" : ""}`}>{p.name}</span>
                          <span className="block truncate text-sm text-text-faint">{countLabel}</span>
                        </span>
                        {p.id === selectedPropertyId && (
                          <svg className="h-4 w-4 shrink-0 text-action-primary-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                    );
                  })}

                  <div className="my-1 h-px bg-border-strong" />

                  {/* Adding a property is now a full page (with a
                      proper name + iCal feeds form), not a 1-input
                      inline prompt. The dropdown just routes there
                      so the entry stays as a one-click affordance. */}
                  <Link
                    href="/dashboard/add-property"
                    onClick={() => setPropDropdown(false)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-faint hover:bg-surface-hover hover:text-text-secondary"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    {c.addProperty}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Tabs (lg+ only). Absolute-centered like Airbnb so the
            left & right groups can size naturally without throwing off
            the centerline. pointer-events trick lets the wider invisible
            wrapper not eat clicks on logo/avatar. */}
        <nav className="absolute inset-x-0 top-0 bottom-0 mx-auto pointer-events-none hidden lg:flex items-center justify-center" aria-label="Primary">
          <div className="pointer-events-auto flex items-center">
            {tabGroups.map((group, gi) => (
              <Fragment key={gi}>
                {gi > 0 && (
                  <div className="mx-2 h-5 w-px shrink-0 bg-border-strong" aria-hidden="true" />
                )}
                {group.map(tab => (
                  <NavTab
                    key={tab.key}
                    label={tab.label}
                    active={activeView === tab.key}
                    onClick={() => goToTab(tab.key)}
                    hint={tabHint(tab.key)}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        </nav>

        {/* RIGHT: Avatar / user menu */}
        <div className="flex items-center gap-1 z-10 shrink-0">
          {/* User menu — Airbnb-style pill containing menu lines + avatar.
              All personal-cabinet items live here: theme, language, profile,
              personal settings, sync tasks, logout. */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserDropdown(!userDropdown)}
              className="flex items-center gap-2 rounded-full border border-border-strong bg-surface py-1 pl-2.5 pr-1 text-text-muted hover:shadow-md hover:border-border-strong transition-all"
              aria-label={c.userMenu}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              <div className="h-7 w-7 rounded-full bg-text-muted flex items-center justify-center text-sm font-semibold text-background uppercase">
                {username[0]}
              </div>
            </button>

            {userDropdown && (
              <div className="absolute top-full right-0 mt-2 w-64 rounded-xl border border-border-strong bg-surface-raised shadow-xl shadow-black/20 z-50 p-1.5">
                {/* Identity */}
                <div className="px-3 pt-2 pb-2.5">
                  <p className="text-sm font-semibold text-text-primary truncate">{username}</p>
                  <p className="text-sm text-text-faint">
                    {c.personalAccount}
                  </p>
                </div>

                <div className="h-px bg-border" />

                {/* Theme row */}
                <div className="flex items-center justify-between px-3 py-2 text-sm text-text-secondary">
                  <span>{c.theme}</span>
                  <ThemeToggle />
                </div>

                {/* Language row — render one button per supported locale.
                    Adding a 4th locale to SUPPORTED_LOCALES auto-renders
                    another button. Inline like the theme row: label on the
                    left, buttons on the right. (Originally stacked because
                    the app shipped 5 locales; SUPPORTED_LOCALES is 3 today,
                    so the inline layout fits comfortably.) */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-text-secondary">
                  <span className="shrink-0">{c.language}</span>
                  <div className="flex items-center rounded-md border border-border-strong overflow-hidden">
                    {SUPPORTED_LOCALES.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => setLocale(loc)}
                        className={`px-2 py-1 text-sm transition-colors ${locale === loc ? "bg-surface-hover text-text-primary" : "text-text-faint hover:text-text-secondary"}`}
                      >{loc.toUpperCase()}</button>
                    ))}
                  </div>
                </div>

                <div className="my-1 h-px bg-border" />

                {/* Profile is now a routed view, not a modal drawer, so it
                    feels like a real page (the user can deep-link, hit back,
                    and the page integrates with the rest of the dashboard
                    chrome). */}
                <button
                  onClick={() => { onChangeView("profile"); setUserDropdown(false); }}
                  className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    activeView === "profile" ? "bg-surface-hover text-text-primary" : "text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t("profile.title")}
                </button>

                {/* Admin — points at the new CMS-style admin shell at
                    /dashboard/admin. The legacy ?view=settings
                    SettingsPanel surface is still reachable via direct
                    URL until the removal sweep ships. */}
                {isSuperAdmin && (
                  <Link
                    href="/dashboard/admin"
                    onClick={() => setUserDropdown(false)}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1.5l9 4.5v6c0 5-3.5 9.5-9 11-5.5-1.5-9-6-9-11v-6l9-4.5z" />
                    </svg>
                    {c.admin}
                  </Link>
                )}

                {/* Sync tasks — now also superadmin-only since the page
                    exposes the cron URL + cross-property sync log, which
                    are operator-level concerns. */}
                {isSuperAdmin && (
                  <button
                    onClick={() => { onChangeView("tasks"); setUserDropdown(false); }}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                      activeView === "tasks" ? "bg-surface-hover text-text-primary" : "text-text-secondary hover:bg-surface-hover"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {c.syncTasks}
                  </button>
                )}

                <div className="my-1 h-px bg-border" />

                {/* Refresh all calendars — syncs every property this
                    user can access. The cron handles the system-wide
                    pass; this is the on-demand version for the host. */}
                <button
                  onClick={handleRefreshAll}
                  disabled={refreshState === "running"}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-60"
                >
                  <svg
                    className={`h-4 w-4 ${refreshState === "running" ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  {refreshState === "running"
                    ? c.refreshingAll
                    : refreshState === "done"
                      ? c.refreshAllDone
                      : c.refreshAll}
                </button>

                <div className="my-1 h-px bg-border" />

                <button
                  onClick={() => { onLogout(); setUserDropdown(false); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  {t("sidebar.logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </header>
  );
}

function NavTab({ label, active, onClick, hint }: { label: string; active: boolean; onClick: () => void; hint?: string }) {
  return (
    <button
      onClick={onClick}
      title={hint}
      className={`relative px-4 py-3 font-mono text-sm uppercase tracking-[0.09em] transition-colors ${
        active ? "text-text-primary" : "text-text-muted hover:text-text-primary"
      }`}
    >
      {label}
      {active && (
        <span className="pointer-events-none absolute left-3 right-3 bottom-0 h-[2px] rounded-full bg-text-primary" />
      )}
    </button>
  );
}
