import type { DetectedSections } from "../types/docflow.js";

export function generateContextPack(args: {
  title: string;
  sourceUrl: string;
  goal: string;
  stack?: string;
  markdown: string;
  detectedSections: DetectedSections;
  suspiciousInstructions: string[];
  maxChars?: number;
}): {
  contextPackMarkdown: string;
  warnings: string[];
} {
  const {
    title,
    sourceUrl,
    goal,
    stack,
    markdown,
    detectedSections,
    suspiciousInstructions,
    maxChars = 12000
  } = args;

  const warnings: string[] = [];

  if (!detectedSections.authentication) {
    warnings.push("Authentication details were not clearly found on this page.");
  }
  if (!detectedSections.installation) {
    warnings.push("Installation or setup instructions were not clearly found on this page.");
  }
  if (!detectedSections.rateLimits) {
    warnings.push("Rate limits were not clearly found on this page.");
  }
  if (suspiciousInstructions.length > 0) {
    warnings.push(
      "Suspicious prompt-injection-like instructions were detected and removed from the context pack."
    );
  }

  const clippedMarkdown =
    markdown.length > maxChars
      ? `${markdown.slice(0, maxChars)}\n\n[Content clipped to maxChars=${maxChars}]`
      : markdown;

  const contextPack = `# DocFlow Context Pack

## Goal
${goal}

${stack ? `## User Stack\n${stack}\n` : ""}
## Source
- Title: ${title}
- URL: ${sourceUrl}

## Detected Documentation Coverage
- Installation/setup: ${detectedSections.installation ? "Found" : "Not clearly found"}
- Authentication: ${detectedSections.authentication ? "Found" : "Not clearly found"}
- Endpoint/API reference: ${detectedSections.endpoint ? "Found" : "Not clearly found"}
- Parameters/request body: ${detectedSections.parameters ? "Found" : "Not clearly found"}
- Request example: ${detectedSections.requestExample ? "Found" : "Not clearly found"}
- Response example: ${detectedSections.responseExample ? "Found" : "Not clearly found"}
- Errors: ${detectedSections.errors ? "Found" : "Not clearly found"}
- Rate limits: ${detectedSections.rateLimits ? "Found" : "Not clearly found"}
- Security notes: ${detectedSections.security ? "Found" : "Not clearly found"}

## Warnings
${warnings.length ? warnings.map((w) => `- ${w}`).join("\n") : "- None"}

## Instructions for AI Coding Assistant
Use the documentation context below to help implement the user's goal.
Do not invent API behavior that is not supported by this context.
If required information is missing, ask the user for the relevant documentation page.
Keep secrets and API keys server-side unless the documentation explicitly says otherwise.

## Cleaned Documentation Context
${clippedMarkdown}
`;

  return {
    contextPackMarkdown: contextPack.trim(),
    warnings
  };
}
