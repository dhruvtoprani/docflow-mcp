import TurndownService from "turndown";

export function htmlToMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-"
  });

  turndown.addRule("preservePreCode", {
    filter: ["pre"],
    replacement: (_content, node) => {
      const text = node.textContent || "";
      return `\n\n\`\`\`\n${text.trim()}\n\`\`\`\n\n`;
    }
  });

  return turndown.turndown(html).trim();
}
