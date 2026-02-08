import type { Fingerprint } from "@/shared/types";
import type { Rule } from "@/shared/validate";

export function resolve(
  _rules: Rule[],
  _fingerprint: Fingerprint,
): Rule | null {
  // TODO: evaluate rules against fingerprint, return highest priority match
  return null;
}
