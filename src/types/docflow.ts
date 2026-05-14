export type DetectedSections = {
  installation: boolean;
  authentication: boolean;
  endpoint: boolean;
  parameters: boolean;
  requestExample: boolean;
  responseExample: boolean;
  errors: boolean;
  rateLimits: boolean;
  security: boolean;
};

export type ExtractDocsContextInput = {
  url: string;
  goal: string;
  stack?: string;
  maxChars?: number;
};

export type ExtractDocsContextOutput = {
  title: string;
  sourceUrl: string;
  goal: string;
  stack?: string;
  contextPackMarkdown: string;
  rawCleanMarkdownPreview: string;
  detectedSections: DetectedSections;
  warnings: string[];
  suspiciousInstructions: string[];
  stats: {
    rawHtmlChars: number;
    cleanedTextChars: number;
    contextPackChars: number;
    estimatedReductionPercent: number;
  };
};
