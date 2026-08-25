// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./input";

describe("Input", () => {
  it("renders an input with data-slot", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toHaveAttribute("data-slot", "input");
  });

  it("passes the type through", () => {
    render(<Input type="email" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it("merges a custom className", () => {
    render(<Input className="my-input" />);
    expect(screen.getByRole("textbox")).toHaveClass("my-input");
  });

  it("handles value + onChange", () => {
    const onChange = vi.fn();
    render(<Input value="abc" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("abc");
    fireEvent.change(input, { target: { value: "xyz" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("passes placeholder", () => {
    render(<Input placeholder="Nome" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Nome");
  });
});