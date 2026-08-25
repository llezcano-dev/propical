import { describe, it, expect } from "vitest";
import { isStagingHost } from "./seo-host";

describe("isStagingHost", () => {
  it("treats apex and www as production", () => {
    expect(isStagingHost("propical.com.br")).toBe(false);
    expect(isStagingHost("www.propical.com.br")).toBe(false);
  });

  it("ignores port suffix on production hosts", () => {
    expect(isStagingHost("propical.com.br:443")).toBe(false);
    expect(isStagingHost("www.propical.com.br:80")).toBe(false);
  });

  it("blocks the staging subdomain", () => {
    expect(isStagingHost("staging.propical.com.br")).toBe(true);
    expect(isStagingHost("staging.example.com")).toBe(true);
  });

  it("blocks dev / preview hosts", () => {
    expect(isStagingHost("dev.propical.com.br")).toBe(true);
    expect(isStagingHost("propical.vercel.app")).toBe(true);
    expect(isStagingHost("propical.ondigitalocean.app")).toBe(true);
  });

  it("blocks local development", () => {
    expect(isStagingHost("localhost")).toBe(true);
    expect(isStagingHost("localhost:3000")).toBe(true);
    expect(isStagingHost("127.0.0.1")).toBe(true);
    expect(isStagingHost("127.0.0.1:3000")).toBe(true);
  });

  it("normalizes case", () => {
    expect(isStagingHost("STAGING.PROPICAL.COM.BR")).toBe(true);
    expect(isStagingHost("propical.com.br")).toBe(false);
  });

  it("returns false for missing host (fail-safe — assume production)", () => {
    expect(isStagingHost(null)).toBe(false);
    expect(isStagingHost(undefined)).toBe(false);
    expect(isStagingHost("")).toBe(false);
  });
});
