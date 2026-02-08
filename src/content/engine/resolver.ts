import type { Fingerprint } from "@/shared/types";
import type { Rule, MatchExpr } from "@/shared/validate";
import { enrichFingerprint } from "./fingerprint";

function getNestedValue(obj: unknown, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function matchesTarget(rule: Rule, fingerprint: Fingerprint): boolean {
  const { host, urlPattern } = rule.target;

  if (!host && !urlPattern) return false;

  if (host) {
    const hosts = Array.isArray(host) ? host : [host];
    if (
      !hosts.some(
        (h) =>
          fingerprint.host === h || fingerprint.host.endsWith(`.${h}`),
      )
    ) {
      return false;
    }
  }

  if (urlPattern) {
    const escaped = urlPattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    if (!new RegExp(`^${escaped}$`).test(fingerprint.url)) {
      return false;
    }
  }

  return true;
}

function evaluateMatch(expr: MatchExpr, fingerprint: Fingerprint): boolean {
  const value = getNestedValue(fingerprint, expr.key);
  switch (expr.op) {
    case "exists":
      return value !== undefined;
    case "eq":
      return value === expr.value;
    case "regex": {
      if (value === undefined) return false;
      return new RegExp(expr.pattern).test(value);
    }
    case "in":
      return value !== undefined && expr.values.includes(value);
  }
}

export type ResolveResult = {
  rule: Rule;
  fingerprint: Fingerprint;
};

export function resolve(
  rules: Rule[],
  baseFingerprint: Fingerprint,
): ResolveResult | null {
  const sorted = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    if (!matchesTarget(rule, baseFingerprint)) continue;

    if (rule.detection.mode === "urlOnly") {
      return { rule, fingerprint: baseFingerprint };
    }

    const extractors = rule.detection.extractors ?? [];
    const { fingerprint: enriched } = enrichFingerprint(
      baseFingerprint,
      extractors,
    );

    const matchExprs = rule.detection.match ?? [];
    if (matchExprs.length === 0) {
      return { rule, fingerprint: enriched };
    }

    if (matchExprs.every((m) => evaluateMatch(m, enriched))) {
      return { rule, fingerprint: enriched };
    }
  }

  return null;
}
