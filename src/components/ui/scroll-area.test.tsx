// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScrollArea } from "./scroll-area";

// jsdom no implementa ResizeObserver ni getAnimations — base-ui scroll-area
// los necesita (el viewport llama getAnimations en un timeout).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverMock;
  Element.prototype.getAnimations = () => [];
});

describe("ScrollArea", () => {
  it("renders the root with data-slot=scroll-area", () => {
    const { container } = render(<ScrollArea>content</ScrollArea>);
    expect(container.querySelector("[data-slot='scroll-area']")).not.toBeNull();
  });

  it("renders children inside the viewport", () => {
    render(<ScrollArea>Hello scroll</ScrollArea>);
    expect(screen.getByText("Hello scroll")).toBeInTheDocument();
  });

  it("merges a custom className", () => {
    const { container } = render(
      <ScrollArea className="my-scroll">x</ScrollArea>,
    );
    expect(container.querySelector("[data-slot='scroll-area']")).toHaveClass(
      "my-scroll",
    );
  });
});