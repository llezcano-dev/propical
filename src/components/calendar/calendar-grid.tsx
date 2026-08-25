"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n/context";
import { resolvePlatformMeta } from "@/lib/platform-meta";
import { timeToPercent } from "./utils";
import type { BarSegment, CalendarBar } from "./types";

/** Relative luminance of a #RRGGBB colour — light brands (Expedia yellow)
 *  need dark ink on the bar; dark brands use white. */
function isLightPlatformColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  // ITU-R BT.709 relative luminance
  const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return L > 0.55;
}

/** Tiny inline broom-glyph used inside the cleaning chip. Inherits the
 *  surrounding text color so it works across the amber chip and the
 *  ink-neutral "Cleaning?" potential variant without a tone tweak. */
function CleaningIcon() {
  return (
    <svg
      className="h-2.5 w-2.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Sparkle — reads as "fresh / cleaned" at this small size
          better than a literal broom. */}
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
      <path d="M19 14l.7 1.6 1.6.7-1.6.7L19 18.6l-.7-1.6-1.6-.7 1.6-.7L19 14z" />
    </svg>
  );
}

interface CalendarGridProps {
  year: number;
  month: number;
  today: Date;
  minNights: number;
  checkInTime: string;
  checkOutTime: string;
  bars: CalendarBar[];
  bufferDates: Set<string>;
  potentialDates: Set<string>;
  unbookableDates: Set<string>;
  sameDayCleaningDates: Set<string>;
  conflictDates: Set<string>;
  openOverrides: Set<string>;
  closedOverrides: Set<string>;
  /** Dates where the host has explicitly scheduled a cleaning (override
   *  type=cleaning). Render with the cleaning chip + "Manual cleaning"
   *  label so they are visually distinct from auto buffer days. */
  cleaningOverrides: Set<string>;
  /** name of the priority-0 cleaner assigned to this
   *  property. Surfaced via the `title` attribute (hover tooltip) on
   *  every cleaning chip. No visual change to the chip itself. */
  defaultCleanerName?: string;
  /** Dates the user has selected (multi-select via cell clicks). The
   *  selection drives the side panel — single date opens the per-
   *  date detail view, multiple dates opens the bulk-action view. */
  selectedDates: Set<string>;
  loading?: boolean;
  onSelectReservation: (id: number) => void;
  onClaimBar?: (bar: BarSegment, rect: DOMRect) => void;
  onCellClick: (dateStr: string, rect: DOMRect) => void;
}

