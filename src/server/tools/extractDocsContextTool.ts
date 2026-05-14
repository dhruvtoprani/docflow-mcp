import { z } from "zod";
import { extractDocsContext } from "../../core/extractDocsContext.js";
import { toErrorMessage } from "../../utils/errors.js";

export const extractDocsContextTool = {
  name: "extract_docs_context",
  config: {
    title: "Extract Docs Context",
    description:
      "Extracts useful implementation context from an API documentation URL and returns a compact markdown context pack for AI coding assistants.",
    inputSchema: {
      url: z.string().url().describe("Documentation page URL."),
      goal: z.string().min(3).describe("What the user wants to implement."),
      stack: z.string().optional().describe("Optional stack context (e.g. Next.js + TypeScript)."),
      maxChars: z
        .number()
        .int()
        .positive()
        .max(50000)
        .optional()
        .describe("Optional cap for cleaned markdown characters.")
    },
    annotations: {
      title: "Extract Docs Context",
      readOnlyHint: true,
      openWorldHint: true
    }
  },
  handler: async (input: { url: string; goal: string; stack?: string; maxChars?: number }) => {
    try {
      const result = await extractDocsContext(input);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: "extract_docs_context_failed",
                message: toErrorMessage(error),
                input: {
                  url: input.url,
                  goal: input.goal,
                  stack: input.stack,
                  maxChars: input.maxChars
                }
              },
              null,
              2
            )
          }
        ]
      };
    }
  }
};
