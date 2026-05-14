import type { DetectedSections } from "../types/docflow.js";

type GoalProfile = "pagination" | "webhook" | "auth" | "generic";

type RequiredAnchor = {
  label: string;
  pattern: RegExp;
};

function detectGoalProfile(goal: string): GoalProfile {
  const text = goal.toLowerCase();
  if (/pagination|cursor|next_cursor|has_more|starting_after|ending_before/.test(text)) {
    return "pagination";
  }
  if (/webhook|signature|hmac|timingsafeequal|x-hub-signature|x-slack-signature|x-twilio-signature/.test(text)) {
    return "webhook";
  }
  if (/auth|authorization|token|bearer|oauth|api key/.test(text)) {
    return "auth";
  }
  return "generic";
}

function uniqueLines(lines: string[], max = 8): string[] {
  return Array.from(new Set(lines.map((line) => line.trim()).filter(Boolean))).slice(0, max);
}

function collectCriticalAnchors(markdown: string): {
  methodsAndPaths: string[];
  headers: string[];
  envVars: string[];
  paginationTokens: string[];
  webhookSignals: string[];
} {
  const lines = markdown.split(/\r?\n/);
  const methodsAndPaths: string[] = [];
  const headers: string[] = [];
  const envVars: string[] = [];
  const paginationTokens: string[] = [];
  const webhookSignals: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (
      /\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/[^\s`]+/i.test(trimmed) ||
      /\/v\d+\/[a-z0-9/_-]+/i.test(trimmed)
    ) {
      methodsAndPaths.push(trimmed);
    }

    if (
      /\b(?:Authorization|Accept|Content-Type|Notion-Version|X-GitHub-Api-Version|Idempotency-Key|X-Hub-Signature-256|X-Slack-Signature|X-Slack-Request-Timestamp|X-Twilio-Signature|Retry-After|X-Forwarded-Proto|X-Forwarded-Host)\b/i.test(
        trimmed
      )
    ) {
      headers.push(trimmed);
    }

    if (/process\.env\.[A-Z0-9_]+/.test(trimmed)) {
      envVars.push(trimmed);
    }

    if (/\b(?:starting_after|ending_before|has_more|next_cursor|start_cursor|limit|page_size)\b/i.test(trimmed)) {
      paginationTokens.push(trimmed);
    }

    if (
      /\b(?:raw body|timingsafeequal|hmac|signature|middleware|x-forwarded-proto|x-forwarded-host)\b/i.test(
        trimmed
      )
    ) {
      webhookSignals.push(trimmed);
    }
  }

  return {
    methodsAndPaths: uniqueLines(methodsAndPaths),
    headers: uniqueLines(headers),
    envVars: uniqueLines(envVars),
    paginationTokens: uniqueLines(paginationTokens),
    webhookSignals: uniqueLines(webhookSignals)
  };
}

function requiredAnchorsForProfile(profile: GoalProfile): RequiredAnchor[] {
  if (profile === "pagination") {
    return [
      { label: "Cursor token and continuation flow", pattern: /\b(?:starting_after|ending_before|next_cursor|start_cursor|has_more)\b/i },
      { label: "Method + endpoint path", pattern: /\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/|\/v\d+\//i },
      { label: "Caller-configurable page size or limit", pattern: /\b(?:limit|page_size)\b/i }
    ];
  }
  if (profile === "webhook") {
    return [
      { label: "Signature header", pattern: /\b(?:x-hub-signature-256|x-slack-signature|x-twilio-signature)\b/i },
      { label: "Raw body before parsing", pattern: /\braw body\b/i },
      { label: "Timing-safe comparison / HMAC verification", pattern: /\b(?:timingsafeequal|hmac)\b/i }
    ];
  }
  if (profile === "auth") {
    return [
      { label: "Authorization header format", pattern: /\bauthorization\b.*\bbearer\b|\bbearer\b/i },
      { label: "Server-side env var secret handling", pattern: /\bprocess\.env\.[A-Z0-9_]+|environment variable|server-side\b/i },
      { label: "Explicit non-2xx error handling guidance", pattern: /\b(?:401|403|404|error|unauthorized|forbidden)\b/i }
    ];
  }
  return [
    { label: "Method + endpoint path", pattern: /\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/|\/v\d+\//i },
    { label: "Required headers/auth hints", pattern: /\b(?:authorization|token|api key|content-type|accept)\b/i }
  ];
}

function renderChecklist(markdown: string, profile: GoalProfile): { checklist: string; missingLabels: string[] } {
  const requirements = requiredAnchorsForProfile(profile);
  const lines: string[] = [];
  const missing: string[] = [];

  for (const requirement of requirements) {
    const found = requirement.pattern.test(markdown);
    lines.push(`- [${found ? "x" : " "}] ${requirement.label}`);
    if (!found) {
      missing.push(requirement.label);
    }
  }

  return {
    checklist: lines.join("\n"),
    missingLabels: missing
  };
}

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
  const goalProfile = detectGoalProfile(goal);
  const anchors = collectCriticalAnchors(markdown);
  const { checklist, missingLabels } = renderChecklist(markdown, goalProfile);

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
  for (const missingLabel of missingLabels) {
    warnings.push(`Goal-critical detail appears missing: ${missingLabel}.`);
  }

  const contextPackPrefix = `# DocFlow Context Pack

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

## Goal Profile
- ${goalProfile}

## Goal-Specific Implementation Checklist
${checklist}

## Critical Anchors Found
${anchors.methodsAndPaths.length ? `- Methods and paths:\n${anchors.methodsAndPaths.map((line) => `  - ${line}`).join("\n")}` : "- Methods and paths: none clearly found"}
${anchors.headers.length ? `- Headers and auth signals:\n${anchors.headers.map((line) => `  - ${line}`).join("\n")}` : "- Headers and auth signals: none clearly found"}
${anchors.envVars.length ? `- Environment variable usage hints:\n${anchors.envVars.map((line) => `  - ${line}`).join("\n")}` : "- Environment variable usage hints: none clearly found"}
${anchors.paginationTokens.length ? `- Pagination tokens:\n${anchors.paginationTokens.map((line) => `  - ${line}`).join("\n")}` : "- Pagination tokens: none clearly found"}
${anchors.webhookSignals.length ? `- Webhook verification signals:\n${anchors.webhookSignals.map((line) => `  - ${line}`).join("\n")}` : "- Webhook verification signals: none clearly found"}

## Instructions for AI Coding Assistant
Use the documentation context below to help implement the user's goal.
Do not invent API behavior that is not supported by this context.
If required information is missing, ask the user for the relevant documentation page.
Keep secrets and API keys server-side unless the documentation explicitly says otherwise.
When you respond, include this minimum implementation contract:
- Exact HTTP method + endpoint path(s)
- Required headers and auth format exactly as documented
- Required request fields and pagination tokens (if any)
- A reusable server-side helper/client (not just one-off demo code)
- Explicit non-2xx handling and security notes
If any item above is missing from context, say it is missing instead of guessing.

## Cleaned Documentation Context
`;

  // Enforce a real final size budget for the whole context pack, not just raw markdown.
  const markdownBudget = Math.max(2000, maxChars - contextPackPrefix.length - 120);
  const clippedMarkdown =
    markdown.length > markdownBudget
      ? `${markdown.slice(0, markdownBudget)}\n\n[Content clipped to budget=${markdownBudget}]`
      : markdown;

  const contextPack = `${contextPackPrefix}${clippedMarkdown}
`;

  return {
    contextPackMarkdown: contextPack.trim(),
    warnings
  };
}
