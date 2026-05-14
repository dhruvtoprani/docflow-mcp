import { cleanHtml } from "./cleanHtml.js";
import { compactImplementationContext } from "./compactImplementationContext.js";
import { detectDocSections } from "./detectDocSections.js";
import { estimateReductionPercent } from "./estimateTokenSavings.js";
import { fetchPage } from "./fetchPage.js";
import { generateContextPack } from "./generateContextPack.js";
import { htmlToMarkdown } from "./htmlToMarkdown.js";
import {
  detectSuspiciousInstructions,
  removeSuspiciousInstructions
} from "./sanitizePromptInjection.js";
import type { ExtractDocsContextInput, ExtractDocsContextOutput } from "../types/docflow.js";

function suggestBudget(goal: string, requestedMaxChars = 12000): number {
  const text = goal.toLowerCase();
  const profileBudget = /pagination|cursor|webhook|signature|hmac/.test(text) ? 8500 : 7500;
  return Math.min(requestedMaxChars, profileBudget);
}

export async function extractDocsContext(
  input: ExtractDocsContextInput
): Promise<ExtractDocsContextOutput> {
  const fetched = await fetchPage(input.url);
  const cleaned = cleanHtml(fetched.html, fetched.url);
  const markdown = htmlToMarkdown(cleaned.contentHtml);
  const budget = suggestBudget(input.goal, input.maxChars ?? 12000);

  const suspiciousInstructions = detectSuspiciousInstructions(markdown);
  const sanitizedMarkdown = removeSuspiciousInstructions(markdown);
  const compactedMarkdown = compactImplementationContext(
    sanitizedMarkdown,
    budget,
    input.goal
  );
  const detectedSections = detectDocSections(compactedMarkdown);

  const { contextPackMarkdown, warnings } = generateContextPack({
    title: cleaned.title,
    sourceUrl: fetched.url,
    goal: input.goal,
    stack: input.stack,
    markdown: compactedMarkdown,
    detectedSections,
    suspiciousInstructions,
    maxChars: budget
  });

  return {
    title: cleaned.title,
    sourceUrl: fetched.url,
    goal: input.goal,
    stack: input.stack,
    contextPackMarkdown,
    rawCleanMarkdownPreview: compactedMarkdown.slice(0, 2000),
    detectedSections,
    warnings,
    suspiciousInstructions,
    stats: {
      rawHtmlChars: fetched.html.length,
      cleanedTextChars: compactedMarkdown.length,
      contextPackChars: contextPackMarkdown.length,
      estimatedReductionPercent: estimateReductionPercent(
        fetched.html.length,
        contextPackMarkdown.length
      )
    }
  };
}
