const relevancePatterns: RegExp[] = [
  /auth|authorization|api key|bearer|token|oauth|credential/i,
  /endpoint|route|method|curl|\bpost\b|\bget\b|\bput\b|\bpatch\b|\bdelete\b|\/api|\/v\d+\//i,
  /request|request body|payload|parameter|params|query|header|required|field|schema/i,
  /response|status|returns?|json|example response/i,
  /error|unauthorized|forbidden|not found|rate limit|throttle|quota|retry-after|\b4\d\d\b|\b5\d\d\b/i,
  /security|secret|environment variable|server-side|do not expose|permissions|scope|middleware|proxy|x-forwarded-proto|x-forwarded-host|timingsafeequal|hmac/i,
  /install|setup|quickstart|prerequisite/i
];

const hardAnchorPatterns: RegExp[] = [
  /\b(?:get|post|put|patch|delete)\s+\/[^\s)]+/i,
  /https?:\/\/[^\s)]+\/v\d+\/[^\s)]+/i,
  /\/v\d+\/[a-z0-9/_-]+/i,
  /\b(?:authorization|content-type|accept|notion-version|x-github-api-version|idempotency-key|x-hub-signature-256|x-slack-signature|x-slack-request-timestamp|x-twilio-signature)\b/i,
  /\b(?:starting_after|ending_before|has_more|next_cursor|start_cursor|page_size|limit)\b/i,
  /\b(?:retry-after|x-forwarded-proto|x-forwarded-host|middleware|timingsafeequal|raw body)\b/i,
  /process\.env\.[A-Z0-9_]+/
];

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

function isRelevantLine(line: string): boolean {
  return relevancePatterns.some((pattern) => pattern.test(line));
}

function isHardAnchorLine(line: string): boolean {
  return hardAnchorPatterns.some((pattern) => pattern.test(line));
}

function shouldKeepFence(lines: string[], startIndex: number): boolean {
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      return false;
    }
    if (isRelevantLine(line) || isHardAnchorLine(line)) {
      return true;
    }
  }
  return false;
}

export function compactImplementationContext(markdown: string, maxChars: number): string {
  const lines = markdown.split(/\r?\n/);
  const selected: string[] = [];
  const hardAnchors = new Set<string>();
  let signalHits = 0;

  let inFence = false;
  let keepFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const isFence = trimmed.startsWith("```");
    const isHeading = /^#{1,6}\s+/.test(trimmed);
    const relevant = isRelevantLine(line) || isHardAnchorLine(line);

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
          isRelevantLine(prev) ||
          isRelevantLine(next) ||
          isHardAnchorLine(prev) ||
          isHardAnchorLine(next) ||
          shouldKeepFence(lines, i);
      } else {
        inFence = false;
      }

      if (keepFence) {
        selected.push(line);
        signalHits += 1;
      }
      continue;
    }

    if (inFence) {
      if (keepFence) {
        selected.push(line);
        signalHits += 1;
      }
      continue;
    }

    if (relevant || isHeading) {
      selected.push(line);
      signalHits += 1;
      continue;
    }

    // Keep immediate body lines after kept headings.
    const prev = selected[selected.length - 1] || "";
    if (/^#{1,6}\s+/.test(prev.trim()) && trimmed.length > 0) {
      selected.push(line);
    }
  }

  const normalizedSelected = normalizeLines(selected);
  const anchorLines = Array.from(hardAnchors).slice(0, 40);

  const anchorSection =
    anchorLines.length > 0
      ? ["## Critical API Anchors", ...anchorLines.map((line) => `- ${line}`), ""]
      : [];
  const compacted = [...anchorSection, ...normalizedSelected].join("\n").trim();
  const fallback = markdown.slice(0, maxChars).trim();

  if (signalHits < 4 && compacted.length < Math.min(1200, maxChars / 4)) {
    return fallback;
  }

  return compacted.length > maxChars
    ? `${compacted.slice(0, maxChars)}\n\n[Compacted content clipped to maxChars=${maxChars}]`
    : compacted;
}
