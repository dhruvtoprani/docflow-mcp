type GoalProfile = "pagination" | "webhook" | "auth" | "generic";

const baseRelevancePatterns: RegExp[] = [
  /endpoint|route|method|curl|\bpost\b|\bget\b|\bput\b|\bpatch\b|\bdelete\b|\/api|\/v\d+\//i,
  /request|request body|payload|parameter|params|query|header|required|field|schema/i,
  /response|status|returns?|json|example response/i,
  /error|unauthorized|forbidden|not found|rate limit|throttle|quota|retry-after|\b4\d\d\b|\b5\d\d\b/i,
  /\b(?:validateRequest|requestValidator|chat\.postMessage|personalizations|ratelimited|least privilege|scoped)\b|\/v3\/mail\/send/i
];

const profileRelevancePatterns: Record<GoalProfile, RegExp[]> = {
  pagination: [
    /\b(?:starting_after|ending_before|has_more|next_cursor|start_cursor|page_size|limit|cursor|pagination)\b/i
  ],
  webhook: [
    /\b(?:webhook|signature|hmac|timingsafeequal|raw body|x-hub-signature-256|x-slack-signature|x-slack-request-timestamp|x-twilio-signature)\b/i,
    /\b(?:middleware|x-forwarded-proto|x-forwarded-host)\b/i
  ],
  auth: [
    /auth|authorization|api key|bearer|token|oauth|credential/i,
    /\b(?:secret|environment variable|server-side|process\.env)\b/i
  ],
  generic: [/auth|authorization|api key|bearer|token|oauth|credential/i]
};

const hardAnchorPatterns: RegExp[] = [
  /\b(?:get|post|put|patch|delete)\s+\/[^\s)]+/i,
  /https?:\/\/[^\s)]+\/v\d+\/[^\s)]+/i,
  /\/v\d+\/[a-z0-9/_-]+/i,
  /\b(?:authorization|content-type|accept|notion-version|x-github-api-version|idempotency-key|x-hub-signature-256|x-slack-signature|x-slack-request-timestamp|x-twilio-signature)\b/i,
  /\b(?:starting_after|ending_before|has_more|next_cursor|start_cursor|page_size|limit)\b/i,
  /\b(?:retry-after|x-forwarded-proto|x-forwarded-host|middleware|timingsafeequal|raw body)\b/i,
  /process\.env\.[A-Z0-9_]+/,
  /\b(?:validateRequest|requestValidator)\b/i,
  /\bchat\.postMessage\b/i,
  /\/v3\/mail\/send/i,
  /\bpersonalizations\b/i,
  /\b(?:ratelimited|retry-after|429)\b/i
];

function requiredAnchorPatterns(profile: GoalProfile): RegExp[] {
  if (profile === "pagination") {
    return [
      /\b(?:starting_after|ending_before|next_cursor|start_cursor|has_more)\b/i,
      /\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/|\/v\d+\//i,
      /\b(?:limit|page_size)\b/i
    ];
  }
  if (profile === "webhook") {
    return [
      /\b(?:x-hub-signature-256|x-slack-signature|x-twilio-signature)\b/i,
      /\braw body\b/i,
      /\b(?:timingsafeequal|hmac)\b/i,
      /\b(?:validateRequest|requestValidator)\b/i
    ];
  }
  if (profile === "auth") {
    return [
      /\bauthorization\b.*\bbearer\b|\bbearer\b/i,
      /\bprocess\.env\.[A-Z0-9_]+|environment variable|server-side\b/i,
      /\b(?:401|403|404|error|unauthorized|forbidden)\b/i
    ];
  }
  return [/\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/|\/v\d+\//i, /\b(?:authorization|token|api key|content-type|accept)\b/i];
}

function normalizeLines(lines: string[]): string[] {
  const out: string[] = [];
  let previousBlank = false;

  for (const line of lines) {
    const trimmed = line.trimEnd();
    const isBlank = trimmed.trim().length === 0;
    if (isBlank && previousBlank) {
      continue;
    }
    out.push(trimmed);
    previousBlank = isBlank;
  }

  return out;
}

function detectGoalProfile(goal?: string): GoalProfile {
  const text = (goal ?? "").toLowerCase();
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

function buildRelevancePatterns(goal?: string): RegExp[] {
  const profile = detectGoalProfile(goal);
  return [...baseRelevancePatterns, ...profileRelevancePatterns[profile]];
}

function isRelevantLine(line: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(line));
}

function isHardAnchorLine(line: string): boolean {
  return hardAnchorPatterns.some((pattern) => pattern.test(line));
}

function shouldKeepFence(lines: string[], startIndex: number, patterns: RegExp[]): boolean {
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      return false;
    }
    if (isRelevantLine(line, patterns) || isHardAnchorLine(line)) {
      return true;
    }
  }
  return false;
}

