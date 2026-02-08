import type { Extractor } from "@/shared/validate";

export const awsExtractors: Extractor[] = [
  {
    type: "domTextRegex",
    key: "identity.accountId",
    pattern: "\\b\\d{12}\\b",
    scope: "header",
  },
  {
    type: "domTextRegex",
    key: "identity.roleName",
    pattern: "role\\s*[:：]\\s*([A-Za-z0-9+=,.@_-]+)",
    scope: "header",
  },
];
