import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExtractDocsContext = vi.fn();

vi.mock("../src/core/extractDocsContext.js", () => ({
  extractDocsContext: mockExtractDocsContext
}));

describe("extractDocsContextTool", () => {
  beforeEach(() => {
    mockExtractDocsContext.mockReset();
  });

  it("returns text content with serialized result on success", async () => {
    const { extractDocsContextTool } =
      await import("../src/server/tools/extractDocsContextTool.js");

    mockExtractDocsContext.mockResolvedValue({
      title: "Doc title",
      sourceUrl: "https://docs.example.com",
      goal: "Build something",
      stack: "Node.js",
      contextPackMarkdown: "# DocFlow Context Pack",
      rawCleanMarkdownPreview: "Preview",
      detectedSections: {
        installation: true,
        authentication: true,
        endpoint: true,
        parameters: true,
        requestExample: true,
        responseExample: true,
        errors: true,
        rateLimits: true,
        security: true
      },
      warnings: [],
      suspiciousInstructions: [],
      stats: {
        rawHtmlChars: 1000,
        cleanedTextChars: 800,
        contextPackChars: 500,
        estimatedReductionPercent: 50
      }
    });

    const result = await extractDocsContextTool.handler({
      url: "https://docs.example.com",
      goal: "Build something"
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain('"title": "Doc title"');
  });

  it("returns isError=true payload with message on failure", async () => {
    const { extractDocsContextTool } =
      await import("../src/server/tools/extractDocsContextTool.js");

    mockExtractDocsContext.mockRejectedValue(new Error("Network timeout"));

    const result = await extractDocsContextTool.handler({
      url: "https://docs.example.com",
      goal: "Build something"
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain("extract_docs_context_failed");
    expect(result.content[0]?.text).toContain("Network timeout");
  });

  it("declares read-only/open-world tool annotations", async () => {
    const { extractDocsContextTool } =
      await import("../src/server/tools/extractDocsContextTool.js");

    expect(extractDocsContextTool.config.annotations?.readOnlyHint).toBe(true);
    expect(extractDocsContextTool.config.annotations?.openWorldHint).toBe(true);
    expect(extractDocsContextTool.config.inputSchema.url).toBeDefined();
  });
});
