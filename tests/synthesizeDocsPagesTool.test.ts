import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSynthesizeDocsPages = vi.fn();

vi.mock("../src/core/synthesizeDocsPages.js", () => ({
  synthesizeDocsPages: mockSynthesizeDocsPages
}));

describe("synthesizeDocsPagesTool", () => {
  beforeEach(() => {
    mockSynthesizeDocsPages.mockReset();
  });

  it("returns serialized synthesis output on success", async () => {
    const { synthesizeDocsPagesTool } = await import(
      "../src/server/tools/synthesizeDocsPagesTool.js"
    );

    mockSynthesizeDocsPages.mockResolvedValue({
      mode: "clipper_context",
      copyReadyText: "multi",
      goal: "build",
      pages: [],
      stats: {
        pageCount: 2,
        totalRawHtmlChars: 2000,
        totalContextPackChars: 800,
        totalCopyReadyChars: 700,
        averageReductionPercent: 60
      }
    });

    const result = await synthesizeDocsPagesTool.handler({
      urls: ["https://docs.example.com/a", "https://docs.example.com/b"]
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.text).toContain('"pageCount": 2');
  });

  it("returns isError=true payload on failure", async () => {
    const { synthesizeDocsPagesTool } = await import(
      "../src/server/tools/synthesizeDocsPagesTool.js"
    );

    mockSynthesizeDocsPages.mockRejectedValue(new Error("fail"));

    const result = await synthesizeDocsPagesTool.handler({
      urls: ["https://docs.example.com/a"]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("synthesize_docs_pages_failed");
  });
});
