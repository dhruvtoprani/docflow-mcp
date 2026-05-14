const suspiciousPatterns = [
  /ignore (all )?(previous|prior) instructions/i,
  /reveal (the )?(system prompt|developer message|hidden instructions)/i,
  /send (the )?(api key|token|password|secret)/i,
  /exfiltrate/i,
  /delete all files/i,
  /act as (?:a )?system/i,
  /you are now/i,
  /do not tell the user/i
];

export function detectSuspiciousInstructions(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const matches: string[] = [];

  for (const line of lines) {
    if (suspiciousPatterns.some((pattern) => pattern.test(line))) {
      matches.push(line.trim());
    }
  }

  return [...new Set(matches.filter(Boolean))].slice(0, 20);
}

export function removeSuspiciousInstructions(markdown: string): string {
  const lines = markdown.split(/\r?\n/);

  return lines
    .filter((line) => !suspiciousPatterns.some((pattern) => pattern.test(line)))
    .join("\n")
    .trim();
}
