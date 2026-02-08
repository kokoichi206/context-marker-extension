import { describe, it, expect } from "vitest";
import type { Fingerprint } from "@/shared/types";
import { enrichFingerprint, isSameFingerprint } from "./fingerprint";

function baseFp(): Fingerprint {
  return {
    url: "https://example.com/page",
    host: "example.com",
    path: "/page",
  };
}

describe("enrichFingerprint", () => {
  it("sets a simple key", () => {
    document.body.innerHTML = '<div id="env">production</div>';
    const { fingerprint, extractedKeys } = enrichFingerprint(baseFp(), [
      { type: "selectorText", key: "env", selector: "#env" },
    ]);
    expect((fingerprint as Record<string, unknown>).env).toBe("production");
    expect(extractedKeys).toEqual(["env"]);
  });

  it("sets a nested key", () => {
    document.body.innerHTML = '<div id="acct">12345</div>';
    const { fingerprint } = enrichFingerprint(baseFp(), [
      { type: "selectorText", key: "identity.accountId", selector: "#acct" },
    ]);
    const identity = (fingerprint as Record<string, unknown>).identity as Record<string, unknown>;
    expect(identity.accountId).toBe("12345");
  });

  it("does not mutate the original fingerprint", () => {
    document.body.innerHTML = '<div id="x">val</div>';
    const original = baseFp();
    enrichFingerprint(original, [
      { type: "selectorText", key: "x", selector: "#x" },
    ]);
    expect((original as Record<string, unknown>).x).toBeUndefined();
  });

  it("records failed extractors", () => {
    document.body.innerHTML = "";
    const { failedExtractors } = enrichFingerprint(baseFp(), [
      { type: "domTextRegex", key: "x", pattern: "[invalid" },
    ]);
    expect(failedExtractors.length).toBe(1);
    expect(failedExtractors[0].type).toBe("domTextRegex");
  });

  it("skips extractors that return null", () => {
    document.body.innerHTML = "";
    const { extractedKeys } = enrichFingerprint(baseFp(), [
      { type: "selectorText", key: "missing", selector: "#nonexistent" },
    ]);
    expect(extractedKeys).toEqual([]);
  });

  it("blocks __proto__ pollution", () => {
    document.body.innerHTML = '<div id="x">evil</div>';
    const { fingerprint } = enrichFingerprint(baseFp(), [
      { type: "selectorText", key: "__proto__.polluted", selector: "#x" },
    ]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect((fingerprint as Record<string, unknown>).__proto__).toBeDefined();
  });

  it("blocks constructor pollution", () => {
    document.body.innerHTML = '<div id="x">evil</div>';
    enrichFingerprint(baseFp(), [
      { type: "selectorText", key: "constructor.polluted", selector: "#x" },
    ]);
    expect((Object as unknown as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("isSameFingerprint", () => {
  it("returns true for identical fingerprints", () => {
    const a = baseFp();
    const b = { ...baseFp() };
    expect(isSameFingerprint(a, b)).toBe(true);
  });

  it("returns false when a field differs", () => {
    const a = baseFp();
    const b = { ...baseFp(), path: "/other" };
    expect(isSameFingerprint(a, b)).toBe(false);
  });

  it("returns false when extra keys present", () => {
    const a = baseFp();
    const b = { ...baseFp(), extra: "val" } as Fingerprint;
    expect(isSameFingerprint(a, b)).toBe(false);
  });
});
