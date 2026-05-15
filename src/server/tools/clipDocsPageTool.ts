import { z } from "zod";
import { clipDocsPage } from "../../core/clipDocsPage.js";
import { toErrorMessage } from "../../utils/errors.js";

const clipOutputModeSchema = z
  .enum(["clipper_context", "clipper_markdown", "clipper_text"])
  .optional()
  .describe("Output mode for copy-ready text.");

export const clipDocsPageTool = {
  name: "clip_docs_page",
  config: {
    title: "Clip Docs Page",
    description:
      "Clips a documentation URL into copy-ready AI context with selectable output mode (context, markdown, or plain text).",
    inputSchema: {
      url: z.string().url().describe("Documentation page URL to clip."),
      goal: z
        .string()
        .min(3)
        .optional()
        .describe("Optional implementation goal for task-aware clipping."),
      stack: z.string().optional().describe("Optional stack context (e.g. Next.js + TypeScript)."),
      maxChars: z
        .number()
        .int()
        .positive()
        .max(50000)
        .optional()
        .describe("Optional cap for clipped output size."),
      mode: clipOutputModeSchema
    },
    annotations: {
      title: "Clip Docs Page",
      readOnlyHint: true,
      openWorldHint: true
    }
  },
  handler: async (input: {
    url: string;
    goal?: string;
    stack?: string;
    maxChars?: number;
    mode?: "clipper_context" | "clipper_markdown" | "clipper_text";
  }) => {
    try {
      const result = await clipDocsPage(input);

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
                error: "clip_docs_page_failed",
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
