import { describe, expect, it } from "vitest";
import { generateContextPack } from "../src/core/generateContextPack.js";

describe("generateContextPack", () => {
  it("includes goal, source URL, warnings, and cleaned context", () => {
    const result = generateContextPack({
      title: "Send Email API",
      sourceUrl: "https://docs.example.com/send-email",
      goal: "Send email from backend",
      stack: "Next.js + TypeScript",
      markdown: "POST /emails\nAuthorization: Bearer",
      detectedSections: {
        installation: false,
        authentication: true,
        endpoint: true,
        parameters: false,
        requestExample: false,
        responseExample: false,
        errors: false,
        rateLimits: false,
        security: false
      },
      suspiciousInstructions: []
    });

    expect(result.contextPackMarkdown).toContain("## Goal");
    expect(result.contextPackMarkdown).toContain("Send email from backend");
    expect(result.contextPackMarkdown).toContain("https://docs.example.com/send-email");
    expect(result.contextPackMarkdown).toContain("## Task Signals");
    expect(result.contextPackMarkdown).toContain("## Documentation Excerpts");
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});
