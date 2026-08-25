import { describe, it, expect } from "vitest";
import {
  requiresProperty,
  hasPortfolioForm,
  allPropertiesDestination,
  NAVBAR_TAB_GROUPS,
  defaultViewFor,
  resolveActiveView,
  isAppView,
  APP_VIEWS,
} from "./navigation";

describe("navigation model (URL ↔ navbar hierarchy)", () => {
  describe("requiresProperty", () => {
    it("marks calendar, sync, guest-form and guests as property-scoped", () => {
      expect(requiresProperty("calendar")).toBe(true);
      expect(requiresProperty("sync")).toBe(true);
      expect(requiresProperty("guest-form")).toBe(true);
      expect(requiresProperty("guests")).toBe(true);
    });

    it("keeps portfolio-capable views free", () => {
      expect(requiresProperty("dashboard")).toBe(false);
      expect(requiresProperty("cleaning")).toBe(false);
      expect(requiresProperty("reports")).toBe(false);
      expect(requiresProperty("profile")).toBe(false);
      expect(requiresProperty("settings")).toBe(false);
      expect(requiresProperty("tasks")).toBe(false);
    });
  });

  describe("hasPortfolioForm", () => {
    it("dashboard, cleaning and reports have a portfolio-wide form", () => {
      expect(hasPortfolioForm("dashboard")).toBe(true);
      expect(hasPortfolioForm("cleaning")).toBe(true);
      expect(hasPortfolioForm("reports")).toBe(true);
    });

    it("property-scoped views do not", () => {
      expect(hasPortfolioForm("calendar")).toBe(false);
      expect(hasPortfolioForm("sync")).toBe(false);
      expect(hasPortfolioForm("guest-form")).toBe(false);
      expect(hasPortfolioForm("guests")).toBe(false);
    });
  });

  describe("allPropertiesDestination (dropdown 'Todas as propriedades')", () => {
    it("dual views stay in the current view (global form)", () => {
      expect(allPropertiesDestination("cleaning")).toBe("cleaning");
      expect(allPropertiesDestination("reports")).toBe("reports");
    });

    it("property-scoped views land on the Panel", () => {
      expect(allPropertiesDestination("calendar")).toBe("dashboard");
      expect(allPropertiesDestination("sync")).toBe("dashboard");
      expect(allPropertiesDestination("guest-form")).toBe("dashboard");
      expect(allPropertiesDestination("guests")).toBe("dashboard");
    });

    it("everything else lands on the Panel", () => {
      expect(allPropertiesDestination("dashboard")).toBe("dashboard");
      expect(allPropertiesDestination("profile")).toBe("dashboard");
      expect(allPropertiesDestination("settings")).toBe("dashboard");
      expect(allPropertiesDestination("tasks")).toBe("dashboard");
    });
  });

  describe("NAVBAR_TAB_GROUPS (navbar layout)", () => {
    it("group 0 is the portfolio group: Painel | Limpeza | Relatórios", () => {
      const views = NAVBAR_TAB_GROUPS[0].map((t) => t.view);
      expect(views).toEqual(["dashboard", "cleaning", "reports"]);
      // every tab in the portfolio group must work without a property
      for (const v of views) {
        expect(requiresProperty(v)).toBe(false);
        expect(hasPortfolioForm(v)).toBe(true);
      }
    });

    it("group 1 is the property-scoped group: Calendário | Configurações", () => {
      const views = NAVBAR_TAB_GROUPS[1].map((t) => t.view);
      expect(views).toEqual(["calendar", "sync"]);
      for (const v of views) {
        expect(requiresProperty(v)).toBe(true);
        expect(hasPortfolioForm(v)).toBe(false);
      }
    });

    it("covers exactly the five navbar tabs, no duplicates", () => {
      const all = NAVBAR_TAB_GROUPS.flat().map((t) => t.view);
      expect(all).toEqual(["dashboard", "cleaning", "reports", "calendar", "sync"]);
      expect(new Set(all).size).toBe(all.length);
    });
  });

  describe("defaultViewFor (URL default per context)", () => {
    it("a property's home is the calendar", () => {
      expect(defaultViewFor(false, true)).toBe("calendar");
    });

    it("the portfolio home is the dashboard", () => {
      expect(defaultViewFor(false, false)).toBe("dashboard");
    });

    it("an open reservation deep-links to the guest view", () => {
      expect(defaultViewFor(true, true)).toBe("guests");
      expect(defaultViewFor(true, false)).toBe("guests");
    });
  });

  describe("resolveActiveView", () => {
    it("honours an explicit valid view param", () => {
      expect(resolveActiveView("reports", false, true)).toBe("reports");
      expect(resolveActiveView("cleaning", false, false)).toBe("cleaning");
    });

    it("falls back to the context default when the param is absent", () => {
      expect(resolveActiveView(null, false, true)).toBe("calendar");
      expect(resolveActiveView(null, false, false)).toBe("dashboard");
      expect(resolveActiveView(null, true, false)).toBe("guests");
    });

    it("falls back on an invalid view param (no more silent ghost states)", () => {
      expect(resolveActiveView("foobar", false, false)).toBe("dashboard");
      expect(resolveActiveView("", false, true)).toBe("calendar");
    });
  });

  describe("isAppView", () => {
    it("accepts every declared view and rejects anything else", () => {
      for (const v of APP_VIEWS) expect(isAppView(v)).toBe(true);
      expect(isAppView("calendar")).toBe(true);
      expect(isAppView("bogus")).toBe(false);
      expect(isAppView(null)).toBe(false);
      expect(isAppView(undefined)).toBe(false);
      expect(isAppView("")).toBe(false);
    });
  });
});
