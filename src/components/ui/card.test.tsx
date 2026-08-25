// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "./card";

describe("Card", () => {
  it("renders a div with data-slot=card and default size", () => {
    render(<Card>content</Card>);
    const el = screen.getByText("content");
    expect(el).toHaveAttribute("data-slot", "card");
    expect(el).toHaveAttribute("data-size", "default");
  });

  it("size sm sets data-size", () => {
    render(<Card size="sm">content</Card>);
    expect(screen.getByText("content")).toHaveAttribute("data-size", "sm");
  });

  it("merges a custom className", () => {
    render(<Card className="my-card">content</Card>);
    expect(screen.getByText("content")).toHaveClass("my-card");
  });

  it("composes header/title/description/action/content/footer slots", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText("Title")).toHaveAttribute("data-slot", "card-title");
    expect(screen.getByText("Desc")).toHaveAttribute("data-slot", "card-description");
    expect(screen.getByText("Action")).toHaveAttribute("data-slot", "card-action");
    expect(screen.getByText("Body")).toHaveAttribute("data-slot", "card-content");
    expect(screen.getByText("Footer")).toHaveAttribute("data-slot", "card-footer");
  });
});