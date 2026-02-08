export type Fingerprint = {
  url: string;
  host: string;
  path: string;
  title?: string;

  _debug?: {
    extractedKeys: string[];
    failedExtractors: { type: string; reason: string }[];
    triggeredBy: string[];
  };

  // Extractor results are set via setNestedValue with arbitrary key paths
  [key: string]: unknown;
};
