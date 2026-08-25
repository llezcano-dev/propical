// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "./table";

describe("Table", () => {
  it("renders a container + table with data-slot", () => {
    const { container } = render(<Table />);
    expect(container.querySelector("[data-slot='table-container']")).not.toBeNull();
    expect(container.querySelector("[data-slot='table']")).not.toBeNull();
  });

  it("composes the full table structure", () => {
    render(
      <Table>
        <TableCaption>Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    expect(screen.getByText("Caption")).toHaveAttribute("data-slot", "table-caption");
    expect(screen.getByText("Name")).toHaveAttribute("data-slot", "table-head");
    expect(screen.getByText("Cell")).toHaveAttribute("data-slot", "table-cell");
    expect(screen.getByText("Total")).toHaveAttribute("data-slot", "table-cell");
  });

  it("merges a custom className on the table", () => {
    const { container } = render(<Table className="my-table" />);
    expect(container.querySelector("[data-slot='table']")).toHaveClass("my-table");
  });
});