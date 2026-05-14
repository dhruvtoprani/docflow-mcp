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
});
