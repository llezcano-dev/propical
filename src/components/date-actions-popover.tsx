"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { eyebrowVariants } from "@/components/ui/atoms/eyebrow";
import { chipVariants } from "@/components/ui/atoms/chip";
import { resolvePlatformMeta } from "@/lib/platform-meta";
import type { Locale } from "@/lib/i18n/translations";

interface CopyShape {
  dateLocale: string;
  staysTurnover: (count: number) => string;
  manualCleaning: string;
  blockDate: string;
  blockDateDesc: string;
  scheduleCleaning: string;
  scheduleCleaningDesc: string;
  makeAvailable: string;
  makeAvailableDesc: string;
  unblockDate: string;
  removeCleaning: string;
  resetOverride: string;
  resetOverrideDesc: string;
  createReservation: string;
  createReservationDesc: string;
  cancelCleaningOnBooked: string;
  cancelCleaningOnBookedDesc: string;
  removeCleaningDescAuto: string;
  cancelCleaningOnAuto: string;
  cancelCleaningOnAutoDesc: string;
  blockAll: (count: number) => string;
  scheduleAll: (count: number) => string;
  openAll: (count: number) => string;
  resetAll: (count: number) => string;
  createBulk: (count: number) => string;
  createBulkDesc: string;
  noActions: string;
  selectedDates: string;
  daysCount: (count: number) => string;
  bookedDisabled: (count: number) => string;
  contiguousRange: string;
  nonContiguous: string;
  close: string;
  checkingOut: string;
  checkingIn: string;
  singleDayStay: string;
  staying: string;
  cleanLabel: string;
  cleaningScheduled: string;
  cleaningRequired: string;
  betweenStays: string;
  removeFromSelection: string;
  guestName: string;
  guestNamePlaceholder: string;
  platform: string;
  platformDirect: string;
  checkInLabel: string;
  checkOutLabel: string;
  nightsParenthetical: (count: number) => string;
  linkToBooking: string;
  beforeCheckIn: string;
  afterCheckOut: string;
  stayLabel: string;
  addNights: (nights: number, side: string) => string;
  cancel: string;
  saving: string;
  save: string;
  /** Trim a manual reservation by clicking a date INSIDE its bar.
   *  Two flavours: clicking a midstay day shortens the bar to end on
   *  that day; clicking the existing checkout day removes that one
   *  day from the booking. The {date} token is replaced with a
   *  short-format date label by the caller. */
  trimToDate: (date: string) => string;
  trimToDateDesc: string;
  trimRemoveDate: (date: string) => string;
  trimRemoveDateDesc: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    dateLocale: "en-GB",
    staysTurnover: (count) => `${count} stays — turnover`,
    manualCleaning: "Manual cleaning",
    blockDate: "Block this date",
    blockDateDesc: "Stop new bookings. No cleaning chip.",
    scheduleCleaning: "Schedule cleaning",
    scheduleCleaningDesc: "Block the date and mark it as a cleaning slot.",
    makeAvailable: "Make available for booking",
    makeAvailableDesc: "Ignore buffer / min-nights for this date.",
    unblockDate: "Unblock this date",
    removeCleaning: "Remove cleaning",
    resetOverride: "Reset to default",
    resetOverrideDesc: "Return this date to its auto-detected state.",
    createReservation: "Create reservation",
    createReservationDesc: "Add a reservation starting on this date.",
    cancelCleaningOnBooked: "Cancel cleaning",
    cancelCleaningOnBookedDesc: "Free this date from the cleaning — schedule it on another day.",
    removeCleaningDescAuto: "Go back to the auto-detected hint.",
    cancelCleaningOnAuto: "Cancel cleaning",
    cancelCleaningOnAutoDesc: "Free up this date — schedule cleaning on another day instead.",
    blockAll: (count) => `Block all (${count})`,
    scheduleAll: (count) => `Schedule cleaning (${count})`,
    openAll: (count) => `Make available (${count})`,
    resetAll: (count) => `Reset overrides (${count})`,
    createBulk: (count) => `Create reservation (${count} ${count === 1 ? "night" : "nights"})`,
    createBulkDesc: "One reservation covering all selected days.",
    noActions: "No actions available.",
    selectedDates: "Selected dates",
    daysCount: (count) => (count === 1 ? "day" : "days"),
    bookedDisabled: (count) => `${count} booked — bulk actions disabled`,
    contiguousRange: "Contiguous range",
    nonContiguous: "Non-contiguous",
    close: "Close",
    checkingOut: "checking out",
    checkingIn: "checking in",
    singleDayStay: "single-day stay",
    staying: "staying",
    cleanLabel: "Clean",
    cleaningScheduled: "Cleaning scheduled",
    cleaningRequired: "Cleaning required",
    betweenStays: "between stays",
    removeFromSelection: "Remove from selection",
    guestName: "Guest name",
    guestNamePlaceholder: "Jane Doe",
    platform: "Platform",
    platformDirect: "Direct",
    checkInLabel: "Check-in:",
    checkOutLabel: "Check-out:",
    nightsParenthetical: (count) => `(${count} ${count === 1 ? "night" : "nights"})`,
    linkToBooking: "Link to an existing booking",
    beforeCheckIn: "before check-in",
    afterCheckOut: "after check-out",
    stayLabel: "Stay",
    addNights: (nights, side) =>
      `Add ${nights} ${nights === 1 ? "night" : "nights"} ${side}`,
    cancel: "Cancel",
    saving: "Saving…",
    save: "Save",
    trimToDate: (date) => `End reservation on ${date}`,
    trimToDateDesc: "Shorten this booking so the chosen day is the last one.",
    trimRemoveDate: (date) => `Remove ${date} from reservation`,
    trimRemoveDateDesc: "Drop this last day from the booking.",
  },
  pt: {
    dateLocale: "pt-BR",
    staysTurnover: (count) => `${count} ${count === 1 ? "estadia" : "estadias"} — rotatividade`,
    manualCleaning: "Limpeza manual",
    blockDate: "Bloquear esta data",
    blockDateDesc: "Impede novas reservas. Sem chip de limpeza.",
    scheduleCleaning: "Agendar limpeza",
    scheduleCleaningDesc: "Bloqueia a data e a marca como turno de limpeza.",
    makeAvailable: "Disponibilizar para reserva",
    makeAvailableDesc: "Ignora o buffer e as noites mínimas para esta data.",
    unblockDate: "Desbloquear esta data",
    removeCleaning: "Remover limpeza",
    resetOverride: "Restaurar o estado padrão",
    resetOverrideDesc: "Retorna a data ao seu estado detectado automaticamente.",
    createReservation: "Criar reserva",
    createReservationDesc: "Adiciona uma reserva que começa nesta data.",
    cancelCleaningOnBooked: "Cancelar limpeza",
    cancelCleaningOnBookedDesc: "Libera esta data da limpeza — agende em outro dia.",
    removeCleaningDescAuto: "Retorna à sugestão detectada automaticamente.",
    cancelCleaningOnAuto: "Cancelar limpeza",
    cancelCleaningOnAutoDesc: "Libera esta data — agende a limpeza em outro dia.",
    blockAll: (count) => `Bloquear todas (${count})`,
    scheduleAll: (count) => `Agendar limpeza (${count})`,
    openAll: (count) => `Disponibilizar (${count})`,
    resetAll: (count) => `Restaurar overrides (${count})`,
    createBulk: (count) => `Criar reserva (${count} ${count === 1 ? "noite" : "noites"})`,
    createBulkDesc: "Uma única reserva que cobre todos os dias selecionados.",
    noActions: "Não há ações disponíveis.",
    selectedDates: "Datas selecionadas",
    daysCount: (count) => (count === 1 ? "dia" : "dias"),
    bookedDisabled: (count) => `${count} reservadas — ações em massa desativadas`,
    contiguousRange: "Faixa contígua",
    nonContiguous: "Não contígua",
    close: "Fechar",
    checkingOut: "check-out",
    checkingIn: "check-in",
    singleDayStay: "estadia de um dia",
    staying: "hospedado",
    cleanLabel: "Limpeza",
    cleaningScheduled: "Limpeza agendada",
    cleaningRequired: "Limpeza necessária",
    betweenStays: "entre estadias",
    removeFromSelection: "Remover da seleção",
    guestName: "Nome do hóspede",
    guestNamePlaceholder: "Maria Silva",
    platform: "Plataforma",
    platformDirect: "Direta",
    checkInLabel: "Check-in:",
    checkOutLabel: "Check-out:",
    nightsParenthetical: (count) => `(${count} ${count === 1 ? "noite" : "noites"})`,
    linkToBooking: "Vincular a uma reserva existente",
    beforeCheckIn: "antes do check-in",
    afterCheckOut: "depois do check-out",
    stayLabel: "Estadia",
    addNights: (nights, side) =>
      `Adicionar ${nights} ${nights === 1 ? "noite" : "noites"} ${side}`,
    cancel: "Cancelar",
    saving: "Salvando…",
    save: "Salvar",
    trimToDate: (date) => `Encerrar a reserva em ${date}`,
    trimToDateDesc: "Encurta a reserva para que o dia escolhido seja o último.",
    trimRemoveDate: (date) => `Remover ${date} da reserva`,
    trimRemoveDateDesc: "Remove este último dia da reserva.",
  },
  es: {
    dateLocale: "es-ES",
    staysTurnover: (count) => `${count} ${count === 1 ? "estancia" : "estancias"} — rotación`,
    manualCleaning: "Limpieza manual",
    blockDate: "Bloquear esta fecha",
    blockDateDesc: "Detiene nuevas reservas. Sin chip de limpieza.",
    scheduleCleaning: "Programar limpieza",
    scheduleCleaningDesc: "Bloquea la fecha y la marca como turno de limpieza.",
    makeAvailable: "Habilitar para reservar",
    makeAvailableDesc: "Ignora el buffer y las noches mínimas para esta fecha.",
    unblockDate: "Desbloquear esta fecha",
    removeCleaning: "Quitar limpieza",
    resetOverride: "Restablecer al estado por defecto",
    resetOverrideDesc: "Devuelve la fecha a su estado detectado automáticamente.",
    createReservation: "Crear reserva",
    createReservationDesc: "Añade una reserva que empiece en esta fecha.",
    cancelCleaningOnBooked: "Cancelar limpieza",
    cancelCleaningOnBookedDesc: "Libera esta fecha de la limpieza — prográmela otro día.",
    removeCleaningDescAuto: "Vuelve a la sugerencia detectada automáticamente.",
    cancelCleaningOnAuto: "Cancelar limpieza",
    cancelCleaningOnAutoDesc: "Libera esta fecha — programe la limpieza otro día.",
    blockAll: (count) => `Bloquear todas (${count})`,
    scheduleAll: (count) => `Programar limpieza (${count})`,
    openAll: (count) => `Habilitar (${count})`,
    resetAll: (count) => `Restablecer overrides (${count})`,
    createBulk: (count) => `Crear reserva (${count} ${count === 1 ? "noche" : "noches"})`,
    createBulkDesc: "Una sola reserva que cubre todos los días seleccionados.",
    noActions: "No hay acciones disponibles.",
    selectedDates: "Fechas seleccionadas",
    daysCount: (count) => (count === 1 ? "día" : "días"),
    bookedDisabled: (count) => `${count} reservadas — acciones masivas desactivadas`,
    contiguousRange: "Rango continuo",
    nonContiguous: "No continuo",
    close: "Cerrar",
    checkingOut: "salida",
    checkingIn: "entrada",
    singleDayStay: "estancia de un día",
    staying: "alojado",
    cleanLabel: "Limpieza",
    cleaningScheduled: "Limpieza programada",
    cleaningRequired: "Limpieza necesaria",
    betweenStays: "entre estancias",
    removeFromSelection: "Quitar de la selección",
    guestName: "Nombre del huésped",
    guestNamePlaceholder: "Juan García",
    platform: "Plataforma",
    platformDirect: "Directa",
    checkInLabel: "Entrada:",
    checkOutLabel: "Salida:",
    nightsParenthetical: (count) => `(${count} ${count === 1 ? "noche" : "noches"})`,
    linkToBooking: "Vincular a una reserva existente",
    beforeCheckIn: "antes de la entrada",
    afterCheckOut: "después de la salida",
    stayLabel: "Estancia",
    addNights: (nights, side) =>
      `Añadir ${nights} ${nights === 1 ? "noche" : "noches"} ${side}`,
    cancel: "Cancelar",
    saving: "Guardando…",
    save: "Guardar",
    trimToDate: (date) => `Terminar la reserva el ${date}`,
    trimToDateDesc: "Acorta la reserva para que el día elegido sea el último.",
    trimRemoveDate: (date) => `Quitar ${date} de la reserva`,
    trimRemoveDateDesc: "Elimina este último día de la reserva.",
  },
};

