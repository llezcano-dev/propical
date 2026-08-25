// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip, chipVariants } from "./chip";

describe("Chip", () => {
  it("renders a span with the base flex classes", () => {
    render(<Chip>Feed público</Chip>);
    const el = screen.getByText("Feed público");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("inline-flex", "items-center", "gap-1.5");
  });

  it("defaults to pill + neutral + md", () => {
    render(<Chip>Label</Chip>);
    expect(screen.getByText("Label")).toHaveClass(
      "rounded-full",
      "bg-surface-hover",
      "text-text-muted",
      "px-2",
      "py-0.5",
      "text-sm",
    );
  });

  it.each([
    ["pill", ["rounded-full"]],
    ["tag", ["rounded", "uppercase", "tracking-wide"]],
  ] as const)("applies the %s variant classes", (variant, classes) => {
    render(<Chip variant={variant}>Label</Chip>);
    for (const c of classes) {
      expect(screen.getByText("Label")).toHaveClass(c);
    }
  });

  it.each([
    ["neutral", ["bg-surface-hover", "text-text-muted"]],
    ["faint", ["bg-surface-hover/50", "text-text-faint"]],
    ["action", ["border", "border-action-primary/30", "bg-action-primary/10", "text-action-primary-text"]],
    ["success", ["bg-tone-success-bg", "text-tone-success-fg"]],
    ["error", ["bg-tone-error-bg", "text-tone-error-fg"]],
    ["warning", ["bg-tone-warning-bg", "text-tone-warning-fg"]],
    ["info", ["bg-tone-info-bg", "text-tone-info-fg"]],
    ["brand", ["text-white"]],
  ] as const)("applies the %s tone classes", (tone, classes) => {
    render(<Chip tone={tone}>Label</Chip>);
    for (const c of classes) {
      expect(screen.getByText("Label")).toHaveClass(c);
    }
  });

  it.each([
    ["sm", ["px-1.5", "py-0.5", "text-sm"]],
    ["md", ["px-2", "py-0.5", "text-sm"]],
    ["lg", ["px-2.5", "py-1", "text-sm"]],
  ] as const)("applies the %s size classes", (size, classes) => {
    render(<Chip size={size}>Label</Chip>);
    for (const c of classes) {
      expect(screen.getByText("Label")).toHaveClass(c);
    }
  });

  it("renders the leading element before the label", () => {
    const { container } = render(
      <Chip leading={<span data-testid="dot" className="h-2 w-2 rounded-full" />}>Label</Chip>,
    );
    const chip = container.firstChild as HTMLElement;
    const dot = screen.getByTestId("dot");
    expect(chip).toContainElement(dot);
    expect(chip.textContent).toBe("Label");
  });

  it("merges a custom className (twMerge overrides)", () => {
    render(<Chip className="py-1 font-semibold rounded-md">Label</Chip>);
    const el = screen.getByText("Label");
    expect(el).toHaveClass("py-1", "font-semibold", "rounded-md");
    expect(el).not.toHaveClass("py-0.5");
    expect(el).not.toHaveClass("rounded-full");
  });

  it("passes through HTML attributes and inline style", () => {
    render(
      <Chip id="chip-id" aria-label="Status" style={{ backgroundColor: "#003580" }}>
        Label
      </Chip>,
    );
    const el = screen.getByText("Label");
    expect(el).toHaveAttribute("id", "chip-id");
    expect(el).toHaveAttribute("aria-label", "Status");
    expect(el).toHaveStyle({ backgroundColor: "#003580" });
  });

  it("chipVariants export returns the expected classes", () => {
    expect(chipVariants()).toContain("rounded-full");
    expect(chipVariants({ variant: "tag" })).toContain("uppercase");
    expect(chipVariants({ tone: "error" })).toContain("bg-tone-error-bg");
    expect(chipVariants({ size: "lg" })).toContain("px-2.5");
  });
});