// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Separator } from "./separator";

describe("Separator", () => {
  it("renders with data-slot=separator", () => {
    const { container } = render(<Separator />);
    const el = container.querySelector("[data-slot='separator']");
    expect(el).not.toBeNull();
  });

  it("defaults to horizontal orientation", () => {
    const { container } = render(<Separator />);
    expect(container.querySelector("[data-slot='separator']")).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );
  });

  it("supports vertical orientation", () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.querySelector("[data-slot='separator']")).toHaveAttribute(
      "data-orientation",
      "vertical",
    );
  });

  it("merges a custom className", () => {
    const { container } = render(<Separator className="my-sep" />);
    expect(container.querySelector("[data-slot='separator']")).toHaveClass(
      "my-sep",
    );
  });
});