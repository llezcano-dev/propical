// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("renders a native button with data-slot", () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveAttribute("data-slot", "button");
  });

  it("applies default variant + size classes", () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("bg-primary", "text-primary-foreground", "h-8");
  });

  it.each([
    ["outline", "border-border"],
    ["secondary", "bg-secondary"],
    ["ghost", "hover:bg-muted"],
    ["destructive", "bg-destructive/10"],
    ["link", "text-primary"],
  ] as const)("applies the %s variant", (variant, cls) => {
    render(<Button variant={variant}>Save</Button>);
    expect(screen.getByRole("button")).toHaveClass(cls);
  });

  it.each([
    ["xs", "h-6"],
    ["sm", "h-7"],
    ["lg", "h-9"],
    ["icon", "size-8"],
  ] as const)("applies the %s size", (size, cls) => {
    render(<Button size={size}>Save</Button>);
    expect(screen.getByRole("button")).toHaveClass(cls);
  });

  it("merges a custom className", () => {
    render(<Button className="my-btn">Save</Button>);
    expect(screen.getByRole("button")).toHaveClass("my-btn");
  });

  it("fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects disabled", () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("buttonVariants export returns the expected classes", () => {
    expect(buttonVariants({ variant: "destructive" })).toContain("bg-destructive/10");
    expect(buttonVariants({ size: "icon" })).toContain("size-8");
  });
});