interface DateStatus {
  hasBar: boolean;
  isBuffer: boolean;
  isPotential: boolean;
  isSameDayCleaning: boolean;
  isUnbookable: boolean;
  isOpenOverride: boolean;
  isClosedOverride: boolean;
  isManualCleaning: boolean;
}

export interface DateBarInfo {
  name: string;
  platform: string;
  role: "checkout" | "checkin" | "midstay" | "fullday";
  /** Bar's spanning range — needed by the trim action so it can guard
   *  against shrinking a 1-night booking to 0 nights and produce the
   *  correct new checkOut date (clicked date for midstay, clicked-1
   *  for checkout). */
  startDate: string;
  endDate: string;
  reservationId?: number;
  eventUid?: string;
  linkedEventUid?: string;
}

export interface ExtendableBooking {
  name: string;
  platform: string;
  /** Set when this entry is a manual reservation (DB row). The
   *  parent handler PATCHes the existing reservation's checkIn /
   *  checkOut instead of creating a separate extension row, so
   *  the original and the added nights share one DB row + one
   *  visually continuous bar. */
  reservationId?: number;
  /** Set when this entry mirrors an iCal-imported event. The
   *  parent handler creates a new reservation with this as
   *  linkedEventUid so the calendar pairs it with the source
   *  bar. */
  eventUid?: string;
  /** Original stay window of the booking we're appending to —
   *  shown in the panel so the host sees the full context (e.g.
   *  "Iain · May 3 → May 9") instead of the bare iCal SUMMARY. */
  bookingStart: string;
  bookingEnd: string;
  side: "before" | "after";
}

