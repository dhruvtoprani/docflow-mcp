import { describe, expect, it } from "vitest";
import { compactImplementationContext } from "../src/core/compactImplementationContext.js";

describe("compactImplementationContext", () => {
  it("keeps implementation-relevant lines and trims noise", () => {
    const markdown = [
      "Welcome to docs portal",
      "Marketing copy and announcements",
      "## Authentication",
      "Use Authorization: Bearer YOUR_TOKEN",
      "## Endpoint",
      "POST /emails",
      "\n",
      "Long unrelated section about product history",
      "Founded in 2019",
      "```bash",
      "curl -X POST /emails",
      "```"
    ].join("\n");

    const result = compactImplementationContext(markdown, 500);

    expect(result).toContain("Authorization: Bearer");
    expect(result).toContain("POST /emails");
    expect(result).toContain("curl -X POST /emails");
    expect(result).not.toContain("Founded in 2019");
  });

  it("preserves critical API anchors like versioned paths and required headers", () => {
    const markdown = [
      "Some intro text",
      "The request goes to /v1/search and returns paginated results.",
      "Use header Notion-Version: 2022-06-28.",
      "Use start_cursor for pagination.",
      "### Extra",
      "Some unrelated content."
    ].join("\n");

    const result = compactImplementationContext(markdown, 500);

    expect(result).toContain("## Critical API Anchors");
    expect(result).toContain("/v1/search");
    expect(result).toContain("Notion-Version");
    expect(result).toContain("start_cursor");
  });
});
