// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders title as h2 by default with the base classes", () => {
    render(<PageHeader title="Sync logs" />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Sync logs");
    expect(heading).toHaveClass("text-2xl", "font-bold", "text-text-primary");
  });

  it("renders the subtitle below the title", () => {
    render(<PageHeader title="Sync logs" subtitle="All sync runs" />);
    const heading = screen.getByRole("heading", { level: 2 });
    const subtitle = screen.getByText("All sync runs");
    expect(subtitle.tagName).toBe("P");
    expect(subtitle).toHaveClass("mt-1", "text-sm", "text-text-faint");
    // subtitle va después del título en el DOM
    expect(heading.compareDocumentPosition(subtitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("supports level h1", () => {
    render(<PageHeader level="h1" title="Settings" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Settings");
  });

  it("renders actions on the right", () => {
    render(<PageHeader title="Users" actions={<button type="button">Add</button>} />);
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("aligns actions to start by default and center with align prop", () => {
    const { container, rerender } = render(
      <PageHeader title="T" actions={<button type="button">Go</button>} />,
    );
    expect(container.firstChild).toHaveClass("items-start");
    rerender(<PageHeader title="T" actions={<button type="button">Go</button>} align="center" />);
    expect(container.firstChild).toHaveClass("items-center");
    expect(container.firstChild).not.toHaveClass("items-start");
  });

  it("does not render the actions container when no actions", () => {
    const { container } = render(<PageHeader title="Users" />);
    // solo el div wrapper + el div del título
    expect(container.querySelectorAll("div").length).toBe(2);
  });

  it("merges titleClassName overrides (twMerge)", () => {
    render(<PageHeader title="Tasks" titleClassName="text-xl font-semibold tracking-tight" />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveClass("text-xl", "font-semibold", "tracking-tight");
    expect(heading).not.toHaveClass("text-2xl", "font-bold");
  });

  it("merges subtitleClassName overrides", () => {
    render(<PageHeader title="T" subtitle="S" subtitleClassName="text-text-muted" />);
    expect(screen.getByText("S")).toHaveClass("text-text-muted");
    expect(screen.getByText("S")).not.toHaveClass("text-text-faint");
  });

  it("merges a custom wrapper className", () => {
    render(<PageHeader title="T" className="my-wrapper" />);
    expect(screen.getByRole("heading", { level: 2 }).parentElement?.parentElement).toHaveClass(
      "my-wrapper",
    );
  });
});