// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PlatformDot } from "./platform-dot";
import { resolvePlatformMeta } from "@/lib/platform-meta";

describe("PlatformDot", () => {
  it("renders a decorative span (aria-hidden)", () => {
    const { container } = render(<PlatformDot platform="booking" />);
    const el = container.querySelector("span");
    expect(el).not.toBeNull();
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("has the base dot classes", () => {
    const { container } = render(<PlatformDot platform="booking" />);
    expect(container.querySelector("span")).toHaveClass("shrink-0", "rounded-full");
  });

  it("defaults to size sm (h-2 w-2)", () => {
    const { container } = render(<PlatformDot platform="booking" />);
    expect(container.querySelector("span")).toHaveClass("h-2", "w-2");
  });

  it("size md renders h-2.5 w-2.5", () => {
    const { container } = render(<PlatformDot platform="booking" size="md" />);
    expect(container.querySelector("span")).toHaveClass("h-2.5", "w-2.5");
  });

  it("uses the platform brand color from platform-meta", () => {
    const { container } = render(<PlatformDot platform="booking" />);
    expect(container.querySelector("span")).toHaveStyle({
      backgroundColor: resolvePlatformMeta("booking").color,
    });
  });

  it("resolves known platforms to their brand color", () => {
    const { container } = render(<PlatformDot platform="airbnb" />);
    expect(container.querySelector("span")).toHaveStyle({
      backgroundColor: "#FF385C",
    });
  });

  it("falls back to the neutral color for unknown slugs", () => {
    const { container } = render(<PlatformDot platform="unknown-platform" />);
    expect(container.querySelector("span")).toHaveStyle({
      backgroundColor: "#6B7280",
    });
  });

  it("merges a custom className", () => {
    const { container } = render(
      <PlatformDot platform="booking" className="my-dot" />,
    );
    expect(container.querySelector("span")).toHaveClass("my-dot");
  });
});