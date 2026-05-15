import { z } from "zod";
import { synthesizeDocsPages } from "../../core/synthesizeDocsPages.js";
import { toErrorMessage } from "../../utils/errors.js";

const clipOutputModeSchema = z
  .enum(["clipper_context", "clipper_markdown", "clipper_text"])
  .optional()
  .describe("Output mode for copy-ready text.");

export const synthesizeDocsPagesTool = {
  name: "synthesize_docs_pages",
  config: {
    title: "Synthesize Docs Pages",
    description:
      "Synthesizes multiple documentation pages into one copy-ready context output for AI coding assistants.",
    inputSchema: {
      urls: z
        .array(z.string().url())
        .min(1)
        .max(10)
        .describe("One or more documentation URLs to synthesize."),
      goal: z
        .string()
        .min(3)
        .optional()
        .describe("Optional implementation goal for task-aware synthesis."),
      stack: z.string().optional().describe("Optional stack context (e.g. Next.js + TypeScript)."),
      maxChars: z
        .number()
        .int()
        .positive()
        .max(80000)
        .optional()
        .describe("Optional cap for synthesized output size."),
      mode: clipOutputModeSchema
    },
    annotations: {
      title: "Synthesize Docs Pages",
      readOnlyHint: true,
      openWorldHint: true
    }
  },
  handler: async (input: {
    urls: string[];
    goal?: string;
    stack?: string;
    maxChars?: number;
    mode?: "clipper_context" | "clipper_markdown" | "clipper_text";
  }) => {
    try {
      const result = await synthesizeDocsPages(input);

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
                error: "synthesize_docs_pages_failed",
                message: toErrorMessage(error),
                input
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