function shouldKeepHeading(lines: string[], index: number, patterns: RegExp[]): boolean {
  const current = lines[index] ?? "";
  if (isRelevantLine(current, patterns) || isHardAnchorLine(current)) {
    return true;
  }
  for (let i = index + 1; i < Math.min(index + 4, lines.length); i += 1) {
    const candidate = lines[i] ?? "";
    if (/^#{1,6}\s+/.test(candidate.trim())) {
      return false;
    }
    if (isRelevantLine(candidate, patterns) || isHardAnchorLine(candidate)) {
      return true;
    }
  }
  return false;
}

function lineIsUseful(line: string, relevancePatterns: RegExp[]): boolean {
  return isHardAnchorLine(line) || isRelevantLine(line, relevancePatterns);
}

function addLineUnique(lines: string[], line: string): void {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }
  if (!lines.includes(line)) {
    lines.push(line);
  }
}

function collectBackfillLines(
  allLines: string[],
  selectedText: string,
  relevancePatterns: RegExp[],
  requiredPatterns: RegExp[]
): string[] {
  const backfill: string[] = [];
  const missing = requiredPatterns.filter((pattern) => !pattern.test(selectedText));

  for (const pattern of missing) {
    let addedForPattern = 0;
    for (let i = 0; i < allLines.length; i += 1) {
      const line = allLines[i] ?? "";
      if (!pattern.test(line)) {
        continue;
      }

      const prev = allLines[i - 1] ?? "";
      const next = allLines[i + 1] ?? "";
      if (/^#{1,6}\s+/.test(prev.trim())) {
        addLineUnique(backfill, prev);
      }
      addLineUnique(backfill, line);
      if (lineIsUseful(next, relevancePatterns) && next.trim().length <= 220) {
        addLineUnique(backfill, next);
      }

      addedForPattern += 1;
      if (addedForPattern >= 3) {
        break;
      }
    }
  }

  return backfill;
}

export function compactImplementationContext(markdown: string, maxChars: number, goal?: string): string {
  const profile = detectGoalProfile(goal);
  const relevancePatterns = buildRelevancePatterns(goal);
  const lines = markdown.split(/\r?\n/);
  const selected: string[] = [];
  const hardAnchors = new Set<string>();

  let inFence = false;
  let keepFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const isFence = trimmed.startsWith("```");
    const isHeading = /^#{1,6}\s+/.test(trimmed);
    const relevant = isRelevantLine(line, relevancePatterns) || isHardAnchorLine(line);

    if (isHardAnchorLine(line)) {
      hardAnchors.add(trimmed);
    }

    if (isFence) {
      if (!inFence) {
        inFence = true;
        // Keep code fences when they contain implementation signals.
        const prev = lines[i - 1] || "";
        const next = lines[i + 1] || "";
        keepFence =
          relevant ||
          isRelevantLine(prev, relevancePatterns) ||
          isRelevantLine(next, relevancePatterns) ||
          isHardAnchorLine(prev) ||
          isHardAnchorLine(next) ||
          shouldKeepFence(lines, i, relevancePatterns);
      } else {
        inFence = false;
      }

      if (keepFence) {
        selected.push(line);
      }
      continue;
    }

    if (inFence) {
      if (keepFence) {
        selected.push(line);
      }
      continue;
    }

    if (relevant || (isHeading && shouldKeepHeading(lines, i, relevancePatterns))) {
      selected.push(line);
      continue;
    }

    // Keep immediate body lines after kept headings.
    const prev = selected[selected.length - 1] || "";
    if (/^#{1,6}\s+/.test(prev.trim()) && trimmed.length > 0) {
      selected.push(line);
    }
  }

  const selectedText = selected.join("\n");
  const backfillLines = collectBackfillLines(
    lines,
    selectedText,
    relevancePatterns,
    requiredAnchorPatterns(profile)
  );

  const normalizedSelected = normalizeLines([...selected, ...backfillLines]);
  const anchorLines = Array.from(hardAnchors).slice(0, 12);

  const anchorSection =
    anchorLines.length > 0
      ? ["## Critical API Anchors", ...anchorLines.map((line) => `- ${line}`), ""]
      : [];
  const compacted = [...anchorSection, ...normalizedSelected].join("\n").trim();

  return compacted.length > maxChars
    ? `${compacted.slice(0, maxChars)}\n\n[Compacted content clipped to maxChars=${maxChars}]`
    : compacted;
}