interface BulkCounts {
  booked: number;
  openOverride: number;
  closedOverride: number;
  cleaningOverride: number;
  /** Selected dates that are auto-flagged unavailable by the system
   *  (buffer / same-day cleaning / unbookable / potential cleaning).
   *  Used to decide whether the bulk "Make available" action makes
   *  sense — without this we would show it on already-free dates. */
  autoBlocked: number;
}

interface DateActionsPanelProps {
  /** Always at least one entry. Single = 1, bulk = 2+. */
  selectedDates: string[];
  /** When exactly one date is selected, single-date detail. */
  singleDate: string | null;
  singleDateBars: DateBarInfo[];
  /** Bookings the WHOLE selection could be appended to (extend
   *  before / after). For a single-date selection this is the same
   *  set the per-date popup used to compute. For a multi-date
   *  contiguous selection these are bookings whose start equals
   *  last+1 or whose end equals first. */
  extendable: ExtendableBooking[];
  /** Whether the multi-date selection is contiguous — drives whether
   *  Create reservation / Extend booking are offered. */
  isContiguousRange: boolean;
  singleStatus: DateStatus | null;
  /** Aggregate flags across the entire selection — drives the bulk
   *  action list when 2+ dates are selected. */
  bulkCounts: BulkCounts;
  onClose: () => void;
  onToggleDate: (dateStr: string) => void;
  onCloseDate: () => void;
  onOpenDate: () => void;
  onScheduleCleaning: () => void;
  onRemoveOverride: () => void;
  onExtendBooking: (booking: ExtendableBooking) => void;
  onCreateReservation: (data: { name: string; platform: string }) => Promise<
    | { ok: true }
    | {
        ok: false;
        error: string;
        existing?: { name: string; checkIn: string; checkOut: string };
      }
  >;
  /** Shrink an existing manual reservation by setting its checkOut to
   *  `newCheckOut` (YYYY-MM-DD). Surfaced when the host clicks one date
   *  inside the bar of a reservation they own. The wrapper resolves
   *  the reservationId from the clicked bar before calling. */
  onTrimReservation?: (reservationId: number, newCheckOut: string) => void;
}

