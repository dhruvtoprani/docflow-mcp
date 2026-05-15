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
  cleanedImplementationMarkdown: string;
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

export type ClipOutputMode = "clipper_context" | "clipper_markdown" | "clipper_text";

export type ClipDocsPageInput = {
  url: string;
  goal?: string;
  stack?: string;
  maxChars?: number;
  mode?: ClipOutputMode;
};

export type ClipDocsPageOutput = {
  mode: ClipOutputMode;
  copyReadyText: string;
  page: {
    title: string;
    sourceUrl: string;
    goal: string;
    stack?: string;
    warnings: string[];
    detectedSections: DetectedSections;
  };
  formats: {
    clipperContext: string;
    markdown: string;
    plainText: string;
  };
  stats: {
    rawHtmlChars: number;
    cleanedTextChars: number;
    contextPackChars: number;
    copyReadyChars: number;
    estimatedReductionPercent: number;
  };
};

export type SynthesizeDocsPagesInput = {
  urls: string[];
  goal?: string;
  stack?: string;
  maxChars?: number;
  mode?: ClipOutputMode;
};

export type SynthesizeDocsPagesOutput = {
  mode: ClipOutputMode;
  copyReadyText: string;
  goal: string;
  stack?: string;
  pages: Array<{
    title: string;
    sourceUrl: string;
    warnings: string[];
    contextPackChars: number;
    cleanedChars: number;
    estimatedReductionPercent: number;
  }>;
  stats: {
    pageCount: number;
    totalRawHtmlChars: number;
    totalContextPackChars: number;
    totalCopyReadyChars: number;
    averageReductionPercent: number;
  };
};
