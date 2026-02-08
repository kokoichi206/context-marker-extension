import type { Fingerprint } from "@/shared/types";

export function createFingerprint(): Fingerprint {
  return {
    url: location.href,
    host: location.hostname,
    path: location.pathname,
    title: document.title || undefined,
  };
}

export function isSameFingerprint(a: Fingerprint, b: Fingerprint): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
