const relevancePatterns: RegExp[] = [
  /auth|authorization|api key|bearer|token|oauth|credential/i,
  /endpoint|route|method|curl|\bpost\b|\bget\b|\bput\b|\bpatch\b|\bdelete\b|\/api/i,
  /request|request body|payload|parameter|params|query|header|required|field|schema/i,
  /response|status|returns?|json|example response/i,
  /error|unauthorized|forbidden|not found|rate limit|throttle|quota|\b4\d\d\b|\b5\d\d\b/i,
  /security|secret|environment variable|server-side|do not expose|permissions|scope/i,
  /install|setup|quickstart|prerequisite/i
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

export function compactImplementationContext(markdown: string, maxChars: number): string {
  const lines = markdown.split(/\r?\n/);
  const selected: string[] = [];
  let signalHits = 0;

  let inFence = false;
  let keepFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const isFence = trimmed.startsWith("```");
    const isHeading = /^#{1,6}\s+/.test(trimmed);
    const relevant = isRelevantLine(line);

    if (isFence) {
      if (!inFence) {
        inFence = true;
        // Keep code fences when near relevant hints.
        const prev = lines[i - 1] || "";
        const next = lines[i + 1] || "";
        keepFence = relevant || isRelevantLine(prev) || isRelevantLine(next);
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

  const compacted = normalizeLines(selected).join("\n").trim();
  const fallback = markdown.slice(0, maxChars).trim();

  if (signalHits < 4 && compacted.length < Math.min(1200, maxChars / 4)) {
    return fallback;
  }

  return compacted.length > maxChars
    ? `${compacted.slice(0, maxChars)}\n\n[Compacted content clipped to maxChars=${maxChars}]`
    : compacted;
}
