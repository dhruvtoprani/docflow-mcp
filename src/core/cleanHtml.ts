import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export function cleanHtml(
  html: string,
  url: string
): {
  title: string;
  contentHtml: string;
  textContent: string;
} {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  const selectorsToRemove = [
    "script",
    "style",
    "noscript",
    "iframe",
    "nav",
    "footer",
    "aside",
    "[aria-label='breadcrumb']",
    "[class*='cookie']",
    "[id*='cookie']",
    "[class*='newsletter']",
    "[id*='newsletter']",
    "[class*='ad-']",
    "[id*='ad-']"
  ];

  for (const selector of selectorsToRemove) {
    document.querySelectorAll(selector).forEach((el) => el.remove());
  }

  const reader = new Readability(document);
  const article = reader.parse();

  if (!article) {
    return {
      title: document.title || "Untitled documentation page",
      contentHtml: document.body?.innerHTML || "",
      textContent: document.body?.textContent || ""
    };
  }

  return {
    title: article.title || document.title || "Untitled documentation page",
    contentHtml: article.content || "",
    textContent: article.textContent || ""
  };
}
