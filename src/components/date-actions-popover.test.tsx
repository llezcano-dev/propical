// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DateActionsPopover } from "./date-actions-popover";

/**
 * DT7 regression: a POTENTIAL cleaning day (speculative dashed
 * "Limpeza?" chip — a suggested cleaning in an empty gap, not a real
 * one) must offer "Schedule cleaning" (confirm the suggestion) and
 * "Make available for booking" (dismiss it) — NOT "Cancel cleaning",
 * which is reserved for real auto-cleaning days (buffer / same-day
 * turnover).
 */

interface Status {
  hasBar: boolean;
  isBuffer: boolean;
  isPotential: boolean;
  isSameDayCleaning: boolean;
  isUnbookable: boolean;
  isOpenOverride: boolean;
  isClosedOverride: boolean;
  isManualCleaning: boolean;
}

const FREE_STATUS: Status = {
  hasBar: false,
  isBuffer: false,
  isPotential: false,
  isSameDayCleaning: false,
  isUnbookable: false,
  isOpenOverride: false,
  isClosedOverride: false,
  isManualCleaning: false,
};

const L_SCHEDULE = "Schedule cleaning";
const L_MAKE_AVAILABLE = "Make available for booking";
const L_CANCEL = "Cancel cleaning";

function renderPopover(status: Status, overrides: Record<string, unknown> = {}) {
  const handlers = {
    onClose: vi.fn(),
    onToggleDate: vi.fn(),
    onCloseDate: vi.fn(),
    onOpenDate: vi.fn(),
    onScheduleCleaning: vi.fn(),
    onRemoveOverride: vi.fn(),
    onExtendBooking: vi.fn(),
    onCreateReservation: vi.fn(async () => ({ ok: true as const })),
  };
  render(
    <DateActionsPopover
      selectedDates={["2026-08-20"]}
      singleDate="2026-08-20"
      singleDateBars={[]}
      extendable={[]}
      isContiguousRange={true}
      singleStatus={status}
      bulkCounts={{
        booked: 0,
        openOverride: 0,
        closedOverride: 0,
        cleaningOverride: 0,
        autoBlocked: 1,
      }}
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

describe("DateActionsPopover — potential cleaning day (DT7)", () => {
  it("offers Schedule cleaning + Make available, never Cancel cleaning", () => {
    renderPopover({ ...FREE_STATUS, isPotential: true });

    expect(screen.getByText(L_SCHEDULE)).toBeInTheDocument();
    expect(screen.getByText(L_MAKE_AVAILABLE)).toBeInTheDocument();
    expect(screen.queryByText(L_CANCEL)).not.toBeInTheDocument();
  });

  it("shows the 'Potential cleaning' status header", () => {
    renderPopover({ ...FREE_STATUS, isPotential: true });
    expect(screen.getByText("Potential cleaning")).toBeInTheDocument();
  });

  it("Schedule cleaning confirms the suggestion via onScheduleCleaning", () => {
    const handlers = renderPopover({ ...FREE_STATUS, isPotential: true });
    screen.getByText(L_SCHEDULE).click();
    expect(handlers.onScheduleCleaning).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenDate).not.toHaveBeenCalled();
  });

  it("Make available dismisses the suggestion via onOpenDate", () => {
    const handlers = renderPopover({ ...FREE_STATUS, isPotential: true });
    screen.getByText(L_MAKE_AVAILABLE).click();
    expect(handlers.onOpenDate).toHaveBeenCalledTimes(1);
    expect(handlers.onScheduleCleaning).not.toHaveBeenCalled();
  });
});

describe("DateActionsPopover — real auto-cleaning days keep Cancel cleaning", () => {
  it("buffer day: Cancel cleaning, no Schedule cleaning", () => {
    renderPopover({ ...FREE_STATUS, isBuffer: true });

    expect(screen.getByText(L_CANCEL)).toBeInTheDocument();
    expect(screen.queryByText(L_SCHEDULE)).not.toBeInTheDocument();
  });

  it("same-day cleaning day: Cancel cleaning, no Schedule cleaning", () => {
    renderPopover({ ...FREE_STATUS, isSameDayCleaning: true });

    expect(screen.getByText(L_CANCEL)).toBeInTheDocument();
    expect(screen.queryByText(L_SCHEDULE)).not.toBeInTheDocument();
  });

  it("unbookable day: Make available, no Cancel cleaning", () => {
    renderPopover({ ...FREE_STATUS, isUnbookable: true });

    expect(screen.getByText(L_MAKE_AVAILABLE)).toBeInTheDocument();
    expect(screen.queryByText(L_CANCEL)).not.toBeInTheDocument();
  });
});