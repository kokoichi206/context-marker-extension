export type Fingerprint = {
  url: string;
  host: string;
  path: string;
  title?: string;

  identity?: {
    accountId?: string;
    roleName?: string;
    userName?: string;
    tenant?: string;
    workspace?: string;
  };

  context?: {
    region?: string;
    project?: string;
  };

  _debug?: {
    extractedKeys: string[];
    failedExtractors: { type: string; reason: string }[];
    triggeredBy: string[];
  };
};