export function CalendarGrid({
  year,
  month,
  today,
  minNights,
  checkInTime,
  checkOutTime,
  bars,
  bufferDates,
  potentialDates,
  unbookableDates,
  sameDayCleaningDates,
  conflictDates,
  openOverrides,
  closedOverrides,
  cleaningOverrides,
  defaultCleanerName,
  selectedDates,
  loading,
  onSelectReservation,
  onClaimBar,
  onCellClick,
}: CalendarGridProps) {
  const { t } = useI18n();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let firstDayOffset = new Date(year, month, 1).getDay() - 1;
  if (firstDayOffset < 0) firstDayOffset = 6;
  const monthKey = `${year}-${month}`;

  const checkInPct = timeToPercent(checkInTime);
  const checkOutPct = timeToPercent(checkOutTime);

  // Weekday header is rendered ONCE in the sticky page header now
  // (Airbnb pattern), not per-month here. The grid only paints week
  // rows.

  const weeks = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const result: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    if (result.length > 0) {
      while (result[result.length - 1].length < 7) result[result.length - 1].push(null);
    }
    return result;
  }, [firstDayOffset, daysInMonth]);

  const hasBarOnDay = (dayNum: number) => {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    return bars.some(b => ds >= b.startDate && ds <= b.endDate);
  };

  const segmentsForDay = (dayNum: number): BarSegment[] => {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const dow = new Date(year, month, dayNum).getDay();
    const isMonday = dow === 1;
    const segments: BarSegment[] = [];

    for (const bar of bars) {
      const isActualStart = ds === bar.startDate;
      const isMondayContinuation = isMonday && ds > bar.startDate && ds <= bar.endDate;
      const isMonthContinuation = dayNum === 1 && bar.startDate < ds && bar.endDate >= ds;
      if (!isActualStart && !isMondayContinuation && !isMonthContinuation) continue;

      let span = 0;
      let lastDay = dayNum;
      for (let d = dayNum; d <= daysInMonth; d++) {
        const dds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (dds > bar.endDate) break;
        span++;
        lastDay = d;
        if (new Date(year, month, d).getDay() === 0) break;
      }
      if (span === 0) continue;

      const lastDds = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const reachesEnd = lastDds === bar.endDate;

      // When the bar abuts a linked partner on its right, end the bar
      // at the partner's check-in mark instead of the normal check-out
      // mark — so the two bars touch at exactly one X position. The
      // 2 px gap and the right rounding are dropped in the renderer
      // (see `endGap` and `radiusClass`).
      const abutsRightPartner = !!bar.linkedAfter && reachesEnd;
      segments.push({
        ...bar,
        span,
        leftPct: isActualStart ? checkInPct : 0,
        rightMarginPct: reachesEnd
          ? (abutsRightPartner ? 100 - checkInPct : 100 - checkOutPct)
          : 0,
        showLabel: isActualStart || isMonthContinuation,
        // continuesLeft: this segment is NOT the bar's real start day
        // (so it's a Monday or month-1 continuation); continuesRight:
        // this segment ends mid-bar (Sunday or last-of-month).
        continuesLeft: ds > bar.startDate,
        continuesRight: !reachesEnd,
      });
    }

    return segments;
  };

  return (
    /* overflow-visible so wrap-around bars can bleed ~8px past their
       last cell into the parent wrapper's overflow-clip-margin (Airbnb
       continues-to-next-row pattern). The grid itself has no min-width
       so the 7 cells reflow to fill whatever the dashboard column gives
       them — at 360px that's ~51px columns (still above Apple's 44pt
       tap-target floor); on lg+ the dashboard column is 600-1000px and
       cells settle at the desktop spacing. The previous `min-w-[640px]`
       was a leftover from when this wrapper was `overflow-x-auto` (the
       calendar used to horizontal-scroll on phones). After 34bf4af
       switched the wrapper to `overflow-visible` and the section panel
       above it to `[overflow:clip]`, that 640px started silently
       clipping Fri/Sat/Sun off-screen on every mobile dashboard view —
       the calendar looked like a 4-day week. */
    <div className="overflow-visible">
      <div>
      <div key={monthKey} className="relative">
        {/* Skeleton bars while events are still being fetched. We park them
            at deterministic row offsets (top = row * 72 + 36 px so they sit
            inside the booking-bar band of each row) so the calendar already
            has visual structure on first paint instead of the bars popping
            in diagonally as the fetch resolves. Hidden once any real bar
            exists, even from cache. */}
        {loading && bars.length === 0 && (
          <div className="absolute inset-0 z-0 pointer-events-none animate-pulse" aria-hidden="true">
            {/* Skeleton row offsets follow the responsive cell heights:
                mobile cells are 56px tall (band y = 28px), desktop 72px
                (band y = 36px). */}
            <div className="absolute h-5 sm:h-6 rounded-md bg-text-faint/12 top-[28px] sm:top-[36px] left-[30%] w-[32%]" />
            <div className="absolute h-5 sm:h-6 rounded-md bg-text-faint/10 top-[84px] sm:top-[108px] left-[62%] w-[22%]" />
            <div className="absolute h-5 sm:h-6 rounded-md bg-text-faint/12 top-[140px] sm:top-[180px] left-[8%] w-[38%]" />
            <div className="absolute h-5 sm:h-6 rounded-md bg-text-faint/10 top-[196px] sm:top-[252px] left-[48%] w-[28%]" />
          </div>
        )}
        {weeks.map((week, wi) => {
          // Per-week stacking detection. We only enlarge cells and
          // compress bar height when at least one bar in this week has
          // rowIdx >= 1 (i.e. two bookings overlap on some date here).
          // Calendars with no conflicts render exactly as they did
          // before the stacking work — same cell height, same bar
          // height — so adding the stacking feature doesn't visually
          // regress the common case.
          const monthStr = String(month + 1).padStart(2, "0");
          const weekDateStrs = week
            .filter((d): d is number => d !== null)
            .map((d) => `${year}-${monthStr}-${String(d).padStart(2, "0")}`);
          const weekFirst = weekDateStrs[0];
          const weekLast = weekDateStrs[weekDateStrs.length - 1];
          let weekMaxRowIdx = 0;
          if (weekFirst && weekLast) {
            for (const bar of bars) {
              if (bar.startDate <= weekLast && bar.endDate >= weekFirst) {
                const ri = bar.rowIdx ?? 0;
                if (ri > weekMaxRowIdx) weekMaxRowIdx = ri;
              }
            }
          }
          const weekStacks = weekMaxRowIdx >= 1;
          // Single-bar week: original sizing, identical to pre-stacking
          // behaviour. Multi-bar week: cell grows to ~80/100 px so the
          // second bar row fits without bleeding into the next week,
          // and bar height compresses slightly so two bars sit side-
          // by-side cleanly.
          const cellHeightClass = weekStacks
            ? "h-[80px] sm:h-[100px]"
            : "h-[56px] sm:h-[72px]";
          const barHeightClass = weekStacks ? "h-4 sm:h-5" : "h-5 sm:h-6";

          return (
          <div key={`${monthKey}-w${wi}`} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((dayNum, di) => {
              if (dayNum === null) {
                // Keyed with a prefix that can never collide with the
                // real day cells (`c-${dayNum}`): a week whose leading
                // padding lands on di=1 used to produce a duplicate
                // `c-1` sibling key (pad di=1 + real day 1), which
                // React flagged "two children with the same key" on
                // every month's first week.
                return <div key={`pad-${monthKey}-w${wi}-${di}`} className={`${cellHeightClass} border-r border-border last:border-r-0`} />;
              }
              const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const isToday = year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate();
              const isConflict = conflictDates.has(ds);
              const segments = segmentsForDay(dayNum);
              const hasBar = hasBarOnDay(dayNum);
              // Two flavours of manual-cleaning state:
              //   * hasManualCleaning — host explicitly set a cleaning
              //     override for this date, regardless of whether a bar
              //     covers it. Used for the always-visible top chip
              //     below so a host who scheduled cleaning on a booked
              //     check-in day can SEE the chip they just created.
              //   * isManualCleaning — only true when no bar covers the
              //     date. Used for the middle-of-cell indicator (which
              //     would visually collide with a bar otherwise).
              const hasManualCleaning = cleaningOverrides.has(ds);
              const isManualCleaning = hasManualCleaning && !hasBar;
              const isBuffer = bufferDates.has(ds) && !hasBar && !isManualCleaning;
              const isPotential = potentialDates.has(ds) && !hasBar && !isBuffer && !isManualCleaning;
              const isUnbookable = unbookableDates.has(ds) && !hasBar && !isBuffer && !isPotential && !isManualCleaning;
              const isSameDayCleaning = sameDayCleaningDates.has(ds);
              // Effective open/closed overrides — suppressed when a
              // reservation bar already covers the cell. The override
              // row still exists in the DB; we just hide the visual
              // signal so the host doesn't see a green "open" tint
              // (or ring) under a confirmed booking. Same for closed
              // overrides — once a reservation lands the override is
              // moot, the bar already says "occupied".
              const isOpen = openOverrides.has(ds) && !hasBar;
              const isClosed = closedOverrides.has(ds) && !hasBar;
              const isSelected = selectedDates.has(ds);
              const bg = isOpen ? "bg-emerald-500/8"
                : isClosed ? "bg-rose-500/8"
                : isConflict ? "bg-rose-500/8"
                : isManualCleaning ? "bg-status-buffer-cell"
                : isToday ? "bg-text-primary/5"
                : isBuffer ? "bg-status-buffer-cell"
                : isPotential ? "bg-text-primary/3"
                : isUnbookable ? "bg-text-faint/5"
                : "";

              const showMiddleIndicator = !hasBar && (isManualCleaning || isBuffer || isPotential || isUnbookable || (isOpen && !hasBar) || (isClosed && !isBuffer) || (isConflict && !isOpen && !isClosed));
              return (
                <div
                  key={`c-${dayNum}`}
                  onClick={(e) => {
                    onCellClick(ds, (e.currentTarget as HTMLElement).getBoundingClientRect());
                  }}
                  data-date={ds}
                  className={`relative ${cellHeightClass} border-r border-border last:border-r-0 cursor-pointer transition-colors ${bg} ${isSelected ? "bg-action-primary/10 ring-2 ring-inset ring-action-primary" : "hover:bg-surface-hover/60"} ${isOpen && !isSelected ? "ring-1 ring-inset ring-emerald-500/40" : ""} ${isClosed && !isSelected ? "ring-1 ring-inset ring-rose-500/40" : ""}`}
                >
                  <div className="absolute top-1 left-1.5 sm:top-1.5 sm:left-2 z-20 pointer-events-none">
                    <span className={`font-mono text-sm font-medium leading-none ${
                      isConflict ? "inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-rose-500 text-white font-semibold"
                      : isToday ? "inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full ring-[1.5px] ring-action-primary text-action-primary-text font-bold"
                      : isOpen ? "text-emerald-500 font-semibold"
                      : isClosed ? "text-rose-500 font-semibold"
                      : "text-text-secondary"
                    }`}>{dayNum}</span>
                  </div>

                  {showMiddleIndicator && (
                    <div className="absolute left-0 right-0 top-7 sm:top-9 flex items-center justify-center px-0.5 pointer-events-none">
                      {isOpen && (
                        <div className="rounded px-1 h-5 flex items-center text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 font-medium">{t("calendar.open")}</div>
                      )}
                      {isClosed && !isBuffer && !isOpen && (
                        <div className="rounded px-1 h-5 flex items-center text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 font-medium">{t("calendar.closed")}</div>
                      )}
                      {isConflict && !isOpen && !isClosed && (
                        <div className="rounded px-1 h-5 flex items-center text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 font-medium">{t("calendar.conflict")}</div>
                      )}
                      {isManualCleaning && !isOpen && !isClosed && (
                        <div title={defaultCleanerName ? `${t("calendar.manualCleaning")} · ${defaultCleanerName}` : undefined} className="rounded px-1.5 h-5 flex items-center gap-0.5 text-sm font-semibold text-status-buffer-fg bg-status-buffer-bg border border-status-buffer-border shadow-sm">
                          <CleaningIcon />
                          <span className="truncate max-w-[80px] sm:max-w-none">{defaultCleanerName ?? t("calendar.manualCleaning")}</span>
                        </div>
                      )}
                      {isBuffer && !isOpen && !isClosed && (
                        <div title={defaultCleanerName ? `${t("calendar.cleaning")} · ${defaultCleanerName}` : undefined} className="rounded px-1 h-5 flex items-center gap-0.5 text-sm font-medium text-status-buffer-fg bg-status-buffer-bg border border-status-buffer-border">
                          <CleaningIcon />
                          <span className="truncate max-w-[80px] sm:max-w-none">{defaultCleanerName ?? t("calendar.cleaning")}</span>
                        </div>
                      )}
                      {isBuffer && isClosed && (
                        <div className="rounded px-1 h-5 flex items-center text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 font-medium">{t("calendar.closed")}</div>
                      )}
                      {isPotential && !isOpen && (
                        <div title={defaultCleanerName ? `🧹 ${defaultCleanerName}` : undefined} className="rounded px-1 h-5 flex items-center text-sm text-text-primary/70 bg-text-primary/5 border border-text-primary/15 border-dashed">{t("calendar.cleaningQ")}</div>
                      )}
                      {isUnbookable && !isOpen && (
                        <div className="rounded px-1 h-5 flex items-center text-sm text-text-faint bg-text-faint/8 border border-text-faint/15 border-dashed">&lt;{minNights}n</div>
                      )}
                    </div>
                  )}

                  {segments.map((seg, si) => {
                    // Vertical stacking: rowIdx 0 keeps the original
                    // top-7 sm:top-9 position. rowIdx 1 sits below by
                    // ~16/22 px so it lands cleanly in the enlarged
                    // (80/100 px) cell that the week-level
                    // weekStacks check already grew. Height comes from
                    // the parent loop — h-5 sm:h-6 when the week has
                    // no stacking (single-bar weeks render exactly as
                    // before), h-4 sm:h-5 when stacking is needed so
                    // two bars fit in the enlarged cell.
                    const rowIdx = seg.rowIdx ?? 0;
                    const topClass = rowIdx === 0
                      ? "top-7 sm:top-9"
                      : "top-[44px] sm:top-[58px]";
                    const heightClass = barHeightClass;
                    // A segment's edge is treated as "shared" when the
                    // bar either continues into another week (wrap) OR
                    // abuts a linked partner bar (manual extension of
                    // an iCal stay) — in both cases we want the bar to
                    // read as one continuous stay across that edge.
                    const abutsLeftPartner = !!seg.linkedBefore && !seg.continuesLeft;
                    const abutsRightPartner = !!seg.linkedAfter && !seg.continuesRight;
                    const sharedLeft = seg.continuesLeft || abutsLeftPartner;
                    const sharedRight = seg.continuesRight || abutsRightPartner;
                    const radiusClass =
                      sharedLeft && sharedRight
                        ? "rounded-none"
                        : sharedLeft
                          ? "rounded-r-md rounded-l-none"
                          : sharedRight
                            ? "rounded-l-md rounded-r-none"
                            : "rounded-md";
                    // Wrap-around bleed: when this segment continues
                    // into the next/previous week, push it ~8 px past
                    // the cell wall so the bar visibly bleeds out of
                    // the row, the way Airbnb's host calendar shows a
                    // multi-week stay. The parent calendar wrapper has
                    // overflow-clip-margin: 12px so the bleed stays
                    // contained inside the rounded card. Linked-partner
                    // edges don't bleed — they meet a sibling bar
                    // exactly, so they only need the rounding/gap drop.
                    const BLEED = 8;
                    const leftBleed = seg.continuesLeft ? BLEED : 0;
                    const rightBleed = seg.continuesRight ? BLEED : 0;
                    // 2 px gap between distinct stays is suppressed
                    // when the right edge is shared with a wrap or a
                    // linked partner.
                    const endGap = sharedRight ? 0 : 2;
                    const widthAdjust = leftBleed + rightBleed - endGap;
                    const widthStyle = widthAdjust >= 0
                      ? `calc(${seg.span * 100}% - ${seg.leftPct}% - ${seg.rightMarginPct}% + ${widthAdjust}px)`
                      : `calc(${seg.span * 100}% - ${seg.leftPct}% - ${seg.rightMarginPct}% - ${Math.abs(widthAdjust)}px)`;
                    const leftStyle = leftBleed > 0
                      ? `calc(${seg.leftPct}% - ${leftBleed}px)`
                      : `${seg.leftPct}%`;
                    // `isConflict` is per-cell — true only when the
                    // segment's start cell is a conflict date. For the
                    // tooltip we need the broader check: does this bar
                    // overlap ANY conflict date?
                    const segHasConflict = [...conflictDates].some(
                      (d) => d >= seg.startDate && d < seg.endDate,
                    );
                    return (
                      <div
                        key={`seg-${si}-${seg.startDate}`}
                        data-uid={seg.eventUid}
                        data-reservation-id={seg.reservationId ?? ""}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          if (seg.reservationId) {
                            onSelectReservation(seg.reservationId);
                          } else if (seg.eventUid && onClaimBar) {
                            onClaimBar(seg, rect);
                          }
                        }}
                        className={`absolute ${topClass} ${heightClass} flex items-center px-1.5 sm:px-2.5 text-sm leading-none font-semibold truncate shadow-[0_1px_2px_rgba(0,0,0,0.06)] cursor-pointer ${radiusClass} ${
                          // Platform brand colour from platform-meta (single
                          // source). Light brands (e.g. Expedia yellow) need
                          // dark ink; everything else uses white on solid.
                          isLightPlatformColor(resolvePlatformMeta(seg.platform).color)
                            ? "text-[#241A10]"
                            : "text-white/95"
                        } ${
                          // Direct stays ringed so manual bookings read as
                          // "mine, not from a platform feed".
                          seg.platform === "direct" ? "ring-1 ring-slate-300/30" : ""
                        } ${(seg.reservationId || seg.eventUid) ? "hover:brightness-110" : ""} ${seg.isExtension ? "ring-1 ring-white/30 ring-dashed" : ""}`}
                        style={{
                          left: leftStyle,
                          width: widthStyle,
                          zIndex: 10,
                          backgroundColor: resolvePlatformMeta(seg.platform).color,
                          backgroundImage: seg.isExtension
                            ? "repeating-linear-gradient(-45deg, transparent 0 6px, rgba(255,255,255,0.22) 6px 8px)"
                            : undefined,
                        }}
                        title={`${seg.name} · ${seg.startDate} ${checkInTime} → ${seg.endDate} ${checkOutTime}${segHasConflict ? " ⚠ CONFLICT" : ""}`}
                      >
                        {seg.showLabel ? seg.name : ""}
                      </div>
                    );
                  })}

                  {isSameDayCleaning && !isOpen && !isClosed && (
                    /* Same-day cleaning chip. Anchored top-center so it
                       sits between the two abutting bars (or above the
                       single bar on a checkin day with a wide gap behind
                       it). When the date is ALSO marked as potential —
                       a 0-buffer property's checkin day with a long
                       empty gap behind it — the chip switches to the
                       dashed "Cleaning?" style to communicate that the
                       cleaning could just as well have happened earlier
                       in the gap. */
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                      {potentialDates.has(ds) ? (
                        <div title={defaultCleanerName ? `${t("calendar.cleaningQ")} · ${defaultCleanerName}` : undefined} className="rounded px-1.5 h-[18px] flex items-center gap-0.5 text-sm text-text-primary/70 bg-text-primary/5 border border-text-primary/20 border-dashed font-semibold leading-none shadow-sm whitespace-nowrap">
                          <CleaningIcon />
                          <span>{t("calendar.cleaningQ")}</span>
                        </div>
                      ) : (
                        <div title={defaultCleanerName ? `${t("calendar.cleaning")} · ${defaultCleanerName}` : undefined} className="rounded px-1.5 h-[18px] flex items-center gap-0.5 text-sm text-status-buffer-fg bg-status-buffer-bg border border-status-buffer-border font-semibold leading-none shadow-sm whitespace-nowrap">
                          <CleaningIcon />
                          <span>{defaultCleanerName ?? t("calendar.cleaning")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual-cleaning chip on a booked day.
                      The middle-indicator path is suppressed when a bar
                      covers the cell (top-7/9 would collide with the
                      bar's z-10 layer). The host needs visual
                      confirmation that their explicit cleaning override
                      took effect, so we show a top-center chip in the
                      same slot as the same-day cleaning chip. The
                      isSameDayCleaning chip block above already covers
                      the auto-cleaning case; this only fires for the
                      explicit-override case on a booked day. */}
                  {hasManualCleaning && hasBar && !isSameDayCleaning && !isOpen && !isClosed && (
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                      <div title={defaultCleanerName ? `${t("calendar.manualCleaning")} · ${defaultCleanerName}` : undefined} className="rounded px-1.5 h-[18px] flex items-center gap-0.5 text-sm text-status-buffer-fg bg-status-buffer-bg border border-status-buffer-border font-semibold leading-none shadow-sm whitespace-nowrap">
                        <CleaningIcon />
                        <span>{defaultCleanerName ?? t("calendar.manualCleaning")}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
