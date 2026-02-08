import { describe, it, expect } from "vitest";
import type { Fingerprint } from "@/shared/types";
import type { Rule } from "@/shared/validate";
import { resolve } from "./resolver";

function makeRule(overrides: Partial<Rule> & { id: string }): Rule {
  return {
    name: "test",
    enabled: true,
    priority: 100,
    target: { host: "example.com" },
    detection: { mode: "urlOnly" },
    display: {
      labelTemplate: "TEST",
      color: "#ff0000",
      position: "topRight",
    },
    ...overrides,
  };
}

function makeFp(overrides?: Partial<Fingerprint>): Fingerprint {
  return {
    url: "https://example.com/page",
    host: "example.com",
    path: "/page",
    ...overrides,
  };
}

describe("resolve", () => {
  describe("target matching", () => {
    it("matches exact host", () => {
      const rules = [makeRule({ id: "r1", target: { host: "example.com" } })];
      const result = resolve(rules, makeFp());
      expect(result?.rule.id).toBe("r1");
    });

    it("matches subdomain", () => {
      const rules = [makeRule({ id: "r1", target: { host: "example.com" } })];
      const fp = makeFp({ host: "sub.example.com" });
      expect(resolve(rules, fp)?.rule.id).toBe("r1");
    });

    it("does not match partial host name", () => {
      const rules = [makeRule({ id: "r1", target: { host: "example.com" } })];
      const fp = makeFp({ host: "notexample.com" });
      expect(resolve(rules, fp)).toBeNull();
    });

    it("matches any host in array", () => {
      const rules = [
        makeRule({ id: "r1", target: { host: ["a.com", "b.com"] } }),
      ];
      const fp = makeFp({ host: "b.com", url: "https://b.com/" });
      expect(resolve(rules, fp)?.rule.id).toBe("r1");
    });

    it("matches urlPattern with glob", () => {
      const rules = [
        makeRule({
          id: "r1",
          target: { urlPattern: "https://example.com/app/*" },
        }),
      ];
      const fp = makeFp({ url: "https://example.com/app/dashboard" });
      expect(resolve(rules, fp)?.rule.id).toBe("r1");
    });

    it("rejects non-matching urlPattern", () => {
      const rules = [
        makeRule({
          id: "r1",
          target: { urlPattern: "https://example.com/app/*" },
        }),
      ];
      const fp = makeFp({ url: "https://example.com/other" });
      expect(resolve(rules, fp)).toBeNull();
    });

    it("requires both host and urlPattern to match when both specified", () => {
      const rules = [
        makeRule({
          id: "r1",
          target: { host: "example.com", urlPattern: "https://example.com/app/*" },
        }),
      ];
      const fp = makeFp({ url: "https://example.com/other" });
      expect(resolve(rules, fp)).toBeNull();
    });

    it("returns null when target has no host and no urlPattern", () => {
      const rules = [makeRule({ id: "r1", target: {} })];
      expect(resolve(rules, makeFp())).toBeNull();
    });
  });

  describe("priority", () => {
    it("returns the highest priority matching rule", () => {
      const rules = [
        makeRule({ id: "low", priority: 10, target: { host: "example.com" } }),
        makeRule({ id: "high", priority: 200, target: { host: "example.com" } }),
        makeRule({ id: "mid", priority: 50, target: { host: "example.com" } }),
      ];
      expect(resolve(rules, makeFp())?.rule.id).toBe("high");
    });
  });

  describe("enabled filter", () => {
    it("skips disabled rules", () => {
      const rules = [
        makeRule({ id: "r1", enabled: false, target: { host: "example.com" } }),
      ];
      expect(resolve(rules, makeFp())).toBeNull();
    });
  });

  describe("urlOnly mode", () => {
    it("returns base fingerprint without enrichment", () => {
      const rules = [
        makeRule({ id: "r1", detection: { mode: "urlOnly" } }),
      ];
      const fp = makeFp();
      const result = resolve(rules, fp);
      expect(result?.fingerprint).toBe(fp);
    });
  });

  describe("signals mode", () => {
    it("matches with no match expressions (extractor-only)", () => {
      const rules = [
        makeRule({
          id: "r1",
          detection: { mode: "signals", extractors: [], match: [] },
        }),
      ];
      expect(resolve(rules, makeFp())?.rule.id).toBe("r1");
    });
  });

  describe("match expressions", () => {
    it("eq: matches when value equals", () => {
      document.title = "My App";
      document.body.innerHTML = '<div id="env">production</div>';

      const rules = [
        makeRule({
          id: "r1",
          detection: {
            mode: "signals",
            extractors: [
              { type: "selectorText", key: "env", selector: "#env" },
            ],
            match: [{ op: "eq", key: "env", value: "production" }],
          },
        }),
      ];
      const result = resolve(rules, makeFp());
      expect(result?.rule.id).toBe("r1");
    });

    it("eq: fails when value differs", () => {
      document.body.innerHTML = '<div id="env">staging</div>';

      const rules = [
        makeRule({
          id: "r1",
          detection: {
            mode: "signals",
            extractors: [
              { type: "selectorText", key: "env", selector: "#env" },
            ],
            match: [{ op: "eq", key: "env", value: "production" }],
          },
        }),
      ];
      expect(resolve(rules, makeFp())).toBeNull();
    });

    it("exists: matches when key is extracted", () => {
      document.body.innerHTML = '<div id="info">12345</div>';

      const rules = [
        makeRule({
          id: "r1",
          detection: {
            mode: "signals",
            extractors: [
              { type: "selectorText", key: "info.id", selector: "#info" },
            ],
            match: [{ op: "exists", key: "info.id" }],
          },
        }),
      ];
      expect(resolve(rules, makeFp())?.rule.id).toBe("r1");
    });

    it("regex: matches when pattern matches", () => {
      document.body.innerHTML = '<span class="acct">Account: 123456789012</span>';

      const rules = [
        makeRule({
          id: "r1",
          detection: {
            mode: "signals",
            extractors: [
              {
                type: "domTextRegex",
                key: "account",
                pattern: "(\\d{12})",
              },
            ],
            match: [{ op: "regex", key: "account", pattern: "^123" }],
          },
        }),
      ];
      expect(resolve(rules, makeFp())?.rule.id).toBe("r1");
    });

    it("in: matches when value is in array", () => {
      document.body.innerHTML = '<div id="env">staging</div>';

      const rules = [
        makeRule({
          id: "r1",
          detection: {
            mode: "signals",
            extractors: [
              { type: "selectorText", key: "env", selector: "#env" },
            ],
            match: [{ op: "in", key: "env", values: ["production", "staging"] }],
          },
        }),
      ];
      expect(resolve(rules, makeFp())?.rule.id).toBe("r1");
    });

    it("all match expressions must pass", () => {
      document.body.innerHTML = '<div id="env">prod</div><div id="region">us-east-1</div>';

      const rules = [
        makeRule({
          id: "r1",
          detection: {
            mode: "signals",
            extractors: [
              { type: "selectorText", key: "env", selector: "#env" },
              { type: "selectorText", key: "region", selector: "#region" },
            ],
            match: [
              { op: "eq", key: "env", value: "prod" },
              { op: "eq", key: "region", value: "ap-northeast-1" },
            ],
          },
        }),
      ];
      expect(resolve(rules, makeFp())).toBeNull();
    });
  });

  it("returns null for empty rules", () => {
    expect(resolve([], makeFp())).toBeNull();
  });
});
