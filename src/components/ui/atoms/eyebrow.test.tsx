// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Eyebrow, eyebrowVariants } from "./eyebrow";

describe("Eyebrow", () => {
  it("renders a span with the base uppercase classes", () => {
    render(<Eyebrow>Próximas estadías</Eyebrow>);
    const el = screen.getByText("Próximas estadías");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("text-sm", "uppercase");
  });

  it("defaults to the section variant", () => {
    render(<Eyebrow>Label</Eyebrow>);
    expect(screen.getByText("Label")).toHaveClass(
      "font-medium",
      "tracking-wide",
      "text-text-faint",
    );
  });

  it.each([
    ["section", ["font-medium", "tracking-wide", "text-text-faint"]],
    ["field", ["font-medium", "tracking-wider", "text-text-faint"]],
    ["tag", ["tracking-wider", "text-text-faint"]],
    ["semibold", ["font-semibold", "tracking-wider", "text-text-faint"]],
  ] as const)("applies the %s variant classes", (variant, classes) => {
    render(<Eyebrow variant={variant}>Label</Eyebrow>);
    for (const c of classes) {
      expect(screen.getByText("Label")).toHaveClass(c);
    }
  });

  it("merges a custom className", () => {
    render(<Eyebrow className="my-custom">Label</Eyebrow>);
    expect(screen.getByText("Label")).toHaveClass("my-custom");
  });

  it("passes through HTML attributes", () => {
    render(
      <Eyebrow id="eyebrow-id" aria-label="Section label">
        Label
      </Eyebrow>,
    );
    const el = screen.getByText("Label");
    expect(el).toHaveAttribute("id", "eyebrow-id");
    expect(el).toHaveAttribute("aria-label", "Section label");
  });

  it("eyebrowVariants export returns the expected classes", () => {
    expect(eyebrowVariants()).toContain("text-sm");
    expect(eyebrowVariants({ variant: "field" })).toContain("tracking-wider");
    expect(eyebrowVariants({ variant: "tag" })).not.toContain("font-medium");
    expect(eyebrowVariants({ variant: "semibold" })).toContain("font-semibold");
  });
});