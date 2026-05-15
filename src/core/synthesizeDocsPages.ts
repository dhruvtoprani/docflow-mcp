import { extractDocsContext } from "./extractDocsContext.js";
import { markdownToPlainText } from "./markdownToPlainText.js";
import type {
  ClipOutputMode,
  SynthesizeDocsPagesInput,
  SynthesizeDocsPagesOutput
} from "../types/docflow.js";

const DEFAULT_GOAL = "Extract implementation-ready context for AI coding assistants.";

function selectMode(mode: ClipOutputMode | undefined): ClipOutputMode {
  return mode ?? "clipper_context";
}

function perPageBudget(maxChars: number, pageCount: number): number {
  if (pageCount <= 1) {
    return maxChars;
  }
  return Math.max(2200, Math.floor(maxChars / pageCount));
}

function buildContextOutput(args: {
  goal: string;
  stack?: string;
  pages: Array<{ title: string; sourceUrl: string; contextPackMarkdown: string }>;
}): string {
  const header = [
    "# DocFlow Clipper Synthesis",
    "",
    `Goal: ${args.goal}`,
    args.stack ? `Stack: ${args.stack}` : "",
    ""
  ]
    .filter(Boolean)
    .join("\n");

  const body = args.pages
    .map(
      (page, index) =>
        `## Page ${index + 1}: ${page.title}\nSource: ${page.sourceUrl}\n\n${page.contextPackMarkdown}`
    )
    .join("\n\n---\n\n");

  return `${header}${body}`.trim();
}

function buildMarkdownOutput(pages: Array<{ title: string; sourceUrl: string; markdown: string }>): string {
  return pages
    .map(
      (page, index) =>
        `## Page ${index + 1}: ${page.title}\nSource: ${page.sourceUrl}\n\n${page.markdown}`
    )
    .join("\n\n---\n\n")
    .trim();
}

function pickCopyReadyText(args: {
  mode: ClipOutputMode;
  clipperContext: string;
  markdown: string;
  plainText: string;
}): string {
  if (args.mode === "clipper_markdown") {
    return args.markdown;
  }
  if (args.mode === "clipper_text") {
    return args.plainText;
  }
  return args.clipperContext;
}

export async function synthesizeDocsPages(
  input: SynthesizeDocsPagesInput
): Promise<SynthesizeDocsPagesOutput> {
  if (!Array.isArray(input.urls) || input.urls.length === 0) {
    throw new Error("Provide at least one URL in urls.");
  }

  const uniqueUrls = Array.from(
    new Set(input.urls.map((item) => item.trim()).filter((item) => item.length > 0))
  );

  if (uniqueUrls.length === 0) {
    throw new Error("No valid URLs found in urls.");
  }

  const goal = input.goal?.trim() || DEFAULT_GOAL;
  const mode = selectMode(input.mode);
  const maxChars = input.maxChars ?? 14000;
  const pageMaxChars = perPageBudget(maxChars, uniqueUrls.length);

  const extractedPages = await Promise.all(
    uniqueUrls.map((url) =>
      extractDocsContext({
        url,
        goal,
        stack: input.stack,
        maxChars: pageMaxChars
      })
    )
  );

  const clipperContext = buildContextOutput({
    goal,
    stack: input.stack,
    pages: extractedPages.map((item) => ({
      title: item.title,
      sourceUrl: item.sourceUrl,
      contextPackMarkdown: item.contextPackMarkdown
    }))
  });

  const markdown = buildMarkdownOutput(
    extractedPages.map((item) => ({
      title: item.title,
      sourceUrl: item.sourceUrl,
      markdown: item.cleanedImplementationMarkdown
    }))
  );

  const plainText = markdownToPlainText(markdown);
  const copyReadyText = pickCopyReadyText({
    mode,
    clipperContext,
    markdown,
    plainText
  });

  const totalRawHtmlChars = extractedPages.reduce((sum, item) => sum + item.stats.rawHtmlChars, 0);
  const totalContextPackChars = extractedPages.reduce(
    (sum, item) => sum + item.stats.contextPackChars,
    0
  );
  const averageReductionPercent =
    extractedPages.reduce((sum, item) => sum + item.stats.estimatedReductionPercent, 0) /
    extractedPages.length;

  return {
    mode,
    copyReadyText,
    goal,
    stack: input.stack,
    pages: extractedPages.map((item) => ({
      title: item.title,
      sourceUrl: item.sourceUrl,
      warnings: item.warnings,
      contextPackChars: item.stats.contextPackChars,
      cleanedChars: item.stats.cleanedTextChars,
      estimatedReductionPercent: item.stats.estimatedReductionPercent
    })),
    stats: {
      pageCount: extractedPages.length,
      totalRawHtmlChars,
      totalContextPackChars,
      totalCopyReadyChars: copyReadyText.length,
      averageReductionPercent
    }
  };
}
