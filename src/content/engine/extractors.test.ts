import { describe, it, expect, beforeEach } from "vitest";
import { runExtractor } from "./extractors";

beforeEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  document.title = "";
});

describe("runExtractor", () => {
  describe("domTextRegex", () => {
    it("extracts capture group from body", () => {
      document.body.innerHTML = "<p>Account: 123456789012</p>";
      const result = runExtractor({
        type: "domTextRegex",
        key: "id",
        pattern: "(\\d{12})",
      });
      expect(result).toBe("123456789012");
    });

    it("returns full match when no capture group", () => {
      document.body.innerHTML = "<p>env=production</p>";
      const result = runExtractor({
        type: "domTextRegex",
        key: "env",
        pattern: "production",
      });
      expect(result).toBe("production");
    });

    it("scopes to header elements", () => {
      document.body.innerHTML = `
        <header><span>PROD</span></header>
        <main><span>DEV</span></main>
      `;
      const result = runExtractor({
        type: "domTextRegex",
        key: "env",
        pattern: "(PROD|DEV)",
        scope: "header",
      });
      expect(result).toBe("PROD");
    });

    it("falls back to body when header not found", () => {
      document.body.innerHTML = "<div>fallback-value</div>";
      const result = runExtractor({
        type: "domTextRegex",
        key: "x",
        pattern: "(fallback-value)",
        scope: "header",
      });
      expect(result).toBe("fallback-value");
    });

    it("returns null when pattern does not match", () => {
      document.body.innerHTML = "<p>no match here</p>";
      const result = runExtractor({
        type: "domTextRegex",
        key: "x",
        pattern: "\\d{12}",
      });
      expect(result).toBeNull();
    });
  });

  describe("meta", () => {
    it("extracts meta tag content by name", () => {
      document.head.innerHTML = '<meta name="environment" content="staging">';
      const result = runExtractor({
        type: "meta",
        key: "env",
        name: "environment",
      });
      expect(result).toBe("staging");
    });

    it("returns null when meta tag not found", () => {
      document.head.innerHTML = '<meta name="other" content="val">';
      const result = runExtractor({
        type: "meta",
        key: "env",
        name: "environment",
      });
      expect(result).toBeNull();
    });
  });

  describe("titleRegex", () => {
    it("extracts capture group from title", () => {
      document.title = "MyApp - Dashboard [PROD]";
      const result = runExtractor({
        type: "titleRegex",
        key: "env",
        pattern: "\\[(\\w+)\\]",
      });
      expect(result).toBe("PROD");
    });

    it("returns full match when no capture group", () => {
      document.title = "PROD Dashboard";
      const result = runExtractor({
        type: "titleRegex",
        key: "env",
        pattern: "PROD",
      });
      expect(result).toBe("PROD");
    });

    it("returns null when title does not match", () => {
      document.title = "Regular Page";
      const result = runExtractor({
        type: "titleRegex",
        key: "env",
        pattern: "\\[(\\w+)\\]",
      });
      expect(result).toBeNull();
    });
  });

  describe("selectorText", () => {
    it("extracts text content from selector", () => {
      document.body.innerHTML = '<span id="user">admin</span>';
      const result = runExtractor({
        type: "selectorText",
        key: "user",
        selector: "#user",
      });
      expect(result).toBe("admin");
    });

    it("trims whitespace", () => {
      document.body.innerHTML = '<span id="user">  admin  </span>';
      const result = runExtractor({
        type: "selectorText",
        key: "user",
        selector: "#user",
      });
      expect(result).toBe("admin");
    });

    it("returns null when selector not found", () => {
      document.body.innerHTML = "<div>content</div>";
      const result = runExtractor({
        type: "selectorText",
        key: "user",
        selector: "#nonexistent",
      });
      expect(result).toBeNull();
    });
  });
});
