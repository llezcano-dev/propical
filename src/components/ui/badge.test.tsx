// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, badgeVariants } from "./badge";

describe("Badge", () => {
  it("renders a span by default", () => {
    render(<Badge>New</Badge>);
    const el = screen.getByText("New");
    expect(el.tagName).toBe("SPAN");
  });

  it("applies default variant classes", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toHaveClass(
      "bg-primary",
      "text-primary-foreground",
    );
  });

  it.each([
    ["secondary", "bg-secondary"],
    ["destructive", "bg-destructive/10"],
    ["outline", "border-border"],
    ["ghost", "hover:bg-muted"],
    ["link", "text-primary"],
  ] as const)("applies the %s variant", (variant, cls) => {
    render(<Badge variant={variant}>New</Badge>);
    expect(screen.getByText("New")).toHaveClass(cls);
  });

  it("merges a custom className", () => {
    render(<Badge className="my-badge">New</Badge>);
    expect(screen.getByText("New")).toHaveClass("my-badge");
  });

  it("supports the render prop to change the tag", () => {
    render(
      <Badge render={<a href="/x" />}>Link</Badge>,
    );
    const el = screen.getByText("Link");
    expect(el.tagName).toBe("A");
    expect(el).toHaveAttribute("href", "/x");
  });

  it("badgeVariants export returns the expected classes", () => {
    expect(badgeVariants({ variant: "outline" })).toContain("border-border");
  });
});