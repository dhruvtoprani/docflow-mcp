import { describe, expect, it } from "vitest";
import { generateContextPack } from "../src/core/generateContextPack.js";

describe("generateContextPack", () => {
  it("adds goal-specific missing anchor warnings for pagination goals", () => {
    const result = generateContextPack({
      title: "Example API",
      sourceUrl: "https://example.com/docs",
      goal: "Implement cursor pagination for list APIs",
      markdown: "Use GET /v1/items.\nAuthorization: Bearer TOKEN",
      detectedSections: {
        installation: true,
        authentication: true,
        endpoint: true,
        parameters: false,
        requestExample: false,
        responseExample: false,
        errors: false,
        rateLimits: false,
        security: true
      },
      suspiciousInstructions: [],
      maxChars: 4000
    });

    expect(result.warnings.some((warning) => warning.includes("Goal-critical detail appears missing"))).toBe(
      true
    );
    expect(result.contextPackMarkdown).toContain("## Goal-Specific Implementation Checklist");
  });

  it("surfaces critical anchors section with headers and env vars", () => {
    const result = generateContextPack({
      title: "Auth Docs",
      sourceUrl: "https://example.com/auth",
      goal: "Implement authenticated requests in Node backend",
      markdown: [
        "POST /v1/search",
        "Authorization: Bearer TOKEN",
        "Notion-Version: 2022-06-28",
        "const token = process.env.NOTION_TOKEN"
      ].join("\n"),
      detectedSections: {
        installation: false,
        authentication: true,
        endpoint: true,
        parameters: true,
        requestExample: true,
        responseExample: true,
        errors: true,
        rateLimits: false,
        security: true
      },
      suspiciousInstructions: [],
      maxChars: 4000
    });

    expect(result.contextPackMarkdown).toContain("## Critical Anchors Found");
    expect(result.contextPackMarkdown).toContain("Authorization: Bearer TOKEN");
    expect(result.contextPackMarkdown).toContain("process.env.NOTION_TOKEN");
  });
});
