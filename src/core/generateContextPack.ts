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

function collectMissingLabels(markdown: string, profile: GoalProfile): string[] {
  return requiredAnchorsForProfile(profile)
    .filter((requirement) => !requirement.pattern.test(markdown))
    .map((requirement) => requirement.label);
}

function renderOutputContract(profile: GoalProfile): string {
  const lines = [
    "- Use exact method + endpoint path as documented in excerpts.",
    "- Include required headers/auth exactly as documented.",
    "- Provide a reusable backend helper (not only a one-off script).",
    "- Include explicit non-2xx handling.",
    "- Avoid placeholders/TODOs; provide executable code paths."
  ];

  if (profile === "pagination") {
    lines.push("- Implement concrete cursor continuation with documented token names.");
  }
  if (profile === "webhook") {
    lines.push("- Verify signature against raw body before parsing and use timing-safe comparison.");
    lines.push("- If docs include a provider validation helper, use it directly instead of pseudo-code.");
  }
  if (profile === "auth") {
    lines.push("- Keep secrets server-side via environment variables.");
  }

  lines.push("- If an SDK example is used, also show the equivalent direct HTTP endpoint call when endpoint details are present.");

  return lines.join("\n");
}

function renderTaskSignals(
  profile: GoalProfile,
  anchors: ReturnType<typeof collectCriticalAnchors>
): string {
  const sections: string[] = [];

  if (anchors.methodsAndPaths.length > 0) {
    sections.push(
      `- Endpoints and methods:\n${anchors.methodsAndPaths.map((line) => `  - ${line}`).join("\n")}`
    );
  }
  if (anchors.headers.length > 0) {
    sections.push(
      `- Headers and auth format:\n${anchors.headers.map((line) => `  - ${line}`).join("\n")}`
    );
  }

  if (profile === "auth" && anchors.envVars.length > 0) {
    sections.push(
      `- Server-side secret handling signals:\n${anchors.envVars.map((line) => `  - ${line}`).join("\n")}`
    );
  }

  if (profile === "pagination" && anchors.paginationTokens.length > 0) {
    sections.push(
      `- Pagination tokens:\n${anchors.paginationTokens.map((line) => `  - ${line}`).join("\n")}`
    );
  }

  if (profile === "webhook" && anchors.webhookSignals.length > 0) {
    sections.push(
      `- Webhook verification signals:\n${anchors.webhookSignals.map((line) => `  - ${line}`).join("\n")}`
    );
  }

  if (sections.length === 0) {
    return "- No strong task-specific signals were extracted; rely on excerpts below.";
  }

  return sections.join("\n");
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
  const missingLabels = collectMissingLabels(markdown, goalProfile);

  if (suspiciousInstructions.length > 0) {
    warnings.push(
      "Suspicious prompt-injection-like instructions were detected and removed from the context pack."
    );
  }
  if (goalProfile === "auth" && !detectedSections.authentication) {
    warnings.push("Auth details were not clearly found on this page.");
  }
  if (goalProfile === "pagination" && !detectedSections.parameters) {
    warnings.push("Pagination parameters were not clearly found on this page.");
  }
  if (goalProfile === "webhook" && !detectedSections.security) {
    warnings.push("Webhook/security verification details were not clearly found on this page.");
  }
  for (const label of missingLabels) {
    warnings.push(`Missing anchor in extracted context: ${label}.`);
  }

  const contextPackPrefix = `# DocFlow Context Pack

## Goal
${goal}

${stack ? `## User Stack\n${stack}\n` : ""}
## Source
- Title: ${title}
- URL: ${sourceUrl}

## Output Contract
${renderOutputContract(goalProfile)}

## Task Signals
${renderTaskSignals(goalProfile, anchors)}
${suspiciousInstructions.length > 0 ? `\n## Notes\n- Suspicious prompt-injection-like instructions were removed.\n` : ""}
## Documentation Excerpts
`;

  // Enforce a real final size budget for the whole context pack, not just raw markdown.
  const markdownBudget = Math.max(1200, maxChars - contextPackPrefix.length - 120);
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
