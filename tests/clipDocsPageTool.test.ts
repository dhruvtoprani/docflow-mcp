import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClipDocsPage = vi.fn();

vi.mock("../src/core/clipDocsPage.js", () => ({
  clipDocsPage: mockClipDocsPage
}));

describe("clipDocsPageTool", () => {
  beforeEach(() => {
    mockClipDocsPage.mockReset();
  });

  it("returns serialized clip output on success", async () => {
    const { clipDocsPageTool } = await import("../src/server/tools/clipDocsPageTool.js");

    mockClipDocsPage.mockResolvedValue({
      mode: "clipper_context",
      copyReadyText: "hello",
      page: {
        title: "Doc",
        sourceUrl: "https://docs.example.com",
        goal: "implement",
        warnings: [],
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
        }
      },
      formats: {
        clipperContext: "ctx",
        markdown: "md",
        plainText: "txt"
      },
      stats: {
        rawHtmlChars: 100,
        cleanedTextChars: 80,
        contextPackChars: 70,
        copyReadyChars: 70,
        estimatedReductionPercent: 30
      }
    });

    const result = await clipDocsPageTool.handler({
      url: "https://docs.example.com"
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.text).toContain('"mode": "clipper_context"');
  });

  it("returns isError=true payload on failure", async () => {
    const { clipDocsPageTool } = await import("../src/server/tools/clipDocsPageTool.js");

    mockClipDocsPage.mockRejectedValue(new Error("fail"));

    const result = await clipDocsPageTool.handler({
      url: "https://docs.example.com"
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("clip_docs_page_failed");
  });
});
