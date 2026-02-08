import type { Fingerprint } from "@/shared/types";
import type { Extractor } from "@/shared/validate";
import { runExtractor } from "./extractors";

export function createFingerprint(): Fingerprint {
  return {
    url: location.href,
    host: location.hostname,
    path: location.pathname,
    title: document.title || undefined,
  };
}

const BANNED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function setNestedValue(
  obj: Record<string, unknown>,
  key: string,
  value: string,
): void {
  const parts = key.split(".");
  if (parts.some((p) => BANNED_KEYS.has(p))) return;
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== "object") {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

export function enrichFingerprint(
  base: Fingerprint,
  extractors: Extractor[],
): {
  fingerprint: Fingerprint;
  extractedKeys: string[];
  failedExtractors: { type: string; reason: string }[];
} {
  const fp: Fingerprint = JSON.parse(JSON.stringify(base));
  const extractedKeys: string[] = [];
  const failedExtractors: { type: string; reason: string }[] = [];

  for (const ext of extractors) {
    try {
      const value = runExtractor(ext);
      if (value !== null) {
        setNestedValue(fp as unknown as Record<string, unknown>, ext.key, value);
        extractedKeys.push(ext.key);
      }
    } catch (e) {
      failedExtractors.push({ type: ext.type, reason: String(e) });
    }
  }

  return { fingerprint: fp, extractedKeys, failedExtractors };
}

export function isSameFingerprint(a: Fingerprint, b: Fingerprint): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