type ActionKind =
  | "block"
  | "scheduleCleaning"
  | "openForBooking"
  | "removeOverride"
  | "removeBlock"
  | "removeCleaning"
  | "createReservation"
  | "trimReservation";

interface ResolvedAction {
  kind: ActionKind;
  label: string;
  description?: string;
  tone: "neutral" | "block" | "open" | "cleaning" | "primary";
  onClick: () => void;
}

export function DateActionsPopover({
  selectedDates,
  singleDate,
  singleDateBars,
  extendable,
  isContiguousRange,
  singleStatus,
  bulkCounts,
  onClose,
  onToggleDate,
  onCloseDate,
  onOpenDate,
  onScheduleCleaning,
  onRemoveOverride,
  onExtendBooking,
  onCreateReservation,
  onTrimReservation,
}: DateActionsPanelProps) {
  const { t, locale } = useI18n();
  const c = COPY[locale];
  const popRef = useRef<HTMLDivElement>(null);
  const [creating, setCreating] = useState(false);
  const [resName, setResName] = useState("");
  const [resPlatform, setResPlatform] = useState<string>("direct");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reset the create-reservation form whenever the selection changes
  // (e.g. user added another date). Otherwise typed name would carry
  // over into a different selection state.
  useEffect(() => {
    setCreating(false);
    setResName("");
    setResPlatform("direct");
    setSubmitting(false);
    setCreateError(null);
  }, [selectedDates.join(",")]);

  // Use the contiguous-range flag passed in by the wrapper (shared
  // with the extendable computation so they stay consistent).
  const isContiguous = isContiguousRange;

  const allUnbooked = bulkCounts.booked === 0;
  // Has anything in the selection that "Make available" would
  // actually unblock — without this the bulk panel would offer the
  // action on dates that are already free.
  const someNeedsOpening =
    bulkCounts.closedOverride > 0 ||
    bulkCounts.cleaningOverride > 0 ||
    bulkCounts.autoBlocked > 0;

  // Single-date mode header status text — matches old per-date popup.
  const singleStatusText = (() => {
    if (!singleStatus) return "";
    if (singleStatus.hasBar) {
      if (singleDateBars.length > 1) {
        return c.staysTurnover(singleDateBars.length);
      }
      return t("dateActions.statusBooked", { name: singleDateBars[0]?.name || "—" });
    }
    if (singleStatus.isOpenOverride) return t("dateActions.statusOpen");
    if (singleStatus.isManualCleaning) return c.manualCleaning;
    if (singleStatus.isClosedOverride) return t("dateActions.statusClosed");
    if (singleStatus.isBuffer) return t("dateActions.statusCleaning");
    if (singleStatus.isSameDayCleaning) return t("dateActions.statusCleaning");
    if (singleStatus.isPotential) return t("dateActions.statusPotential");
    if (singleStatus.isUnbookable) return t("dateActions.statusUnbookable");
    return t("dateActions.statusFree");
  })();

  const isLinkedPair = (a: DateBarInfo, b: DateBarInfo) =>
    (!!a.eventUid && a.eventUid === b.linkedEventUid) ||
    (!!b.eventUid && b.eventUid === a.linkedEventUid);

  const cleaningBetweenIndex = (() => {
    for (let i = 0; i < singleDateBars.length - 1; i++) {
      const a = singleDateBars[i];
      const b = singleDateBars[i + 1];
      if (a.role === "checkout" && b.role === "checkin" && !isLinkedPair(a, b)) {
        return i;
      }
    }
    return -1;
  })();

  const formatHeaderDate = (s: string) =>
    new Date(s + "T12:00:00").toLocaleDateString(c.dateLocale, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const formatShort = (s: string) =>
    new Date(s + "T12:00:00").toLocaleDateString(c.dateLocale, {
      day: "2-digit",
      month: "short",
    });

  // Single-date actions (per-state, same logic as before).
  const singleActions: ResolvedAction[] = (() => {
    if (!singleStatus) return [];
    const lBlock = c.blockDate;
    const lBlockDesc = c.blockDateDesc;
    const lSchedule = c.scheduleCleaning;
    const lScheduleDesc = c.scheduleCleaningDesc;
    const lOpen = c.makeAvailable;
    const lOpenDesc = c.makeAvailableDesc;
    const lUnblock = c.unblockDate;
    const lRemoveCleaning = c.removeCleaning;
    const lRemoveOverride = c.resetOverride;
    const lRemoveOverrideDesc = c.resetOverrideDesc;
    const lCreate = c.createReservation;
    const lCreateDesc = c.createReservationDesc;
    const createAction: ResolvedAction = { kind: "createReservation", label: lCreate, description: lCreateDesc, tone: "primary", onClick: () => setCreating(true) };

    if (singleStatus.hasBar) {
      // On a booked day the only meaningful actions are around the
      // cleaning chip. Cases:
      //
      //   * Manual cleaning override → "Cancel cleaning" deletes the
      //     override (back to auto-detected state, which on a turnover
      //     or end-of-stay day still shows the Cleaning chip via
      //     sameDayCleaning).
      //   * Auto sameDayCleaning chip → "Cancel cleaning" sets an
      //     `open` override that suppresses the auto chip.
      //   * Booked day with no cleaning chip at all (e.g. mid-stay
      //     day, OR a check-in day where the next guest's bar covers
      //     the date but auto-cleaning didn't pick it because it's
      //     a check-in) → host should still be able to schedule a
      //     manual cleaning. Auto-cleaning can't go on a check-in
      //     day, but the host knows their cleaner's calendar best
      //     and may want the cleaner there before the next check-in.
      //     Previously this case returned [] — no actions at all,
      //     so the host had no UI path to schedule cleaning on a
      //     booked day. Now it surfaces "Schedule cleaning" as a
      //     manual override that overrides the auto-cleaning logic.
      const lRemoveCleaningDesc = c.removeCleaningDescAuto;
      const lCancelCleaning = c.cancelCleaningOnBooked;
      const lCancelCleaningDesc = c.cancelCleaningOnBookedDesc;

      // Trim action — surfaced when the host clicks one date INSIDE a
      // single PURE-MANUAL reservation's bar. The bar's endDate IS
      // the reservation's checkOut. Two click positions both produce
      // the intended trim:
      //   * midstay click on day X → new checkOut = X
      //   * checkout-day click → new checkOut = X − 1 day
      //
      // Skipped on turnover days (multiple bars on the date) because
      // it would be ambiguous which booking to shrink.
      //
      // Skipped when the bar has no reservationId (raw iCal-only
      // event — Propical can't mutate the source feed).
      //
      // Skipped when the bar has eventUid (= bar comes from an iCal
      // event, including claims where the host has attached a guest
      // name to a fetched reservation). The platform owns the date
      // range; PATCHing our local row would silently fail to update
      // the bar (use-calendar-data uses the iCal dates when the
      // reservation + iCal event overlap) and would diverge our
      // state from the platform's iCal feed, which we then re-emit
      // to OTHER platforms — silent double-booking risk.
      //
      // bar.linkedEventUid alone (without eventUid) is the
      // EXTENSION case — the host added a manual row next to a
      // fetched booking via "Add 1 night before/after". Those rows
      // are pure custom additions; trimming them only modifies the
      // local segment. Allowed.
      //
      // Skipped when shrinking would yield a zero-night stay
      // (1-night booking + checkout-click).
      const trimAction: ResolvedAction | null = (() => {
        if (!onTrimReservation) return null;
        if (!singleDate) return null;
        if (singleDateBars.length !== 1) return null;
        const bar = singleDateBars[0];
        if (!bar.reservationId) return null;
        if (bar.eventUid) return null;
        const dateLabel = formatShort(singleDate);
        if (bar.role === "midstay") {
          return {
            kind: "trimReservation",
            label: c.trimToDate(dateLabel),
            description: c.trimToDateDesc,
            tone: "block",
            onClick: () => onTrimReservation(bar.reservationId!, singleDate),
          };
        }
        if (bar.role === "checkout") {
          // Subtract one day from the click. Guard against zero-night:
          // only meaningful when the bar covers more than one day.
          const prevDay = (() => {
            const d = new Date(singleDate + "T12:00:00");
            d.setDate(d.getDate() - 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          })();
          if (prevDay <= bar.startDate) return null;
          return {
            kind: "trimReservation",
            label: c.trimRemoveDate(dateLabel),
            description: c.trimRemoveDateDesc,
            tone: "block",
            onClick: () => onTrimReservation(bar.reservationId!, prevDay),
          };
        }
        return null;
      })();

      if (singleStatus.isManualCleaning) {
        return [
          { kind: "removeCleaning", label: lCancelCleaning, description: lRemoveCleaningDesc, tone: "open", onClick: onRemoveOverride },
          ...(trimAction ? [trimAction] : []),
        ];
      }
      if (singleStatus.isSameDayCleaning) {
        return [
          { kind: "openForBooking", label: lCancelCleaning, description: lCancelCleaningDesc, tone: "open", onClick: onOpenDate },
          ...(trimAction ? [trimAction] : []),
        ];
      }
      // Booked day, no cleaning chip — give the host the manual
      // override action so they can force a cleaning here, plus the
      // trim action when applicable.
      return [
        { kind: "scheduleCleaning", label: lSchedule, description: lScheduleDesc, tone: "cleaning", onClick: onScheduleCleaning },
        ...(trimAction ? [trimAction] : []),
      ];
    }
    if (singleStatus.isManualCleaning) {
      return [createAction, { kind: "removeCleaning", label: lRemoveCleaning, description: lRemoveOverrideDesc, tone: "open", onClick: onRemoveOverride }, { kind: "block", label: lBlock, description: lBlockDesc, tone: "block", onClick: onCloseDate }];
    }
    if (singleStatus.isClosedOverride) {
      return [createAction, { kind: "removeBlock", label: lUnblock, description: lRemoveOverrideDesc, tone: "open", onClick: onRemoveOverride }];
    }
    if (singleStatus.isOpenOverride) {
      return [createAction, { kind: "removeOverride", label: lRemoveOverride, description: lRemoveOverrideDesc, tone: "neutral", onClick: onRemoveOverride }, { kind: "block", label: lBlock, description: lBlockDesc, tone: "block", onClick: onCloseDate }, { kind: "scheduleCleaning", label: lSchedule, description: lScheduleDesc, tone: "cleaning", onClick: onScheduleCleaning }];
    }
    // Auto-detected unavailable. Three label flavours:
    //   * Cleaning days (buffer / same-day): "Cancel cleaning" — the
    //     host's mental model is "the cleaner is not coming this day,
    //     schedule it elsewhere".
    //   * Potential cleaning (speculative dashed "Limpeza?" chip):
    //     there is no real cleaning to cancel — the host either
    //     confirms the suggestion ("Schedule cleaning" → manual
    //     override) or dismisses it ("Make available" → open
    //     override).
    //   * Min-nights blocks (unbookable): "Make available" — the
    //     date is locked for booking-fit reasons, no cleaning concept.
    if (singleStatus.isBuffer || singleStatus.isSameDayCleaning) {
      const lCancelCleaning = c.cancelCleaningOnAuto;
      const lCancelCleaningDesc = c.cancelCleaningOnAutoDesc;
      return [createAction, { kind: "openForBooking", label: lCancelCleaning, description: lCancelCleaningDesc, tone: "open", onClick: onOpenDate }];
    }
    if (singleStatus.isPotential) {
      return [
        createAction,
        { kind: "scheduleCleaning", label: lSchedule, description: lScheduleDesc, tone: "cleaning", onClick: onScheduleCleaning },
        { kind: "openForBooking", label: lOpen, description: lOpenDesc, tone: "open", onClick: onOpenDate },
      ];
    }
    if (singleStatus.isUnbookable) {
      return [createAction, { kind: "openForBooking", label: lOpen, description: lOpenDesc, tone: "open", onClick: onOpenDate }];
    }
    return [createAction, { kind: "block", label: lBlock, description: lBlockDesc, tone: "block", onClick: onCloseDate }, { kind: "scheduleCleaning", label: lSchedule, description: lScheduleDesc, tone: "cleaning", onClick: onScheduleCleaning }];
  })();

  // Bulk-mode actions: simpler — operate on the whole selection.
  const bulkActions: ResolvedAction[] = (() => {
    const lBlockAll = c.blockAll(selectedDates.length);
    const lScheduleAll = c.scheduleAll(selectedDates.length);
    const lOpenAll = c.openAll(selectedDates.length);
    const lResetAll = c.resetAll(selectedDates.length);
    const lCreate = c.createBulk(selectedDates.length);
    const lCreateDesc = c.createBulkDesc;

    const out: ResolvedAction[] = [];

    if (allUnbooked && isContiguous) {
      out.push({ kind: "createReservation", label: lCreate, description: lCreateDesc, tone: "primary", onClick: () => setCreating(true) });
    }
    if (allUnbooked) {
      out.push({ kind: "block", label: lBlockAll, tone: "block", onClick: onCloseDate });
      // "Make available" only when at least one selected date is
      // actually unavailable — otherwise the action is a no-op on
      // already-free days.
      if (someNeedsOpening) {
        out.push({ kind: "openForBooking", label: lOpenAll, tone: "open", onClick: onOpenDate });
      }
    }
    // Bulk "Schedule cleaning" is allowed regardless of whether the
    // selection includes booked dates. Same rationale as the
    // single-mode fix in commit a629700: a manual cleaning override
    // creates a chip on top of the reservation bar (the host knows
    // their cleaner's calendar best, e.g. early-morning before next
    // check-in). Block / Make-available remain gated on allUnbooked
    // because they conflict with the existing booking.
    out.push({ kind: "scheduleCleaning", label: lScheduleAll, tone: "cleaning", onClick: onScheduleCleaning });
    if (bulkCounts.openOverride + bulkCounts.closedOverride + bulkCounts.cleaningOverride > 0) {
      out.push({ kind: "removeOverride", label: lResetAll, tone: "neutral", onClick: onRemoveOverride });
    }
    return out;
  })();

  const toneClass = (tone: ResolvedAction["tone"]) => {
    switch (tone) {
      case "primary":
        return "bg-action-primary text-action-primary-fg hover:bg-action-primary-hover";
      case "block":
        return "hover:bg-rose-500/10 hover:text-rose-500";
      case "open":
        return "hover:bg-emerald-500/10 hover:text-emerald-500";
      case "cleaning":
        return "hover:bg-status-buffer-bg hover:text-status-buffer-fg";
      default:
        return "hover:bg-surface-hover";
    }
  };

  const iconFor = (kind: ActionKind) => {
    switch (kind) {
      case "createReservation":
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        );
      case "block":
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        );
      case "scheduleCleaning":
        // Sparkles glyph — reads as "make this clean / sparkly"
        // and works for both auto-cleaning and manual scheduling.
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        );
      case "openForBooking":
      case "removeBlock":
      case "removeCleaning":
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        );
      case "removeOverride":
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        );
      case "trimReservation":
        // Scissors glyph — reads as "cut / shorten this booking" and
        // pairs with the rose tone the action uses to signal it's a
        // destructive-leaning change to existing data.
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" />
          </svg>
        );
    }
  };

  const submitCreate = async () => {
    const finalName = resName.trim();
    if (!finalName) return;
    setCreateError(null);
    setSubmitting(true);
    try {
      const result = await onCreateReservation({ name: finalName, platform: resPlatform });
      if (!result.ok) {
        setCreateError(
          result.existing
            ? `${result.error}: "${result.existing.name}" (${result.existing.checkIn} → ${result.existing.checkOut})`
            : result.error,
        );
      }
      // On success the parent clears the selection, which triggers the
      // creating=false reset via the useEffect above and closes the panel.
    } finally {
      setSubmitting(false);
    }
  };

  const singleStatusBadgeClass = !singleStatus
    ? ""
    : singleStatus.hasBar
      ? "bg-action-primary/10 text-action-primary-text"
      : singleStatus.isOpenOverride
        ? "bg-emerald-500/10 text-emerald-500"
        : singleStatus.isManualCleaning
          ? "bg-status-buffer-bg text-status-buffer-fg"
          : singleStatus.isClosedOverride
            ? "bg-rose-500/10 text-rose-500"
            : (singleStatus.isBuffer || singleStatus.isSameDayCleaning)
              ? "bg-status-buffer-bg text-status-buffer-fg"
              : singleStatus.isPotential
                ? "bg-text-primary/5 text-text-secondary"
                : singleStatus.isUnbookable
                  ? "bg-text-faint/10 text-text-muted"
                  : "bg-emerald-500/10 text-emerald-500";

  const renderActionsList = (actions: ResolvedAction[]) =>
    actions.length === 0 ? (
      <div className="px-3 py-2 text-sm text-text-faint">
        {c.noActions}
      </div>
    ) : (
      actions.map((a) => (
        <button
          key={a.kind + a.label}
          onClick={a.onClick}
          className={`w-full flex items-start gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors ${a.tone === "primary" ? "" : "text-text-primary"} ${toneClass(a.tone)}`}
        >
          <span className={`mt-0.5 shrink-0 ${a.tone === "primary" ? "text-action-primary-fg" : ""}`}>{iconFor(a.kind)}</span>
          <span className="flex-1 min-w-0">
            <span className={`block text-sm font-medium ${a.tone === "primary" ? "text-action-primary-fg" : ""}`}>{a.label}</span>
            {a.description && (
              <span className={`block text-sm mt-0.5 leading-snug ${a.tone === "primary" ? "text-action-primary-fg/80" : "text-text-faint"}`}>{a.description}</span>
            )}
          </span>
        </button>
      ))
    );

  // Renders inline as a flex sibling of the calendar (no portal). The
  // parent decides positioning — on desktop it's a sticky aside that
  // shares the centered max-w-[1760px] container with the calendar;
  // on mobile it stacks below or replaces the calendar.
  return (
    <div
      ref={popRef}
      className="flex h-full flex-col bg-surface animate-slide-in-right"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          {singleDate ? (
            <>
              <div className="text-eyebrow">{t("dateActions.title")}</div>
              <div className="mt-0.5 text-base font-semibold text-text-primary">{formatHeaderDate(singleDate)}</div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-text-faint">{t("dateActions.status")}:</span>
                <span className={`rounded px-1.5 py-0.5 font-medium ${singleStatusBadgeClass}`}>{singleStatusText}</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-eyebrow">
                {c.selectedDates}
              </div>
              <div className="mt-0.5 text-base font-semibold text-text-primary">
                {selectedDates.length} {c.daysCount(selectedDates.length)}
                {isContiguous && selectedDates.length > 1 && (
                  <span className="ml-2 text-sm font-normal text-text-muted">
                    {formatShort(selectedDates[0])} → {formatShort(selectedDates[selectedDates.length - 1])}
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm text-text-muted">
                {bulkCounts.booked > 0
                  ? c.bookedDisabled(bulkCounts.booked)
                  : isContiguous
                    ? c.contiguousRange
                    : c.nonContiguous}
              </div>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label={c.close}
          className="shrink-0 rounded-full p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-gutter-stable">
        {/* Single-date day timeline. All entries — guest bars AND the
            inline cleaning notice — share the same [badge | title /
            sub-line] row layout so the visual rhythm stays consistent.
            The badge is the only element that swaps colour to convey
            event type. */}
        {singleDate && singleDateBars.length > 0 && (
          <div className="border-b border-border px-5 py-4 space-y-3">
            {singleDateBars.map((b, i) => {
              const meta = resolvePlatformMeta(b.platform);
              const platformColor = meta.color;
              const platformLabel = meta.shortLabel;
              const roleLabel = b.role === "checkout"
                ? c.checkingOut
                : b.role === "checkin"
                  ? c.checkingIn
                  : b.role === "fullday"
                    ? c.singleDayStay
                    : c.staying;
              return (
                /* Two-column grid: a fixed 64px badge column + a flexible
                   description column. Badges stay their natural width
                   (left-aligned in column 1 via the inner span); the
                   title + sub-line in column 2 always start at the same
                   x-coord regardless of badge text length, so the rhythm
                   reads as a clean two-column timeline. */
                <div key={`bar-${i}`} className="space-y-3">
                  <div className="grid grid-cols-[64px_1fr] items-start gap-x-3">
                     <span
                       className="justify-self-start mt-0.5 inline-flex items-center rounded px-2 py-1 text-sm font-medium leading-none tracking-wide text-white"
                       style={{ backgroundColor: platformColor }}
                     >
                       {platformLabel}
                     </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium leading-tight text-text-primary">{b.name}</div>
                      <div className="mt-0.5 text-sm leading-tight text-text-muted">{roleLabel}</div>
                    </div>
                  </div>
                  {i === cleaningBetweenIndex && (
                    <div className="grid grid-cols-[64px_1fr] items-start gap-x-3">
                      <span className="justify-self-start mt-0.5 inline-flex items-center rounded px-2 py-1 text-sm font-medium leading-none tracking-wide bg-status-buffer-bg text-status-buffer-fg border border-status-buffer-border">
                        {c.cleanLabel}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium leading-tight text-text-primary">
                          {singleStatus?.isManualCleaning ? c.cleaningScheduled : c.cleaningRequired}
                        </div>
                        <div className="mt-0.5 text-sm leading-tight text-text-muted">
                          {c.betweenStays}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Multi-date selection list — chips with toggle to remove */}
        {!singleDate && (
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-wrap gap-1.5">
              {selectedDates.map((d) => (
                <button
                  key={d}
                  onClick={() => onToggleDate(d)}
                  className={cn(
                    chipVariants({ tone: "action", size: "md" }),
                    "group gap-1 py-1 font-medium hover:bg-action-primary/20 transition-colors",
                  )}
                  title={c.removeFromSelection}
                >
                  {formatShort(d)}
                  <svg className="h-3 w-3 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create-reservation form (shared by single + bulk modes) */}
        {creating ? (
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className={cn("block mb-1.5", eyebrowVariants({ variant: "section" }))}>
                {c.guestName}
              </label>
              <input
                autoFocus
                data-testid="res-guest-name"
                value={resName}
                onChange={(e) => setResName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitCreate();
                  }
                }}
                placeholder={c.guestNamePlaceholder}
                className="h-10 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-text-primary placeholder-text-faint outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary/20"
              />
            </div>
            <div>
              <label className={cn("block mb-1.5", eyebrowVariants({ variant: "section" }))}>
                {c.platform}
              </label>
              <div className="flex gap-2">
                {[
                  { code: "airbnb", label: "Airbnb", color: resolvePlatformMeta("airbnb").color },
                  { code: "booking", label: "Booking", color: resolvePlatformMeta("booking").color },
                  { code: "direct", label: c.platformDirect, color: resolvePlatformMeta("direct").color },
                ].map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setResPlatform(p.code)}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-sm font-medium transition-colors ${
                      resPlatform === p.code
                        ? "border-transparent text-white"
                        : "border-border-strong bg-surface-raised text-text-secondary hover:bg-surface-hover"
                    }`}
                    style={resPlatform === p.code ? { backgroundColor: p.color } : undefined}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border-strong bg-surface-raised p-3 text-sm text-text-muted">
              <div>
                <span className="text-text-faint">{c.checkInLabel}</span>{" "}
                <span className="font-medium text-text-primary">{formatShort(selectedDates[0])}</span>
              </div>
              <div className="mt-1">
                <span className="text-text-faint">{c.checkOutLabel}</span>{" "}
                <span className="font-medium text-text-primary">
                  {(() => {
                    const last = selectedDates[selectedDates.length - 1];
                    const d = new Date(last + "T12:00:00");
                    d.setDate(d.getDate() + 1);
                    return d.toLocaleDateString(c.dateLocale, { day: "2-digit", month: "short" });
                  })()}
                </span>{" "}
                <span className="text-text-faint">
                  {c.nightsParenthetical(selectedDates.length)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Action list */
          <div className="px-2.5 py-2.5">
            {singleDate ? renderActionsList(singleActions) : renderActionsList(bulkActions)}

            {/* Extend booking — works for single-date OR multi-date
                contiguous selection. Each card shows the platform
                pill, the guest name, the original stay window and a
                "Extend by N nights" CTA so the host knows exactly
                what they're appending to before clicking. */}
            {extendable.length > 0 && bulkCounts.booked === 0 && isContiguous && (
              <div className="mt-2 border-t border-border pt-2 px-1.5">
                <div className="px-1.5 py-1.5 text-sm uppercase tracking-wide text-text-faint">
                  {c.linkToBooking}
                </div>
                {extendable.map((b, i) => {
                  const meta = resolvePlatformMeta(b.platform);
                  const platformColor = meta.color;
                  const platformLabel = meta.shortLabel;
                  const nights = selectedDates.length;
                  const sideLabel = b.side === "before" ? c.beforeCheckIn : c.afterCheckOut;
                  return (
                    <button
                      key={i}
                      onClick={() => onExtendBooking(b)}
                      className="w-full mb-1.5 last:mb-0 rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
                    >
                      <div className="flex items-center gap-2">
                         <span
                           className="inline-flex items-center rounded px-2 py-1 text-sm font-medium leading-none tracking-wide text-white"
                           style={{ backgroundColor: platformColor }}
                         >
                           {platformLabel}
                         </span>
                        <span className="flex-1 min-w-0 truncate text-sm font-medium text-text-primary">{b.name}</span>
                        <svg className="h-3.5 w-3.5 shrink-0 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={b.side === "before" ? "M8.25 4.5l7.5 7.5-7.5 7.5" : "M15.75 19.5L8.25 12l7.5-7.5"} />
                        </svg>
                      </div>
                      <div className="mt-1 text-sm text-text-muted">
                        {c.stayLabel}: <span className="text-text-secondary">{formatShort(b.bookingStart)} → {formatShort(b.bookingEnd)}</span>
                      </div>
                      <div className="mt-0.5 text-sm font-medium text-action-primary-text">
                        {c.addNights(nights, sideLabel)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky footer for the create form */}
      {creating && (
        <div className="border-t border-border px-5 py-3 space-y-2">
          {createError && (
            <p
              className="rounded-md bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-500"
              role="alert"
            >
              {createError}
            </p>
          )}
          <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCreating(false)}
            disabled={submitting}
            className="flex-1 rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            {t("common.cancel") || c.cancel}
          </button>
          <button
            type="button"
            data-testid="res-save"
            onClick={submitCreate}
            disabled={submitting || !resName.trim()}
            className="flex-1 rounded-md bg-action-primary px-3 py-2 text-sm font-medium text-action-primary-fg hover:bg-action-primary-hover transition-colors disabled:opacity-50"
          >
            {submitting ? c.saving : c.save}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
