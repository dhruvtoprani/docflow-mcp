import { extractDocsContext } from "./extractDocsContext.js";
import { markdownToPlainText } from "./markdownToPlainText.js";
import type {
  ClipDocsPageInput,
  ClipDocsPageOutput,
  ClipOutputMode
} from "../types/docflow.js";

const DEFAULT_GOAL = "Extract implementation-ready context for AI coding assistants.";

function selectMode(mode: ClipOutputMode | undefined): ClipOutputMode {
  return mode ?? "clipper_context";
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

export async function clipDocsPage(input: ClipDocsPageInput): Promise<ClipDocsPageOutput> {
  const goal = input.goal?.trim() || DEFAULT_GOAL;
  const mode = selectMode(input.mode);

  const extracted = await extractDocsContext({
    url: input.url,
    goal,
    stack: input.stack,
    maxChars: input.maxChars
  });

  const clipperContext = extracted.contextPackMarkdown;
  const markdown = extracted.cleanedImplementationMarkdown;
  const plainText = markdownToPlainText(markdown);

  const copyReadyText = pickCopyReadyText({
    mode,
    clipperContext,
    markdown,
    plainText
  });

  return {
    mode,
    copyReadyText,
    page: {
      title: extracted.title,
      sourceUrl: extracted.sourceUrl,
      goal,
      stack: extracted.stack,
      warnings: extracted.warnings,
      detectedSections: extracted.detectedSections
    },
    formats: {
      clipperContext,
      markdown,
      plainText
    },
    stats: {
      rawHtmlChars: extracted.stats.rawHtmlChars,
      cleanedTextChars: extracted.stats.cleanedTextChars,
      contextPackChars: extracted.stats.contextPackChars,
      copyReadyChars: copyReadyText.length,
      estimatedReductionPercent: extracted.stats.estimatedReductionPercent
    }
  };
}
