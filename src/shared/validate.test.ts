import { describe, it, expect } from "vitest";
import { ruleSchema, rulesSchema, extractorSchema, matchExprSchema } from "./validate";

describe("extractorSchema", () => {
  it("accepts domTextRegex", () => {
    const result = extractorSchema.safeParse({
      type: "domTextRegex",
      key: "identity.id",
      pattern: "\\d+",
      scope: "header",
    });
    expect(result.success).toBe(true);
  });

  it("accepts meta", () => {
    const result = extractorSchema.safeParse({
      type: "meta",
      key: "env",
      name: "environment",
    });
    expect(result.success).toBe(true);
  });

  it("accepts titleRegex", () => {
    const result = extractorSchema.safeParse({
      type: "titleRegex",
      key: "project",
      pattern: "^(.+?) -",
    });
    expect(result.success).toBe(true);
  });

  it("accepts selectorText", () => {
    const result = extractorSchema.safeParse({
      type: "selectorText",
      key: "user",
      selector: "#username",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown type", () => {
    const result = extractorSchema.safeParse({
      type: "cookie",
      key: "x",
    });
    expect(result.success).toBe(false);
  });
});

describe("matchExprSchema", () => {
  it.each([
    { op: "exists", key: "identity.id" },
    { op: "eq", key: "env", value: "prod" },
    { op: "regex", key: "env", pattern: "^prod" },
    { op: "in", key: "env", values: ["prod", "staging"] },
  ])("accepts $op", (expr) => {
    expect(matchExprSchema.safeParse(expr).success).toBe(true);
  });

  it("rejects missing fields for eq", () => {
    const result = matchExprSchema.safeParse({ op: "eq", key: "x" });
    expect(result.success).toBe(false);
  });
});

describe("ruleSchema", () => {
  const validRule = {
    id: "r1",
    name: "Test",
    enabled: true,
    priority: 100,
    target: { host: "example.com" },
    detection: { mode: "urlOnly" as const },
    display: {
      labelTemplate: "TEST",
      color: "#ff0000",
      position: "topRight" as const,
    },
  };

  it("accepts a minimal valid rule", () => {
    expect(ruleSchema.safeParse(validRule).success).toBe(true);
  });

  it("accepts host as array", () => {
    const rule = { ...validRule, target: { host: ["a.com", "b.com"] } };
    expect(ruleSchema.safeParse(rule).success).toBe(true);
  });

  it("rejects invalid color", () => {
    const rule = {
      ...validRule,
      display: { ...validRule.display, color: "red" },
    };
    expect(ruleSchema.safeParse(rule).success).toBe(false);
  });

  it("rejects color with script injection", () => {
    const rule = {
      ...validRule,
      display: { ...validRule.display, color: "#ff0000; background-image: url(x)" },
    };
    expect(ruleSchema.safeParse(rule).success).toBe(false);
  });

  it("accepts opacity in range", () => {
    const rule = {
      ...validRule,
      display: { ...validRule.display, opacity: 0.5 },
    };
    expect(ruleSchema.safeParse(rule).success).toBe(true);
  });

  it("rejects opacity > 1", () => {
    const rule = {
      ...validRule,
      display: { ...validRule.display, opacity: 1.5 },
    };
    expect(ruleSchema.safeParse(rule).success).toBe(false);
  });
});

describe("rulesSchema", () => {
  it("accepts empty array", () => {
    expect(rulesSchema.safeParse([]).success).toBe(true);
  });

  it("rejects non-array", () => {
    expect(rulesSchema.safeParse("not array").success).toBe(false);
  });
});
