/**
 * Navigation model for the dashboard shell.
 *
 * Pure, framework-free helpers that encode the URL ↔ navbar hierarchy
 * decisions:
 *
 * - The navbar groups tabs by *scope* (portfolio-capable vs property-scoped),
 *   while the URLs nest by *property* — the two hierarchies intentionally do
 *   not map 1:1 (known, accepted inconsistency).
 * - Views with a portfolio form (cleaning, reports) stay in the current view
 *   when the scope switches to "all properties"; strictly property-scoped
 *   views (calendar, sync, …) land on the Panel instead.
 * - Property-scoped tabs are never auto-picked anymore: without a property
 *   they render a "Selecione uma propriedade" selector.
 *
 * Keeping this logic here (instead of inline in top-bar / page) makes it
 * unit-testable without a DOM.
 */

export type AppView =
  | "dashboard"
  | "calendar"
  | "cleaning"
  | "sync"
  | "guest-form"
  | "guests"
  | "settings"
  | "tasks"
  | "reports"
  | "profile";

export const APP_VIEWS: readonly AppView[] = [
  "dashboard",
  "calendar",
  "cleaning",
  "sync",
  "guest-form",
  "guests",
  "settings",
  "tasks",
  "reports",
  "profile",
];

export function isAppView(value: string | null | undefined): value is AppView {
  return !!value && (APP_VIEWS as readonly string[]).includes(value);
}

/**
 * Views that only make sense inside a property context. When no property is
 * selected these render the "Selecione uma propriedade" selector instead of
 * falling through to the Panel (the old silent ghost state).
 */
export function requiresProperty(view: AppView): boolean {
  return (
    view === "calendar" ||
    view === "sync" ||
    view === "guest-form" ||
    view === "guests"
  );
}

/**
 * Views that have a meaningful portfolio-wide form. These are the tabs that
 * keep the current view when the scope switches to "all properties".
 */
export function hasPortfolioForm(view: AppView): boolean {
  return view === "dashboard" || view === "cleaning" || view === "reports";
}

/**
 * Destination of the neutral "Todas as propriedades" dropdown entry.
 *
 * - Dual views (cleaning, reports) → stay in the current view, now global.
 * - Property-scoped views (calendar, sync, guest-form, guests) → Panel, since
 *   they have no portfolio form.
 * - Everything else (dashboard, profile, settings, tasks) → Panel.
 */
export function allPropertiesDestination(activeView: AppView): AppView {
  if (activeView === "cleaning" || activeView === "reports") return activeView;
  return "dashboard";
}

/**
 * The navbar rendered as two scope groups. Group 0 works at portfolio level;
 * every view in group 1 is property-scoped and renders the selector when no
 * property is selected.
 *
 * `[Painel | Limpeza | Relatórios] ║ [Calendário | Configurações]`
 */
export const NAVBAR_TAB_GROUPS: { view: AppView }[][] = [
  [{ view: "dashboard" }, { view: "cleaning" }, { view: "reports" }],
  [{ view: "calendar" }, { view: "sync" }],
];

/**
 * Default view for a given context — used when the URL has no explicit
 * `view` param. Mirrors the hierarchy: a property's home is the calendar
 * (`/dashboard?property=X`), the portfolio home is the dashboard, and an open
 * reservation deep-links to the guest view.
 */
export function defaultViewFor(
  hasReservation: boolean,
  hasProperty: boolean,
): AppView {
  if (hasReservation) return "guests";
  if (hasProperty) return "calendar";
  return "dashboard";
}

/**
 * Resolve the active view from the raw `view` query param, falling back to
 * the context default when absent or invalid.
 */
export function resolveActiveView(
  rawView: string | null | undefined,
  hasReservation: boolean,
  hasProperty: boolean,
): AppView {
  if (isAppView(rawView)) return rawView;
  return defaultViewFor(hasReservation, hasProperty);
}
