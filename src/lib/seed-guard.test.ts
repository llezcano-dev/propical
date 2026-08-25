import { describe, it, expect } from "vitest";
import { assertSeedAllowsSuperadmin } from "./seed-guard";

describe("assertSeedAllowsSuperadmin", () => {
  it("throws when NODE_ENV=production and username is the default 'admin'", () => {
    expect(() =>
      assertSeedAllowsSuperadmin({ nodeEnv: "production", username: "admin" }),
    ).toThrow(/Refusing to seed a superadmin named "admin"/);
  });

  it("throws case-insensitively for predictable variants", () => {
    expect(() =>
      assertSeedAllowsSuperadmin({ nodeEnv: "production", username: "Admin" }),
    ).toThrow();
    expect(() =>
      assertSeedAllowsSuperadmin({ nodeEnv: "production", username: " ADMIN " }),
    ).toThrow();
  });

  it("allows a custom username in production", () => {
    expect(() =>
      assertSeedAllowsSuperadmin({ nodeEnv: "production", username: "propical-root" }),
    ).not.toThrow();
  });

  it("allows the default username outside production", () => {
    expect(() =>
      assertSeedAllowsSuperadmin({ nodeEnv: "development", username: "admin" }),
    ).not.toThrow();
    expect(() =>
      assertSeedAllowsSuperadmin({ nodeEnv: "test", username: "admin" }),
    ).not.toThrow();
    expect(() =>
      assertSeedAllowsSuperadmin({ username: "admin" }),
    ).not.toThrow();
  });

  it("is a no-op when NODE_ENV is not set", () => {
    expect(() =>
      assertSeedAllowsSuperadmin({ nodeEnv: undefined, username: "admin" }),
    ).not.toThrow();
  });
});
