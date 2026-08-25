import { describe, it, expect } from "vitest";
import { canAccessAdmin } from "./admin-access";

describe("canAccessAdmin", () => {
  it("grants access to superadmin", () => {
    expect(canAccessAdmin("superadmin")).toBe(true);
  });

  it("denies a regular user", () => {
    expect(canAccessAdmin("user")).toBe(false);
  });

  it("denies any other known role", () => {
    expect(canAccessAdmin("manager")).toBe(false);
    expect(canAccessAdmin("cleaner")).toBe(false);
  });

  it("denies null and undefined roles (no session / malformed payload)", () => {
    expect(canAccessAdmin(null)).toBe(false);
    expect(canAccessAdmin(undefined)).toBe(false);
  });

  it("denies an empty string role", () => {
    expect(canAccessAdmin("")).toBe(false);
  });

  it("denies case-mismatched role strings (exact match required)", () => {
    expect(canAccessAdmin("Superadmin")).toBe(false);
    expect(canAccessAdmin(" SUPERADMIN ")).toBe(false);
  });
});
